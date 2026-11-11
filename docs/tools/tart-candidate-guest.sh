#!/bin/bash
set -euo pipefail
umask 077

inputs='/Volumes/My Shared Files/dsh-inputs'
source_commit=$1
archive_sha=$2
sw_vers
[[ "$(uname -m)" == arm64 ]]
printf 'guestArch=%s\n' "$(uname -m)"
for ((attempt=0; attempt<30; attempt++)); do
  console_user="$(stat -f %Su /dev/console)"
  if [[ "$console_user" != root && "$console_user" != loginwindow ]] &&
     launchctl print "gui/$(id -u "$console_user")" >/dev/null 2>&1; then break; fi
  sleep 2
done
launchctl print "gui/$(id -u "$console_user")" >/dev/null
[[ "$(id -u)" == "$(id -u "$console_user")" ]]
printf 'guestGuiSession=ready sameConsoleUid=yes\n'
(cd "$inputs"; shasum -a 256 -c SHA256SUMS; shasum -a 256 -c node-sha256.txt; shasum -a 256 -c electron-sha256.txt)

work="$(mktemp -d /private/tmp/coopanion-candidate.XXXXXX)"
trap 'rm -rf -- "$work"' EXIT
mkdir -p "$work/node" "$work/electron" "$work/browser" "$work/home"
git -c advice.detachedHead=false clone --quiet "$inputs/source.bundle" "$work/dsh-coopanion"
cd "$work/dsh-coopanion"
[[ "$(git rev-parse HEAD)" == "$source_commit" && -z "$(git status --porcelain)" ]]
node_asset="node-v$(cat .node-version)-darwin-arm64.tar.gz"
tar -xzf "$inputs/$node_asset" --strip-components 1 -C "$work/node"
export PATH="$work/node/bin:$PATH"
export HOME="$work/home"

node - "$inputs" <<'JS'
const { closeSync, openSync, unlinkSync } = require('node:fs');
const path = process.argv[2] + '/.tart-write-probe';
try {
  closeSync(openSync(path, 'wx'));
  unlinkSync(path);
  throw new Error('Input share is writable');
} catch (error) {
  if (!['EROFS', 'EPERM', 'EACCES'].includes(error.code)) throw error;
  console.log('inputShare=write-denied (' + error.code + ')');
}
JS

version="$(node -p 'require("./package.json").version')"
archive="$inputs/dsh-coopanion-$version.tgz"
node scripts/check-package.mjs "$archive" --report "$inputs/verification.json" \
  --expected-commit "$source_commit" --expected-version "$version"
tar -xzf "$inputs/dependencies.tar.gz" -C "$work"
host_version="$(node -p 'require("./tests/engineering-targets.json").admit.version')"
host_archive="$inputs/dsh-$host_version.tgz"
cmp <(tar -xOf "$host_archive" package/lib/bin.js) "$work/runtime/node_modules/@deepseek-ai/dsh/lib/bin.js"
node --input-type=module - "$inputs" "$work" "$archive" "$host_archive" "$source_commit" "$archive_sha" <<'JS'
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
const [inputs, work, archive, hostArchive, commit, sha256] = process.argv.slice(2);
const read = path => JSON.parse(readFileSync(path, 'utf8'));
const verification = read(inputs + '/verification.json');
const build = JSON.parse(execFileSync('tar', ['-xOf', archive, 'package/dist/build-info.json'], { encoding: 'utf8' }));
assert.equal(build.commit, commit);
assert.equal(build.dirty, false);
assert.equal(verification.sha256, sha256);
const target = read('tests/engineering-targets.json').admit;
const host = read(work + '/runtime/package-lock.json').packages['node_modules/@deepseek-ai/dsh'];
const installed = read(work + '/runtime/node_modules/@deepseek-ai/dsh/package.json');
const integrity = 'sha512-' + createHash('sha512').update(readFileSync(hostArchive)).digest('base64');
assert.equal(host.version, target.version);
assert.equal(installed.version, target.version);
assert.equal(host.integrity, target.integrity);
assert.equal(integrity, target.integrity);
console.log('guestCandidate=' + JSON.stringify(verification));
console.log('npmHost=' + JSON.stringify({ name: installed.name, version: installed.version, integrity }));
JS

electron_version="$(node -p 'require("./package.json").dependencies.electron')"
ditto -x -k "$inputs/electron-v$electron_version-darwin-arm64.zip" "$work/electron"
ln -s 'Electron.app/Contents/MacOS/Electron' "$work/electron/electron"
actual_electron="$("$work/electron/electron" --version)"
[[ "$actual_electron" == "v$electron_version" ]]
npm_cli="$work/toolchain/node_modules/npm/bin/npm-cli.js"
printf 'node=%s npm=%s electron=%s\n' "$(node --version)" "$(node "$npm_cli" --version)" "$actual_electron"
tar -xf "$inputs/chromium.tar" -C "$work/browser"
export PLAYWRIGHT_BROWSERS_PATH="$work/browser"
node --input-type=module <<'JS'
import { chromium } from 'playwright-core';
const browser = await chromium.launch({ executablePath: chromium.executablePath(), headless: true, args: ['--no-sandbox'] });
try { console.log('chromium=' + browser.version()); }
finally { await browser.close(); }
JS

export DSH_TEST_VERSION="$host_version" DSH_TEST_PACKAGE="$archive" DSH_TEST_PACKAGE_DIR="$inputs"
export DSH_TEST_RUNTIME="$work/runtime" DSH_TEST_PHASE_FILE="$work/phase.json"
export ELECTRON_OVERRIDE_DIST_PATH="$work/electron" ELECTRON_SKIP_BINARY_DOWNLOAD=1
export npm_config_cache="$work/npm-cache"
tar -xf "$inputs/pnpm.tar" -C "$work"
export pnpm_config_store_dir="$work/pnpm-store" pnpm_config_cache_dir="$work/pnpm-cache" pnpm_config_offline=true
printf 'productProbe=test:install\n'
result=0
node "$npm_cli" run test:install || result=$?
if [[ -f "$DSH_TEST_PHASE_FILE" ]]; then
  printf 'productPhases='; cat "$DSH_TEST_PHASE_FILE"
fi
[[ "$result" == 0 ]] || exit "$result"
node - "$inputs/verification.json" "$host_version" <<'JS'
const assert = require('node:assert/strict');
const [verificationPath, host] = process.argv.slice(2);
const verification = require(verificationPath);
const { dsh, sourceCommit, archiveSha256, plugin, installed, profileLoader, nativeWindow,
  closeAndRelaunch, cleanShutdown, riskExemption } = require(`./artifacts/install-${host}.json`);
assert.equal(dsh, host);
assert.equal(sourceCommit, verification.sourceCommit);
assert.equal(archiveSha256, verification.sha256);
assert.equal(plugin, `${verification.name}@${verification.version}`);
for (const assertion of [installed, profileLoader, nativeWindow, closeAndRelaunch, cleanShutdown]) {
  assert.equal(assertion, true);
}
assert.equal(riskExemption, false);
console.log('installEvidence=' + JSON.stringify({ dsh, sourceCommit, archiveSha256, plugin, installed,
  profileLoader, nativeWindow, closeAndRelaunch, cleanShutdown, riskExemption }));
JS
