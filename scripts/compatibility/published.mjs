import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { delimiter, join, resolve } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { pathToFileURL } from 'node:url';
import { chromium } from 'playwright-core';
import { discover } from './discover.mjs';
import { FetchError, request } from './common.mjs';
import { hostDependencies } from './reviewed-dependencies.mjs';
import { commit, isolatedEnv, command, npmCli, StageError } from './runner.mjs';
import { packageName } from '../release-support.mjs';

const scratch = await mkdtemp(join(tmpdir(), 'coopanion-published-'));
const output = resolve(process.env.DSH_REPORT_DIR ?? 'artifacts/compat-published');
const runtime = join(scratch, 'runtime');
const report = { schema: 1, kind: 'published', sourceCommit: commit(), platform: process.platform, arch: process.arch, status: 'running', stages: [] };
const env = await isolatedEnv(scratch);
env.PATH = join(runtime, 'node_modules', '.bin') + delimiter + env.PATH;
env.npm_config_ignore_scripts = 'true';
const run = (name, file, args, options) => command(report, output, name, file, args, { cwd: scratch, env, ...options });
const npm = (name, args) => run(name, process.execPath, [npmCli(), ...args], { setup: true });
let phase = 'setup', browser, host;

async function snapshot(path) {
  return readFile(path).catch(error => {
    if (error.code !== 'ENOENT') throw error;
    return null;
  });
}

async function probeWeb(cli, packedProbe) {
  phase = 'browser';
  browser = await chromium.launch({ headless: true, env });
  report.browser = browser.version();
  report.stages.push({ name: phase, status: 'passed' });
  phase = 'web-boot';
  host = spawn(process.execPath, [cli, '--profile', 'probe', '--port', '0', '--no-open'], { cwd: scratch, env, detached: true, stdio: ['ignore', 'pipe', 'pipe'] });
  const url = await new Promise((resolve, reject) => {
    let output = '';
    const timer = setTimeout(() => finish(new StageError('web-boot timeout', 'retry')), 60_000);
    function finish(error, url) {
      clearTimeout(timer);
      if (error) reject(error);
      else resolve(url);
    }
    const observe = chunk => {
      output = (output + chunk).slice(-16000);
      const url = output.match(/http:\/\/127\.0\.0\.1:\d+\/\?token=[A-Za-z0-9_-]+/)?.[0];
      if (url) finish(null, url);
    };
    host.stdout.on('data', observe);
    host.stderr.on('data', observe);
    host.once('error', error => finish(new StageError(error.code, 'retry')));
    host.once('exit', (code, signal) => finish(new StageError(`web-boot exited ${code ?? signal}`, signal ? 'retry' : 'failed')));
  });
  report.stages.push({ name: phase, status: 'passed' });
  phase = 'web-navigation';
  const page = await browser.newPage({ locale: 'en-US' });
  page.setDefaultTimeout(15_000);
  assert((await page.goto(url, { timeout: 30_000 }))?.ok(), 'DSH browser navigation failed');
  report.stages.push({ name: phase, status: 'passed' });
  phase = 'web-ready';
  await packedProbe.prepareClient(page);
  report.stages.push({ name: phase, status: 'passed' });
  phase = 'plugin-web';
  report.observed = await packedProbe.verifyClient(page);
  report.stages.push({ name: phase, status: 'passed' });
}

