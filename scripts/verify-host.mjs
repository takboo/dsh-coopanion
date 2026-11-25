#!/usr/bin/env node
import assert from 'node:assert/strict';
import { execFileSync, spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { chmodSync, createWriteStream, lstatSync, mkdirSync, readFileSync, realpathSync, renameSync, rmSync } from 'node:fs';
import { join, resolve, sep } from 'node:path';
import { isDeepStrictEqual } from 'node:util';

const OUT_DIR = 'artifacts/verify-host';
const CANDIDATE = join(OUT_DIR, 'candidate.tgz');
const HOST_REPORT = join(OUT_DIR, 'host.json');
const INBOX_LOG = join(OUT_DIR, 'inbox-ui.log');
const TARGETS = 'tests/engineering-targets.json';
const PROBE = 'tests/engineering-web-probe.mjs';
const ALLOW_DIRTY = process.env.DSH_VERIFY_ALLOW_DIRTY === '1';

const sha256 = (buf) => createHash('sha256').update(buf).digest('hex');
const readTarEntry = (archive, entry) => execFileSync('tar', ['-xOzf', archive, `package/${entry}`]);
const gitShow = (commit, rel) => execFileSync('git', ['--no-replace-objects', 'show', `${commit}:${rel}`]);

function resolveHead() {
  const head = execFileSync('git', ['--no-replace-objects', 'rev-parse', '--verify', 'HEAD'], { encoding: 'utf8' }).trim();
  assert.match(head, /^[0-9a-f]{40}$/, 'Expected a 40-hex HEAD commit');
  return head;
}

function assertContainedOutputDir() {
  const realRoot = realpathSync(process.cwd());
  const within = (p) => p === realRoot || p.startsWith(realRoot + sep);
  for (const rel of ['artifacts', OUT_DIR]) {
    const abs = resolve(realRoot, rel);
    const lst = lstatSync(abs, { throwIfNoEntry: false });
    if (!lst) continue;
    assert.ok(!lst.isSymbolicLink(), `Refusing symlink at output boundary: ${rel}`);
    assert.ok(lst.isDirectory(), `Expected directory at output boundary: ${rel}`);
    assert.ok(within(realpathSync(abs)), `Output path escapes repository root: ${rel}`);
  }
}

function verifyBuildInfo(bytes, head) {
  const info = JSON.parse(bytes.toString('utf8'));
  assert.equal(info.schema, 1, 'build-info.json schema must be 1');
  assert.equal(info.commit, head, 'build-info.json commit must match HEAD');
  assert.equal(typeof info.dirty, 'boolean', 'build-info.json dirty must be boolean');
  assert.match(info.productDigest ?? '', /^[0-9a-f]{64}$/, 'build-info.json productDigest must be 64-hex');
  if (info.dirty) {
    assert.ok(ALLOW_DIRTY, 'Refusing dirty working tree; commit changes first or pass DSH_VERIFY_ALLOW_DIRTY=1 for a dry-run (not clean-commit E2 evidence)');
    console.warn('WARNING: DSH_VERIFY_ALLOW_DIRTY=1 enabled — dirty dry-run only; NOT clean-commit E2 evidence.');
  }
  return info;
}

function assertInputsMatchHead(head) {
  if (ALLOW_DIRTY) return;
  for (const rel of [TARGETS, PROBE]) {
    assert.equal(Buffer.compare(gitShow(head, rel), readFileSync(rel)), 0, `${rel} differs from committed HEAD (${head})`);
  }
}

function runPack() {
  const head = resolveHead();
  assertContainedOutputDir();
  assertInputsMatchHead(head);
  execFileSync('npm', ['run', 'build'], { stdio: 'inherit' });
  const diskBuildInfo = readFileSync('dist/build-info.json');
  const info = verifyBuildInfo(diskBuildInfo, head);

  rmSync(OUT_DIR, { recursive: true, force: true });
  mkdirSync(OUT_DIR, { recursive: true, mode: 0o700 });
  chmodSync(OUT_DIR, 0o700);

  const packedOut = execFileSync('npm', ['pack', '--ignore-scripts', '--silent', '--pack-destination', OUT_DIR], { encoding: 'utf8' }).trim();
  const packedName = packedOut.split(/\r?\n/).filter(Boolean).at(-1);
  assert.ok(packedName?.endsWith('.tgz'), `Unexpected npm pack output: ${packedOut}`);
  renameSync(join(OUT_DIR, packedName), CANDIDATE);

  execFileSync(process.execPath, ['scripts/check-package.mjs', CANDIDATE], { stdio: 'inherit' });
  assert.equal(Buffer.compare(readTarEntry(CANDIDATE, 'dist/build-info.json'), diskBuildInfo), 0, 'Packed dist/build-info.json differs from disk');
  for (const rel of [TARGETS, PROBE]) {
    assert.equal(Buffer.compare(readTarEntry(CANDIDATE, rel), readFileSync(rel)), 0, `Packed ${rel} differs from disk`);
  }

  const tarballSha256 = sha256(readFileSync(CANDIDATE));
  console.log(`Candidate ready: ${CANDIDATE}\n  SHA-256:       ${tarballSha256}\n  HEAD:          ${head}\n  productDigest: ${info.productDigest}\n  dirty:         ${info.dirty}`);
}

const CONTAINER_INBOX_SCRIPT = `set -euo pipefail
printf 'Image: %s\\nCandidate SHA-256: %s\\n' "$1" "$2"
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
try { console.log('Chromium:', browser.version()); } finally { await browser.close(); }
JS
npm run test:inbox-ui
`;

async function runContainerInbox(image, tarballSha256) {
  const candidateAbs = realpathSync(resolve(CANDIDATE));
  const logStream = createWriteStream(INBOX_LOG, { flags: 'w', mode: 0o600 });
  const args = [
    'run', '--rm', '--init', '-i', '--shm-size=1g', '--cap-drop=ALL', '--security-opt=no-new-privileges',
    '--mount', `type=bind,src=${candidateAbs},dst=/input/candidate.tgz,readonly`,
    image, 'bash', '-s', '--', image, tarballSha256,
  ];
  const exitCode = await new Promise((resolveExit, rejectExit) => {
    const child = spawn('docker', args, { stdio: ['pipe', 'pipe', 'pipe'] });
    const tee = (target) => (chunk) => { target.write(chunk); logStream.write(chunk); };
    child.stdout.on('data', tee(process.stdout));
    child.stderr.on('data', tee(process.stderr));
    child.on('error', rejectExit);
    child.on('close', (code) => resolveExit(code ?? 1));
    child.stdin.end(CONTAINER_INBOX_SCRIPT);
  });
  await new Promise((done, fail) => logStream.end((err) => (err ? fail(err) : done())));
  assert.equal(exitCode, 0, `Containerized test:inbox-ui failed with exit code ${exitCode} (see ${INBOX_LOG})`);
}

async function runPost() {
  const head = resolveHead();
  assertContainedOutputDir();
  assertInputsMatchHead(head);
  const lock = JSON.parse(readFileSync('dsh-engineering.lock.json', 'utf8'));
  const host = JSON.parse(readFileSync(HOST_REPORT, 'utf8'));
  const tarballSha256 = sha256(readFileSync(CANDIDATE));
  const expectedInputs = {
    mode: 'all', sourceCommit: head, tarballSha256,
    targetsSha256: sha256(readFileSync(TARGETS)), probeSha256: sha256(readFileSync(PROBE)),
  };

  assert.equal(host.schemaVersion, 1, 'host.json schemaVersion must be 1');
  assert.equal(host.mode, 'all', 'host.json mode must be all');
  assert.equal(host.outcome, 'passed', `host.json outcome must be passed (got ${host.outcome})`);
  assert.equal(host.provenance?.producer?.source, 'git-archive', 'provenance.producer.source must be git-archive');
  assert.equal(host.provenance?.producer?.commit, lock.commit, 'provenance.producer.commit must match lock commit');
  assert.ok(isDeepStrictEqual(host.provenance?.inputs, expectedInputs), 'host.json provenance.inputs mismatch');
  assert.equal(host.plugin?.sourceCommit, head, 'host.json plugin.sourceCommit must match HEAD');
  assert.equal(host.plugin?.sha256, tarballSha256, 'host.json plugin.sha256 must match candidate tarball');
  assert.ok(Array.isArray(host.checks), 'host.json checks must be an array');
  for (const expectation of ['admit', 'refuse']) {
    const check = host.checks.find((c) => c?.expectation === expectation);
    assert.ok(check && check.outcome === 'passed', `host.json ${expectation} check must have outcome=passed`);
  }
  assert.match(host.image ?? '', /^sha256:[0-9a-f]{64}$/, 'host.json image must be a sha256 image digest');

  verifyBuildInfo(readTarEntry(CANDIDATE, 'dist/build-info.json'), head);
  await runContainerInbox(host.image, tarballSha256);
  console.log(`Host verification & inbox-ui passed (report=${HOST_REPORT}, log=${INBOX_LOG})`);
}

const subcommand = process.argv[2];
if (subcommand === 'pack' && process.argv.length === 3) runPack();
else if (subcommand === 'post' && process.argv.length === 3) await runPost();
else { console.error('Usage: node scripts/verify-host.mjs <pack|post>'); process.exit(2); }
