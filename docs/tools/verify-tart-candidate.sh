#!/bin/bash
set -euo pipefail
umask 077

usage() {
  echo 'Usage: bash docs/tools/verify-tart-candidate.sh [--checkout path] [--tart-home path] <new-result-directory | --doctor>'
}

checkout_source=config checkout_value= tart_set=no tart_home= output= doctor=no
if [[ -n "${DSH_ENGINEERING_CHECKOUT+x}" ]]; then
  checkout_source=environment checkout_value=$DSH_ENGINEERING_CHECKOUT
fi
while [[ $# -gt 0 ]]; do
  case "$1" in
    --checkout|--tart-home)
      [[ $# -ge 2 && "$2" != --* ]] || { echo "Supply a value for $1." >&2; exit 2; }
      if [[ "$1" == --checkout ]]; then
        checkout_source=argument checkout_value=$2
      else
        tart_set=yes tart_home=$2
      fi
      shift ;;
    --doctor) doctor=yes ;;
    --help) usage; exit 0 ;;
    -*) usage >&2; exit 2 ;;
    *) [[ -z "$output" ]] || { usage >&2; exit 2; }; output=$1 ;;
  esac
  shift
done
if [[ "$doctor" == yes && -n "$output" || "$doctor" == no && -z "$output" ]]; then usage >&2; exit 2; fi

tools="$(cd "$(dirname "$0")" && pwd -P)"
project="$(cd "$tools/../.." && pwd -P)"
lock="$project/dsh-engineering.lock.json"
command -v node >/dev/null || { echo 'Install Node.js to validate the project lock.' >&2; exit 2; }
resolved="$(node "$tools/tart-checkout.mjs" "$lock" "$checkout_source" "$checkout_value")"
read -r base_tag base_commit <<< "${resolved%%$'\n'*}"
checkout="${resolved#*$'\n'}"
scratch="$(mktemp -d /private/tmp/coopanion-tart-candidate.XXXXXX)"
trap 'rm -rf -- "$scratch"' EXIT
base="$scratch/engineering"
mkdir -p "$base/scripts"
for tool in lab.sh run-tart.sh; do
  git --no-replace-objects -C "$checkout" show "$base_commit:scripts/$tool" > "$base/scripts/$tool"
done
# shellcheck source=/dev/null
source "$base/scripts/lab.sh"
if [[ "$doctor" == yes ]]; then
  args=(--lock "$lock")
  if [[ "$checkout_source" == argument ]]; then args+=(--checkout "$checkout"); fi
  if [[ "$tart_set" == yes ]]; then args+=(--tart-home "$tart_home"); fi
  lab_doctor "${args[@]}"
  exit
fi
resolve_lab_path tart-home "$tart_set" "$tart_home" || { echo "$lab_error" >&2; exit 2; }
tart_home=$lab_path
status="$(bash "$base/scripts/run-tart.sh" --tart-home "$tart_home" status)"
[[ "$status" == *' ready=true busy=false' ]] || {
  printf '%s\n' "$status" >&2
  echo 'Prepare the pinned baseline in the selected storage or wait for the active lab job, then retry.' >&2
  exit 2
}
command -v tart >/dev/null || { echo 'Install Tart on this Apple Silicon host.' >&2; exit 2; }
command -v gh >/dev/null || { echo 'Install GitHub CLI to fetch the pinned Electron runtime.' >&2; exit 2; }

[[ -z "$(git -C "$project" status --porcelain)" ]] || { echo 'Commit project changes before building a candidate.' >&2; exit 2; }
mkdir -p -- "$(dirname "$output")"
mkdir -m 700 -- "$output"
output="$(cd "$output" && pwd -P)"
exec > >(tee "$output/tart.log") 2>&1
printf 'checkoutSource=%s tartHomeSource=%s\n' "$checkout_source" "$lab_source"
printf 'baseTag=%s baseCommit=%s\n' "$base_tag" "$base_commit"
(cd "$base"; shasum -a 256 scripts/lab.sh scripts/run-tart.sh)
printf '%s\n' "$status"
printf 'hostMacOS=%s hostBuild=%s hostArch=%s tart=%s\n' "$(sw_vers -productVersion)" "$(sw_vers -buildVersion)" "$(uname -m)" "$(tart --version)"