try {
  assert.equal(process.platform, 'linux', 'Run the published browser track in Linux Docker');
  report.target = process.env.DSH_TARGET_JSON ? JSON.parse(process.env.DSH_TARGET_JSON)
    : (await discover({ manual: process.env.DSH_VERSION, token: process.env.GH_TOKEN, local: true }))[0];
  assert(report.target, 'Choose an exact DSH target');
  const { version, published } = report.target;
  report.version = version;
  if (!published || !report.target.npm?.integrity) throw new FetchError('Wait for both exact npm publications');
  const metadata = await request(`https://registry.npmjs.org/${encodeURIComponent(packageName)}/${encodeURIComponent(published.version)}`);
  assert.equal(metadata.name, packageName);
  assert.equal(metadata.version, published.version);
  assert.equal(metadata.dist.integrity, published.integrity);
  const bytes = await request(metadata.dist.tarball, { responseType: 'bytes' });
  assert.equal(`sha512-${createHash('sha512').update(bytes).digest('base64')}`, published.integrity);
  report.package = { ...published, sha256: createHash('sha256').update(bytes).digest('hex') };
  const archive = join(scratch, 'published.tgz');
  await writeFile(archive, bytes);
  const readPacked = async path => run('packed-' + path.split('/').at(-1), 'tar', ['-xOf', archive, `package/${path}`], { captureStdout: true });
  const manifest = JSON.parse(await readPacked('package.json'));
  assert.equal(manifest.name, packageName);
  assert.equal(manifest.version, published.version);
  const build = JSON.parse(await readPacked('dist/build-info.json'));
  assert.match(build.commit, /^[a-f0-9]{40}$/);
  assert.equal(build.dirty, false);
  report.package.sourceCommit = build.commit;

  report.hostDependencies = hostDependencies(version);
  await npm('host-install', ['install', '--prefix', runtime, '--no-audit', '--no-fund', 'pnpm@11.28.5', ...Object.entries(report.hostDependencies).map(([name, exact]) => `${name}@${exact}`)]);
  const lock = JSON.parse(await readFile(join(runtime, 'package-lock.json'), 'utf8'));
  assert.equal(lock.packages['node_modules/@deepseek-ai/dsh'].integrity, report.target.npm.integrity);
  await npm('host-dependency-tree', ['ls', '--all', '--prefix', runtime]);
  const cli = join(runtime, 'node_modules/@deepseek-ai/dsh/lib/bin.js');
  const dsh = (name, args, options) => run(name, process.execPath, [cli, ...args], options);
  assert.equal((await dsh('host-version', ['--version'], { captureStdout: true })).trim(), version);
  const { evaluatePluginCompatibility } = await import(pathToFileURL(join(runtime, 'node_modules/@deepseek-ai/dsh-app-boot/lib/index.js')).href);
  const refusal = evaluatePluginCompatibility(manifest, {}, version);
  const dump = ['--profile', 'probe', '--dump-config'];
  await dsh('profile-setup', ['--from-default-profile', 'web', ...dump], { setup: true });
  const profile = join(env.DSH_HOME, 'profiles', 'probe');
  const profilePaths = ['package.json', 'pnpm-lock.yaml', 'cordis.patch.yml'].map(name => join(profile, name));
  const before = await Promise.all(profilePaths.map(snapshot));
  phase = 'admission';
  await dsh('admission', ['plugin', '--profile', 'probe', 'add', archive], refusal ? {
    expectedRefusal: log => log.includes('engines.dsh') && log.includes(`${manifest.name}@${manifest.version}`)
      && log.includes(version) && log.includes(manifest.engines.dsh),
  } : {});
  assert.equal(await snapshot(join(profile, 'compatibility.json')), null, 'No compatibility override may be written');
  if (refusal) {
    assert.deepEqual(await Promise.all(profilePaths.map(snapshot)), before, 'Refusal altered profile files');
    assert(!(await dsh('refusal-profile', dump)).includes(packageName), 'Refused package survived in composed profile');
    report.admission = 'refused-as-expected';
  } else {
    const installed = JSON.parse(await readFile(join(profile, 'node_modules', packageName, 'package.json'), 'utf8'));
    assert.equal(installed.version, published.version);
    assert.equal(JSON.parse(await readFile(profilePaths[0], 'utf8')).dependencies[packageName], `file:${archive}`);
    assert((await dsh('admitted-profile', dump)).includes(packageName));
    report.admission = 'admitted';
    const source = await readPacked('tests/engineering-web-probe.mjs');
    report.probeSha256 = createHash('sha256').update(source).digest('hex');
    const probe = join(scratch, 'published-probe.mjs');
    await writeFile(probe, source);
    await probeWeb(cli, await import(pathToFileURL(probe).href));
  }
  report.status = 'passed';
} catch (error) {
  report.status = error instanceof StageError ? error.status : error instanceof FetchError || phase === 'browser' ? 'retry' : 'failed';
  report.failurePhase = phase;
  // The launch URL is local and contains a one-time token.
  report.reason = String(error.message).replace(/https?:\/\/[^\s"'<>]+/g, '[url]').slice(0, 2000);
} finally {
  if (host?.pid && host.exitCode === null && host.signalCode === null) {
    const stop = signal => {
      try { process.kill(-host.pid, signal); } catch (error) { if (error.code !== 'ESRCH') throw error; }
    };
    stop('SIGTERM');
    await delay(500);
    stop('SIGKILL');
  }
  await browser?.close();
  await rm(scratch, { recursive: true, force: true });
  await mkdir(output, { recursive: true });
  await writeFile(join(output, 'report.json'), JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify({ status: report.status, admission: report.admission, reason: report.reason }));
  process.exitCode = report.status === 'passed' ? 0 : 1;
}
