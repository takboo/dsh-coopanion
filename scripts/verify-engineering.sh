#!/usr/bin/env bash
set -euo pipefail

if [[ $# -ne 3 ]]; then
  echo 'Usage: bash scripts/verify-engineering.sh <engineering-checkout> <candidate.tgz> <new-report-directory>' >&2
  exit 2
fi

root="$(cd "$(dirname "$0")/.." && pwd -P)"
engineering_commit=5fe3e92c64d4dfbbcfd3926fb52c347b10cc641e
targets="$root/tests/engineering-targets.json"
probe="$root/tests/engineering-web-probe.mjs"
report_dir=$3

if ! git -C "$root" diff --quiet HEAD -- tests/engineering-targets.json tests/engineering-web-probe.mjs; then
  echo 'Commit the host targets and Web probe before verification.' >&2
  exit 2
fi

scratch="$(mktemp -d)"
trap 'rm -rf -- "$scratch"' EXIT
base="$scratch/engineering"
candidate="$scratch/candidate.tgz"
mkdir "$base"
git -C "$1" archive "$engineering_commit" | tar -xf - -C "$base"
cp -- "$2" "$candidate"

source_commit="$(tar -xOf "$candidate" package/dist/build-info.json | node -e '
  const { schema, commit, dirty } = JSON.parse(require("node:fs").readFileSync(0, "utf8"));
  if (schema !== 1 || dirty !== false || !/^[0-9a-f]{40}$/.test(commit)) {
    throw new Error("Expected a candidate built from a clean, identified commit");
  }
  console.log(commit);
')"
if ! git -C "$root" merge-base --is-ancestor "$source_commit" HEAD; then
  echo 'The candidate source commit must be in this checkout history.' >&2
  exit 2
fi

mkdir -p -- "$(dirname "$report_dir")"
mkdir -m 700 -- "$report_dir"
report="$report_dir/host.json"
bash "$base/scripts/run-container.sh" all "$targets" "$probe" "$candidate" "$source_commit" "$report"

# Reuse the local image from the shared runner. The package lock controls the
# Playwright version for Coopanion's browser regression.
image_and_digest="$(node -e '
  const { image, provenance } = JSON.parse(require("node:fs").readFileSync(process.argv[1], "utf8"));
  const digest = provenance.inputs.tarballSha256;
  if (provenance.producer.commit !== process.argv[2] || provenance.inputs.sourceCommit !== process.argv[3]) {
    throw new Error("Report producer or candidate source commit does not match the verification inputs");
  }
  if (!/^sha256:[0-9a-f]{64}$/.test(image) || !/^[0-9a-f]{64}$/.test(digest)) {
    throw new Error("Expected a local image ID and candidate SHA-256");
  }
  console.log(image, digest);
' "$report" "$engineering_commit" "$source_commit")"
read -r image package_sha256 <<< "$image_and_digest"

docker run --rm --init -i --shm-size=1g --cap-drop=ALL --security-opt=no-new-privileges \
  --mount "type=bind,src=$candidate,dst=/input/candidate.tgz,readonly" \
  "$image" bash -s -- "$image" "$package_sha256" <<'CONTAINER' 2>&1 | tee "$report_dir/inbox-ui.log"
set -euo pipefail
printf 'Image: %s\nCandidate SHA-256: %s\n' "$1" "$2"
echo "$2  /input/candidate.tgz" | sha256sum --check --status
work="$(mktemp -d)"
cd "$work"
tar -xf /input/candidate.tgz
cd package
export PLAYWRIGHT_BROWSERS_PATH="$work/browsers"
npm ci --ignore-scripts --no-audit --no-fund
./node_modules/.bin/playwright-core install chromium
node --input-type=module <<'JS'
import { chromium } from 'playwright-core';
const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
try {
  console.log('Chromium:', browser.version());
} finally {
  await browser.close();
}
JS
npm run test:inbox-ui
CONTAINER