inputs="$scratch/inputs"
work="$scratch/work"
source_dir="$work/dsh-coopanion"
mkdir -p "$inputs" "$work/node" "$work/runtime" "$work/toolchain" "$work/home"
git --no-replace-objects -C "$project" bundle create "$inputs/source.bundle" HEAD
git -c advice.detachedHead=false clone --quiet "$inputs/source.bundle" "$source_dir"
cd "$source_dir"
source_commit="$(git rev-parse HEAD)"
node_version="$(cat .node-version)"
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

npm_version="$(node -p 'require("./package.json").packageManager.split("@")[1]')"
npm install --prefix "$work/toolchain" --ignore-scripts --no-audit --no-fund "npm@$npm_version"
npm_cli="$work/toolchain/node_modules/npm/bin/npm-cli.js"
node "$npm_cli" ci --ignore-scripts --no-audit --no-fund
node "$npm_cli" run build
version="$(node -p 'require("./package.json").version')"
packed="$(node "$npm_cli" pack --ignore-scripts --silent --pack-destination "$output")"
archive="dsh-coopanion-$version.tgz"
mv "$output/$packed" "$output/$archive"
node scripts/check-package.mjs "$output/$archive" --write-report --expected-commit "$source_commit"
node "$npm_cli" run character:pack -- examples/star "$output/paper-star.zip"
candidate_files=("$archive" verification.json release-notes.md paper-star.zip)
(cd "$output"; shasum -a 256 "${candidate_files[@]}" > SHA256SUMS; cp "${candidate_files[@]}" SHA256SUMS "$inputs/")
archive_sha="$(node -p 'require(process.argv[1]).sha256' "$inputs/verification.json")"

host_version="$(node -p 'require("./tests/engineering-targets.json").admit.version')"
node "$npm_cli" install --prefix "$work/runtime" --ignore-scripts --no-audit --no-fund "@deepseek-ai/dsh@$host_version"
curl -fsSL --retry 2 "https://registry.npmjs.org/@deepseek-ai/dsh/-/dsh-$host_version.tgz" \
  -o "$inputs/dsh-$host_version.tgz"

electron_version="$(node -p 'require("./package.json").dependencies.electron')"
electron_asset="electron-v$electron_version-darwin-arm64.zip"
gh release download "v$electron_version" -R electron/electron -D "$work" -p "$electron_asset" -p SHASUMS256.txt
mv "$work/$electron_asset" "$inputs/"
awk -v asset="*$electron_asset" '$2 == asset' "$work/SHASUMS256.txt" > "$inputs/electron-sha256.txt"
(cd "$inputs"; shasum -a 256 -c electron-sha256.txt)
PLAYWRIGHT_BROWSERS_PATH="$work/browser" node node_modules/playwright-core/cli.js install chromium --no-shell
COPYFILE_DISABLE=1 tar -cf "$inputs/chromium.tar" -C "$work/browser" .

# Seed only the content store and metadata. The guest installs into an empty profile.
(
  export HOME="$work/home" DSH_HOME="$work/staging-home" DSH_TELEMETRY_DISABLED=1
  export PATH="$source_dir/node_modules/.bin:$PATH"
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

set +e
DSH_TART_INPUTS="$inputs" bash "$base/scripts/run-tart.sh" --tart-home "$tart_home" \
  run "$source_dir/docs/tools/tart-candidate-guest.sh" "$source_commit" "$archive_sha" 2>&1 | tee "$scratch/guest.log"
result=("${PIPESTATUS[@]}")
set -e
printf 'runnerExit=%s\n' "${result[0]}"
guest="$(awk '/^Running dsh-job-/ {print $2; exit}' "$scratch/guest.log")"
if [[ -n "$guest" ]]; then
  grep -Fxq "guestReclaimed=$guest" "$scratch/guest.log" && [[ ! -e "$tart_home/vms/$guest" ]] || {
    echo "Could not verify guest reclamation for $guest. Inspect the lab before retrying." >&2
    exit 1
  }
fi
[[ "${result[0]}" == 0 ]] || exit "${result[0]}"
[[ "${result[1]}" == 0 && -n "$guest" ]] || { echo 'Missing Tart execution evidence.' >&2; exit 1; }
