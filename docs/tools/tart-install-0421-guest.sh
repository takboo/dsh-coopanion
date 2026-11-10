#!/bin/bash
set -euo pipefail
umask 077
inputs='/Volumes/My Shared Files/dsh-inputs'
source_commit=810789948475c42deb8333333510fa25b4e3ed7e
archive_sha=248f799f6baa218e2acac6bda5b0a95abf77a6dcc64340f6a83f865ad785cae3
host_sri='sha512-ijR9UEVYkG15Q/Q79JzvzLBzQOQfc63VLr9n6flpwHPhr5IKn2UxthnSoto/P9l7qGd7pPvI1Ra6TW7LH3oKpg=='

sw_vers
[[ "$(uname -m)" == arm64 ]]
printf 'guestArch=%s\n' "$(uname -m)"
for ((i=0; i<30; i++)); do
  console_user="$(stat -f %Su /dev/console)"
  if [[ "$console_user" != root && "$console_user" != loginwindow ]] &&
     launchctl print "gui/$(id -u "$console_user")" >/dev/null 2>&1; then break; fi
  sleep 2
done
launchctl print "gui/$(id -u "$console_user")" >/dev/null
printf 'guestGuiSession=ready sameConsoleUid=%s\n' "$([[ "$(id -u)" == "$(id -u "$console_user")" ]] && echo yes || echo no)"
[[ "$(id -u)" == "$(id -u "$console_user")" ]]
[[ -d "$inputs" ]]
/sbin/mount | awk 'index($0, "/Volumes/My Shared Files") {print "inputVolume=" $0}'
( cd "$inputs"; shasum -a 256 -c SHA256SUMS; shasum -a 256 -c node-sha256.txt; shasum -a 256 -c electron-sha256.txt )
[[ "$(shasum -a 256 "$inputs/dsh-coopanion-0.4.21.tgz" | awk '{print $1}')" == "$archive_sha" ]]
[[ "sha512-$(openssl dgst -sha512 -binary "$inputs/dsh-0.2.2-rc.1.tgz" | openssl base64 -A)" == "$host_sri" ]]
echo "dshNpmIntegrity=$host_sri"
git --version

work="$(mktemp -d /private/tmp/dsh-coopanion-tart.XXXXXX)"
trap 'rm -rf -- "$work"' EXIT
mkdir -p "$work/node" "$work/electron" "$work/browser"
tar -xzf "$inputs/node-v24.21.0-darwin-arm64.tar.gz" --strip-components 1 -C "$work/node"
export PATH="$work/node/bin:$PATH"
node - "$inputs" <<'JS'
const { closeSync, openSync, unlinkSync } = require('node:fs');
const path = process.argv[2] + '/.tart-write-probe';
try {
  closeSync(openSync(path, 'wx'));
  unlinkSync(path);
  throw new Error('Input share is writable');
} catch (error) {
  if (!['EROFS', 'EPERM'].includes(error.code)) throw error;
  console.log('inputShare=write-denied (' + error.code + ')');
}
JS
git -c advice.detachedHead=false clone --quiet --single-branch --branch v0.4.21 "$inputs/source.bundle" "$work/dsh-coopanion"
cd "$work/dsh-coopanion"
[[ "$(git rev-parse HEAD)" == "$source_commit" ]]
printf 'guestSource=%s\n' "$(git rev-parse HEAD)"
tar -xzf "$inputs/dependencies.tar.gz" -C "$work"
tar -xf "$inputs/playwright-macos-arm64.tar" -C "$work/browser"
ditto -x -k "$inputs/electron-v44.7.0-darwin-arm64.zip" "$work/electron"
ln -s 'Electron.app/Contents/MacOS/Electron' "$work/electron/electron"
npm_cli="$work/toolchain/node_modules/npm/bin/npm-cli.js"
electron_version="$("$work/electron/electron" --version)"
[[ "$electron_version" == v44.7.0 ]]
printf 'node=%s\nnpm=%s\nelectron=%s\n' "$(node --version)" "$(node "$npm_cli" --version)" "$electron_version"
cmp <(tar -xOf "$inputs/dsh-0.2.2-rc.1.tgz" package/lib/bin.js) "$work/runtime/node_modules/@deepseek-ai/dsh/lib/bin.js"
node --input-type=module - "$inputs" "$work" "$host_sri" "$source_commit" "$archive_sha" <<'JS'
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
const [inputs, work, integrity, commit, sha256] = process.argv.slice(2);
const read = path => JSON.parse(readFileSync(path, 'utf8'));
const host = read(work + '/runtime/package-lock.json').packages['node_modules/@deepseek-ai/dsh'];
assert.equal(host.version, '0.2.2-rc.1');
assert.equal(host.integrity, integrity);
const evidence = read(inputs + '/verification.json');
assert.equal(evidence.version, '0.4.21');
assert.equal(evidence.sourceCommit, commit);
assert.equal(evidence.sha256, sha256);
const build = JSON.parse(execFileSync('tar', ['-xOf', inputs + '/dsh-coopanion-0.4.21.tgz', 'package/dist/build-info.json'], { encoding: 'utf8' }));
assert.equal(build.commit, commit);
assert.equal(build.dirty, false);
console.log(JSON.stringify({ guestPackage: evidence.version, sourceCommit: commit, archiveSha256: sha256, npmHost: host.version }));
JS

export DSH_TEST_VERSION=0.2.2-rc.1 DSH_TEST_PACKAGE_DIR="$inputs"
export DSH_TEST_RUNTIME="$work/runtime" DSH_TEST_PHASE_FILE="$work/phase.json"
export PLAYWRIGHT_BROWSERS_PATH="$work/browser" ELECTRON_OVERRIDE_DIST_PATH="$work/electron"
export ELECTRON_SKIP_BINARY_DOWNLOAD=1 npm_config_cache="$work/npm-cache"
tar -xf "$inputs/pnpm.tar" -C "$work"
export pnpm_config_store_dir="$work/pnpm-store" pnpm_config_cache_dir="$work/pnpm-cache" pnpm_config_offline=true
printf 'productProbe=test:install\n'
result=0
node "$npm_cli" run test:install || result=$?
if [[ -f "$DSH_TEST_PHASE_FILE" ]]; then
  printf 'productPhases='; cat "$DSH_TEST_PHASE_FILE"
fi
[[ "$result" == 0 ]] || exit "$result"
node - "$source_commit" "$archive_sha" <<'JS'
const assert = require('node:assert/strict');
const { dsh, sourceCommit, archiveSha256, plugin, installed, profileLoader, nativeWindow,
  closeAndRelaunch, cleanShutdown, riskExemption } = require('./artifacts/install-0.2.2-rc.1.json');
assert.equal(dsh, '0.2.2-rc.1');
assert.equal(sourceCommit, process.argv[2]);
assert.equal(archiveSha256, process.argv[3]);
assert.equal(plugin, '@takboo/dsh-coopanion@0.4.21');
for (const assertion of [installed, profileLoader, nativeWindow, closeAndRelaunch, cleanShutdown]) {
  assert.equal(assertion, true);
}
assert.equal(riskExemption, false);
console.log('installEvidence=' + JSON.stringify({ dsh, sourceCommit, archiveSha256, plugin, installed,
  profileLoader, nativeWindow, closeAndRelaunch, cleanShutdown, riskExemption }));
JS
