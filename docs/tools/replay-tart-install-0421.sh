#!/bin/bash
set -euo pipefail
umask 077

if [[ $# -ne 1 || "$(uname -sm)" != 'Darwin arm64' ]]; then
  echo 'Usage on Apple Silicon: bash docs/tools/replay-tart-install-0421.sh <engineering-checkout>' >&2
  exit 2
fi

tools="$(cd "$(dirname "$0")" && pwd -P)"
project="$(cd "$tools/../.." && pwd -P)"
base="$(cd "$1" && pwd -P)"
pin=56bcd3c0b122c3281b1090f45673ddde2d538481
tag=v0.4.21
host_version=0.2.2-rc.1
archive="dsh-coopanion-${tag#v}.tgz"
archive_sha=248f799f6baa218e2acac6bda5b0a95abf77a6dcc64340f6a83f865ad785cae3
source_commit=810789948475c42deb8333333510fa25b4e3ed7e

[[ "$(git -C "$base" rev-parse HEAD)" == "$pin" ]]
[[ "$(git -C "$project" rev-parse "$tag^{commit}")" == "$source_commit" ]]
scratch="$(mktemp -d /private/tmp/coopanion-tart-0421.XXXXXX)"
trap 'rm -rf -- "$scratch"' EXIT
inputs="$scratch/inputs"
work="$scratch/work"
source_dir="$work/dsh-coopanion"
mkdir -p "$inputs" "$source_dir" "$work/node" "$work/runtime" "$work/toolchain"
git -C "$base" show "$pin":scripts/run-tart.sh > "$scratch/pinned-run-tart.sh"
cmp "$scratch/pinned-run-tart.sh" "$base/scripts/run-tart.sh"
printf 'baseCommit=%s\n' "$pin"
shasum -a 256 < "$scratch/pinned-run-tart.sh"

gh release download "$tag" -R takboo/dsh-coopanion -D "$inputs" \
  -p "$archive" -p dsh-coopanion.tgz -p verification.json -p SHA256SUMS -p paper-star.zip -p release-notes.md
(cd "$inputs"; shasum -a 256 -c SHA256SUMS)
[[ "$(shasum -a 256 "$inputs/$archive" | awk '{print $1}')" == "$archive_sha" ]]
git -C "$project" bundle create "$inputs/source.bundle" "refs/tags/$tag"
git -C "$project" archive "$tag" | tar -xf - -C "$source_dir"

node_version="$(cat "$source_dir/.node-version")"
node_asset="node-v$node_version-darwin-arm64.tar.gz"
node_release="https://nodejs.org/dist/v$node_version"
curl -fsSL --retry 2 "$node_release/$node_asset" -o "$inputs/$node_asset"
curl -fsSL --retry 2 "$node_release/SHASUMS256.txt" -o "$work/node-sums"
awk -v asset="$node_asset" '$2 == asset' "$work/node-sums" > "$inputs/node-sha256.txt"
(cd "$inputs"; shasum -a 256 -c node-sha256.txt)
tar -xzf "$inputs/$node_asset" --strip-components 1 -C "$work/node"
export PATH="$work/node/bin:$PATH"
touch "$work/npm-user.rc" "$work/npm-global.rc"
export npm_config_userconfig="$work/npm-user.rc" npm_config_globalconfig="$work/npm-global.rc"
export npm_config_cache="$work/npm-cache" npm_config_registry=https://registry.npmjs.org
export ELECTRON_SKIP_BINARY_DOWNLOAD=1

npm_version="$(node -p 'require(process.argv[1]).packageManager.split("@")[1]' "$source_dir/package.json")"
npm install --prefix "$work/toolchain" --ignore-scripts --no-audit --no-fund "npm@$npm_version"
npm_cli="$work/toolchain/node_modules/npm/bin/npm-cli.js"
(cd "$source_dir"; node "$npm_cli" ci --ignore-scripts --no-audit --no-fund)
(cd "$work/runtime"; node "$npm_cli" install --ignore-scripts --no-audit --no-fund "@deepseek-ai/dsh@$host_version")
curl -fsSL --retry 2 "https://registry.npmjs.org/@deepseek-ai/dsh/-/dsh-$host_version.tgz" \
  -o "$inputs/dsh-$host_version.tgz"
node --input-type=module - "$source_dir" "$work/runtime" "$inputs/dsh-$host_version.tgz" <<'JS'
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
const [source, runtime, tarball] = process.argv.slice(2);
const target = JSON.parse(readFileSync(source + '/tests/engineering-targets.json')).admit;
const host = JSON.parse(readFileSync(runtime + '/package-lock.json')).packages['node_modules/@deepseek-ai/dsh'];
const integrity = 'sha512-' + createHash('sha512').update(readFileSync(tarball)).digest('base64');
assert.equal(host.version, target.version);
assert.equal(host.integrity, target.integrity);
assert.equal(integrity, target.integrity);
console.log('dshNpmIntegrity=' + integrity);
JS

electron_version="$(node -p 'require(process.argv[1]).dependencies.electron' "$source_dir/package.json")"
electron_asset="electron-v$electron_version-darwin-arm64.zip"
gh release download "v$electron_version" -R electron/electron -D "$work" -p "$electron_asset" -p SHASUMS256.txt
mv "$work/$electron_asset" "$inputs/"
awk -v asset="*$electron_asset" '$2 == asset' "$work/SHASUMS256.txt" > "$inputs/electron-sha256.txt"
(cd "$inputs"; shasum -a 256 -c electron-sha256.txt)
PLAYWRIGHT_BROWSERS_PATH="$work/browser" node "$source_dir/node_modules/playwright-core/cli.js" install chromium --no-shell
COPYFILE_DISABLE=1 tar -cf "$inputs/playwright-macos-arm64.tar" -C "$work/browser" chromium-1248

# Populate only the pnpm content store and metadata for the host-only guest.
# The guest runs the Loader again with its own empty profiles.
(
  cd "$source_dir"
  export PATH="$source_dir/node_modules/.bin:$PATH"
  export DSH_HOME="$work/staging-home" DSH_TELEMETRY_DISABLED=1
  export pnpm_config_store_dir="$work/pnpm-store" pnpm_config_cache_dir="$work/pnpm-cache"
  export pnpm_config_registry=https://registry.npmjs.org
  profile="$DSH_HOME/profiles/warm"
  mkdir -p "$profile"
  printf '%s\n' '{"private":true,"dependencies":{},"dsh":{"profile":{"bundles":["@deepseek-ai/dsh-base","@deepseek-ai/dsh-web-app"]}}}' > "$profile/package.json"
  printf '%s\n' 'packages:' '  - .' 'nodeLinker: hoisted' 'autoInstallPeers: false' > "$profile/pnpm-workspace.yaml"
  node "$work/runtime/node_modules/@deepseek-ai/dsh/lib/bin.js" plugin --profile warm add "$inputs/$archive"
)
COPYFILE_DISABLE=1 tar -cf "$inputs/pnpm.tar" -C "$work" pnpm-store pnpm-cache
COPYFILE_DISABLE=1 tar -czf "$inputs/dependencies.tar.gz" -C "$work" dsh-coopanion/node_modules runtime toolchain

cd "$base"
export TART_HOME="$base/.local/tart" DSH_TART_INPUTS="$inputs"
printf 'TART_HOME=%s\n' "$TART_HOME"
tart --version
tart list
set +e
bash scripts/run-tart.sh run "$tools/tart-install-0421-guest.sh" 2>&1 | tee "$scratch/guest.log"
result=${PIPESTATUS[0]}
set -e
printf 'runnerExit=%s\n' "$result"
guest="$(awk '/^Running dsh-job-/ {print $2; exit}' "$scratch/guest.log")"
tart list
if [[ -n "$guest" && -e "$TART_HOME/vms/$guest" ]]; then
  echo "Clone still present: $guest" >&2
  exit 1
fi
if [[ -e "$TART_HOME/desktop-job.lock" ]]; then
  echo 'Tart lab lock still present' >&2
  exit 1
fi
if [[ -n "$guest" ]]; then printf 'guestReclaimed=%s\n' "$guest"; fi
exit "$result"
