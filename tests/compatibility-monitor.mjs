import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFile, mkdtemp, rm, mkdir, writeFile, realpath } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { aggregate, subprocessStatus, digest, marker, compareVersions, assertRepository } from '../scripts/compatibility/common.mjs';
import { componentIdentities, componentDue, selectChecks, plannedComponents } from '../scripts/compatibility/planning.mjs';
import { combineTargets, parseDesktopFeed } from '../scripts/compatibility/discover.mjs';
import { completedComponents, overallStatus, validateReport, applyPreparationFailure, readArtifacts } from '../scripts/compatibility/report.mjs';
import { targetManifest, candidateLock, validateProposal } from '../scripts/compatibility/proposal.mjs';
import { reviewedDependencies, hostDependencies } from '../scripts/compatibility/reviewed-dependencies.mjs';
import { command, StageError, isolatedEnv } from '../scripts/compatibility/runner.mjs';
import { validateArchivePaths, validateSignature, validateDesktopRuntime } from '../scripts/compatibility/desktop-artifact.mjs';
const baseline = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));
const lock = JSON.parse(await readFile(new URL('../npm-shrinkwrap.json', import.meta.url), 'utf8'));
const sourceCommit = 'a'.repeat(40), version = `${Number(baseline.engines.dsh.split(' || ').toSorted(compareVersions).at(-1).split('.')[0]) + 1}.0.0-rc.6`;
const target = { version, identity: 'b'.repeat(64), npm: { integrity: 'sha512-test', publishedAt: '2026-11-01T00:00:00Z' }, channels: ['npm:next'], runSdk: true, runDesktop: false };
const completed = { identity: componentIdentities(target).sdk, status: 'partial', attempts: 1, run: '123', sourceCommit, updatedAt: '2026-11-01T00:00:00Z' };
const issue = components => ({ number: 5, user: { login: 'github-actions[bot]' }, updated_at: '2026-11-01T00:00:00Z', body: `<!-- dsh-compat-v2:${JSON.stringify({ version, identity: target.identity, attempts: 1, status: 'partial', components })} -->` });

test('SemVer prereleases sort numerically, then stable', () => {
  assert(compareVersions('0.2.1-rc.10', '0.2.1-rc.5') > 0); assert(compareVersions('0.2.1', '0.2.1-rc.10') > 0);
  assert.throws(() => compareVersions('0.2.1-rc.01', version));
});
test('completed component is skipped; a new npm identity is due', () => {
  assert.equal(selectChecks([target], [issue({ sdk: completed })], { baseline: '0.2.1-rc.5' }).length, 0);
  assert.equal(selectChecks([{ ...target, npm: { integrity: 'new' } }], [issue({ sdk: completed })], { baseline: '0.2.1-rc.5' })[0].runSdk, true);
});
test('a late Desktop publication only schedules Desktop and keeps SDK evidence', () => {
  const t = { ...target, desktop: { version, sha512: 'new', path: 'new' }, identity: 'c'.repeat(64) };
  const selected = selectChecks([t], [issue({ sdk: completed })], { baseline: '0.2.1-rc.5' })[0];
  assert.equal(selected.runSdk, false); assert.equal(selected.runDesktop, true);
  const next = plannedComponents(selected, { sdk: completed }, { run: '124', sourceCommit }); assert.deepEqual(next.sdk, completed);
});
test('release-only metadata update does not rerun completed SDK', () => {
  const selected = selectChecks([{ ...target, identity: 'c'.repeat(64) }], [issue({ sdk: completed })], { baseline: '0.2.1-rc.5' })[0];
  assert(selected.metadataOnly); assert.equal(selected.runSdk, false);
});
test('retry and interrupted running states have a six-hour interval and three-attempt ceiling', () => {
  const now = Date.parse('2026-11-01T07:00:00Z');
  for (const status of ['retry','running']) {
    assert(componentDue({ ...completed, status }, completed.identity, { now }));
    assert.equal(componentDue({ ...completed, status, attempts: 3 }, completed.identity, { now }), false);
    assert.equal(componentDue({ ...completed, status }, completed.identity, { now: now - 2 * 3600000 }), false);
  }
  assert.equal(componentDue({ ...completed, status: 'failed' }, completed.identity, { now }), false);
  assert(componentDue({ ...completed, attempts: 3 }, completed.identity, { manual: true }));
});
test('untrusted Issue state does not suppress checks and selection is bounded', () => {
  assert.equal(selectChecks([target], [{ ...issue({ sdk: completed }), user: { login: 'untrusted' } }], { baseline: '0.2.1-rc.5' }).length, 1);
  assert.equal(selectChecks(Array.from({ length: 5 }, (_, i) => ({ ...target, version: `0.2.1-rc.${6+i}` })), [], { baseline: '0.2.1-rc.5' }).length, 3);
  assert.equal(marker('<!-- dsh-compat-v2:{"version":"invalid"} -->'), undefined);
});
test('incomplete evidence and interrupted subprocesses stay retryable, including mixed failures', () => {
  assert.equal(aggregate([{ status: 'failed' }], 3), 'retry');
  assert.equal(aggregate([{ status: 'failed' }, { status: 'retry' }], 2), 'retry');
  assert.equal(aggregate([{ status: 'failed' }, { status: 'partial' }], 2), 'failed');
  for (const result of [{ code: null, timedOut: true }, { code: null, signal: 'SIGTERM' }, { error: new Error('ENOENT') }]) assert.equal(subprocessStatus(result), 'retry');
  assert.equal(subprocessStatus({ code: 1, log: 'ERESOLVE', setup: true }), 'failed');
  assert.equal(subprocessStatus({ code: 1, log: 'EAI_AGAIN' }), 'retry');
});
test('real timeout and missing executable are recorded as retry, assertion failure as failed', async t => {
  const directory = await mkdtemp(join(tmpdir(), 'coopanion-monitor-')); t.after(() => rm(directory, { recursive: true, force: true }));
  for (const [name, file, args, status, timeout] of [
    ['timeout', process.execPath, ['-e', 'setInterval(()=>{},1000)'], 'retry', 50],
    ['missing', join(directory, 'missing'), [], 'retry', 1000],
    ['assertion', process.execPath, ['-e', 'process.exit(1)'], 'failed', 1000],
  ]) {
    const report = { stages: [] };
    await assert.rejects(command(report, directory, name, file, args, { timeout }), e => e instanceof StageError && e.status === status);
    assert.equal(report.stages[0].status, status);
  }
});
test('candidate manifest changes exact Host versions only and retains prior support', () => {
  const candidate = targetManifest(baseline, version);
  assert(candidate.engines.dsh.endsWith(version)); assert(candidate.engines.dsh.includes('0.2.1-rc.3'));
  assert.deepEqual(candidate.dependencies, baseline.dependencies); assert.equal(candidate.version, baseline.version);
  assert.equal(candidate.devDependencies['@deepseek-ai/cordis'], baseline.devDependencies['@deepseek-ai/cordis']);
  assert.throws(() => targetManifest(baseline, '0.2.0-rc.1'), /downgrade/);
});
test('reviewed 0.2.2 candidates include their exact Cordis and Schemastery baselines only in the proposal', () => {
  const production = { ...structuredClone(baseline), engines: { ...baseline.engines, dsh: '0.2.1-rc.5' } };
  const original = structuredClone(production);
  for (const [target, cordis, schemastery] of [
    ['0.2.2-alpha.2', '4.0.6-alpha.1', '3.18.6-alpha.1'],
    ['0.2.2-alpha.3', '4.0.6-alpha.2', '3.18.6-alpha.2'],
    ['0.2.2-rc.1', '4.1.0', '3.19.0'],
    ['0.2.2-rc.2', '4.1.0', '3.19.0'],
  ]) {
    const candidate = targetManifest(production, target);
    for (const [name, exact] of [['@deepseek-ai/cordis', cordis], ['@deepseek-ai/schemastery', schemastery]]) {
      assert.equal(candidate.devDependencies[name], exact);
      assert(candidate.peerDependencies[name].split(' || ').includes(exact));
      assert(candidate.peerDependencies[name].startsWith(production.peerDependencies[name]));
    }
    assert.deepEqual(candidate.dependencies, baseline.dependencies);
    assert.equal(candidate.version, baseline.version);
    assert.deepEqual(production, original);
    for (const [name, exact] of Object.entries(reviewedDependencies(target))) assert.equal(candidate.devDependencies[name], exact);
    const originalIdentity = digest({ contract: 1, version: target, npm: { integrity: 'same' } });
    const next = { version: target, npm: { integrity: 'same' } };
    assert.notEqual(componentIdentities(next).sdk, originalIdentity, 'new dependency baseline must not reuse old failed evidence');
  }
});
test('candidate proposals reject a different companion version even in a nested lock entry', () => {
  const production = { ...structuredClone(baseline), engines: { ...baseline.engines, dsh: '0.2.1-rc.5' } };
  const target = '0.2.2-alpha.2', manifest = targetManifest(production, target), next = candidateLock(lock, manifest);
  const entry = { version: '1.0.7-alpha.1', resolved: 'https://registry.npmjs.org/@deepseek-ai/cordis-plugin-loader/-/cordis-plugin-loader-1.0.7-alpha.1.tgz', integrity: 'sha512-AA==' };
  next.packages['node_modules/fixture/node_modules/@deepseek-ai/cordis-plugin-loader'] = entry;
  const proposal = () => ({ version: target, sourceCommit, files: { 'package.json': JSON.stringify(manifest), 'npm-shrinkwrap.json': JSON.stringify(next) } });
  validateProposal(proposal(), production, target, sourceCommit);
  entry.version = '1.0.7-alpha.2';
  assert.throws(() => validateProposal(proposal(), production, target, sourceCommit), /Unreviewed companion resolution/);
});
test('successful reviewed reports require the exact Host composition and a valid dependency tree', () => {
  const candidate = { ...target, version: '0.2.2-alpha.2' };
  const host = hostDependencies(candidate.version);
  assert.equal(host['@deepseek-ai/cordis'], '4.0.6-alpha.1');
  assert.equal(host['@deepseek-ai/cordis-plugin-timer'], '1.1.8-alpha.1');
  assert.deepEqual(hostDependencies(version), { '@deepseek-ai/dsh': version });
  const report = { version: candidate.version, sourceCommit, target: candidate, productionAdmissionChanged: false, productionSourcesStable: true,
    platform: 'linux', arch: 'x64', status: 'partial', archiveSha256: 'd'.repeat(64),
    stages: ['host-install', 'normal-admission', 'candidate-installation'].map(name => ({ name, status: 'passed' })) };
  assert.throws(() => validateReport(report, candidate, sourceCommit, 'sdk'), /Host dependency composition/);
  report.hostDependencies = host;
  assert.throws(() => validateReport(report, candidate, sourceCommit, 'sdk'), /Missing dependency tree/);
  report.stages.push({ name: 'host-dependency-tree', status: 'passed' });
  validateReport(report, candidate, sourceCommit, 'sdk');
  report.hostDependencies = { ...host, '@deepseek-ai/cordis': '4.0.6-alpha.2' };
  assert.throws(() => validateReport(report, candidate, sourceCommit, 'sdk'), /Host dependency composition/);
});
test('lock refresh preserves unrelated exact resolutions', () => {
  const next = candidateLock(lock, targetManifest(baseline, version));
  assert.deepEqual(next.packages['node_modules/electron'], lock.packages['node_modules/electron']);
  assert(!Object.keys(next.packages).some(p => p.includes('node_modules/@deepseek-ai/')));
});
test('dependency proposal rejects source edits, version changes and untrusted registry resolutions', () => {
  // Current baseline is a valid manual rehearsal proposal.
  const current = baseline.engines.dsh.split(' || ').at(-1);
  const proposal = { version: current, sourceCommit, files: { 'package.json': JSON.stringify(baseline), 'npm-shrinkwrap.json': JSON.stringify(lock) } };
  validateProposal(proposal, baseline, current, sourceCommit);
  assert.throws(() => validateProposal({ ...proposal, files: { ...proposal.files, 'src/index.ts': 'bad' } }, baseline, current, sourceCommit));
  const changed = structuredClone(proposal); const pkg = JSON.parse(changed.files['package.json']); pkg.version = '9.9.9'; changed.files['package.json'] = JSON.stringify(pkg);
  assert.throws(() => validateProposal(changed, baseline, current, sourceCommit));
  const evil = structuredClone(lock); evil.packages['node_modules/electron'].resolved = 'https://evil.invalid/runtime.tgz';
  assert.throws(() => validateProposal({ ...proposal, files: { ...proposal.files, 'npm-shrinkwrap.json': JSON.stringify(evil) } }, baseline, current, sourceCommit));
});
test('report rejects missing stages and mismatched source or target identity', () => {
  const r = { version, sourceCommit, target, productionAdmissionChanged: false, productionSourcesStable: true, platform: 'linux', arch: 'x64', status: 'partial', archiveSha256: 'd'.repeat(64), stages: [] };
  assert.throws(() => validateReport(r, target, sourceCommit, 'sdk'), /Missing/);
  r.stages = ['host-install','normal-admission','candidate-installation'].map(name => ({ name, status: 'passed' })); validateReport(r, target, sourceCommit, 'sdk');
  assert.throws(() => validateReport({ ...r, sourceCommit: 'e'.repeat(40) }, target, sourceCommit, 'sdk'));
});
test('completed SDK requires all three platforms and never grants formal compatibility', () => {
  const reports = ['linux/x64','darwin/arm64','win32/x64'].map(value => { const [platform,arch] = value.split('/'); return { platform,arch,status:'partial' }; });
  const c = completedComponents(target, reports, {}, { run: '123', sourceCommit }); assert.equal(c.sdk.status, 'partial'); assert.equal(overallStatus(c, false), 'partial');
  assert.equal(completedComponents(target, reports.slice(1), {}, { run: '123', sourceCommit }).sdk.status, 'retry');
});
test('upstream channels coalesce and retain not-yet-published npm evidence', () => {
  const registry = { 'dist-tags': { latest: version, next: version }, versions: { [version]: { dist: { integrity: 'sha512-a', tarball: `https://registry.npmjs.org/@deepseek-ai/dsh/-/dsh-${version}.tgz` } } }, time: { [version]: '2026-11-01' } };
  const release = { draft: false, published_at: '2026-11-01', tag_name: 'dsh-v'+version, id: 1 };
  const desktop = { version: '0.2.1-rc.7', sha512: 'pending', path: 'pending' };
  const targets = combineTargets(registry, [release], desktop, '0.2.1-rc.5');
  assert.equal(targets.length, 2); assert.equal(targets[0].channels.length, 3); assert.equal(targets[1].npm.integrity, null);
});
test('Desktop feed, archive, signer and unknown runtime are validated', () => {
  const sha512 = Buffer.alloc(64).toString('base64');
  const feed = `version: ${version}\nsha512: ${sha512}\npath: https://download.deepseek.com/dsh-desk/bin/mac-arm64/deepseek-harness-${version}-mac-arm64.zip\n`;
  assert.equal(parseDesktopFeed(feed).version, version); assert.throws(() => parseDesktopFeed(feed.replace('download.deepseek.com', 'evil.invalid')));
  assert.throws(() => validateArchivePaths(['DeepSeek Harness.app/../escape'])); assert.throws(() => validateSignature('TeamIdentifier=OTHER'));
  assert.throws(() => validateDesktopRuntime({ sdk: version, platform:'darwin', arch:'arm64', node:'unknown' }, version));
});
test('checking environment has isolated homes and no inherited API credentials', async t => {
  const directory = await mkdtemp(join(tmpdir(), 'coopanion-env-')); t.after(() => rm(directory, { recursive: true, force: true }));
  const old = process.env.TEST_API_KEY; process.env.TEST_API_KEY = 'secret'; t.after(() => { if (old === undefined) delete process.env.TEST_API_KEY; else process.env.TEST_API_KEY = old; });
  const env = await isolatedEnv(directory); assert.equal(env.TEST_API_KEY, undefined); assert.equal(env.HOME, join(directory, 'home')); assert(env.DSH_HOME.startsWith(directory));
});
test('writes are restricted to this repository', () => { assert.throws(() => assertRepository('other/repo')); assert.equal(assertRepository('takboo/dsh-coopanion'), 'takboo/dsh-coopanion'); });

test('a known preparation assertion failure is reported as failed rather than missing-platform retry', () => {
  const components = { sdk: { ...completed, status: 'retry' } };
  applyPreparationFailure(components, { status: 'failed', sourceCommit, target, productionSourcesStable: true, reason: 'baseline assertion failed' }, target, sourceCommit);
  assert.equal(components.sdk.status, 'failed'); assert.equal(overallStatus(components, false), 'failed');
});
test('artifact collection preserves a preparation failure in both single and multiple download layouts', async t => {
  const directory = await mkdtemp(join(tmpdir(), 'coopanion-artifacts-')); t.after(() => rm(directory, { recursive: true, force: true }));
  const preparation = { kind: 'prepare', version, status: 'failed', sourceCommit, target, productionSourcesStable: true, reason: 'target-lock: failed (ERESOLVE)' };
  for (const layout of ['single', 'multiple']) {
    const output = join(directory, layout);
    const candidateDirectory = layout === 'single' ? output : join(output, 'dsh-candidate-' + version);
    await mkdir(candidateDirectory, { recursive: true });
    await writeFile(join(candidateDirectory, 'report.json'), JSON.stringify(preparation));
    const artifacts = await readArtifacts(output, target, sourceCommit);
    const components = completedComponents(target, artifacts.reports, {}, { run: '123', sourceCommit });
    applyPreparationFailure(components, artifacts.preparation, target, sourceCommit);
    assert.equal(overallStatus(components, false), 'failed', layout);
    assert.equal(components.sdk.reason, preparation.reason);
    assert.equal(artifacts.reports.length, 0);
  }
});
test('a single successful preparation retains its candidate proposal without granting a platform pass', async t => {
  const directory = await mkdtemp(join(tmpdir(), 'coopanion-proposal-')); t.after(() => rm(directory, { recursive: true, force: true }));
  const proposal = { version, sourceCommit, files: { 'package.json': '{}' } };
  await writeFile(join(directory, 'report.json'), JSON.stringify({ kind: 'prepare', status: 'partial', sourceCommit, target }));
  await writeFile(join(directory, 'proposal.json'), JSON.stringify(proposal));
  const artifacts = await readArtifacts(directory, target, sourceCommit);
  assert.deepEqual(artifacts.proposal, proposal);
  const components = completedComponents(target, artifacts.reports, {}, { run: '123', sourceCommit });
  applyPreparationFailure(components, artifacts.preparation, target, sourceCommit);
  assert.equal(overallStatus(components, false), 'retry');
});
test('single component failures are collected and cannot stand in for preparation or bypass identity checks', async t => {
  const directory = await mkdtemp(join(tmpdir(), 'coopanion-component-')); t.after(() => rm(directory, { recursive: true, force: true }));
  for (const kind of ['sdk', 'desktop']) {
    const report = { version, sourceCommit, target, status: 'failed', platform: kind === 'desktop' ? 'darwin' : 'linux',
      arch: kind === 'desktop' ? 'arm64' : 'x64', productionAdmissionChanged: false, productionSourcesStable: true,
      ...(kind === 'desktop' ? { kind } : {}) };
    await writeFile(join(directory, 'report.json'), JSON.stringify(report));
    let artifacts = await readArtifacts(directory, target, sourceCommit);
    assert.deepEqual(artifacts.reports, [report]);
    assert.equal(artifacts.preparation, undefined);
    await writeFile(join(directory, 'report.json'), JSON.stringify({ ...report, sourceCommit: 'f'.repeat(40) }));
    artifacts = await readArtifacts(directory, target, sourceCommit);
    assert.equal(artifacts.reports.length, 0);
  }
});
test('artifact collection requires the prepared archive for all successful SDK platforms', async t => {
  const directory = await mkdtemp(join(tmpdir(), 'coopanion-archives-')); t.after(() => rm(directory, { recursive: true, force: true }));
  const candidateDirectory = join(directory, 'dsh-candidate-' + version), archiveSha256 = 'd'.repeat(64);
  await mkdir(candidateDirectory);
  await writeFile(join(candidateDirectory, 'candidate.json'), JSON.stringify({ sourceCommit, targetIdentity: target.identity, archiveSha256 }));
  for (const value of ['linux/x64', 'darwin/arm64', 'win32/x64']) {
    const [platform, arch] = value.split('/'), output = join(directory, `dsh-check-${version}-${platform}`);
    await mkdir(output);
    await writeFile(join(output, 'report.json'), JSON.stringify({ version, sourceCommit, target, platform, arch, status: 'partial',
      productionAdmissionChanged: false, productionSourcesStable: true, archiveSha256,
      stages: ['host-install', 'normal-admission', 'candidate-installation'].map(name => ({ name, status: 'passed' })) }));
  }
  let artifacts = await readArtifacts(directory, target, sourceCommit);
  assert.equal(overallStatus(completedComponents(target, artifacts.reports, {}, { run: '123', sourceCommit }), false), 'partial');
  await writeFile(join(candidateDirectory, 'candidate.json'), JSON.stringify({ sourceCommit, targetIdentity: target.identity, archiveSha256: 'e'.repeat(64) }));
  artifacts = await readArtifacts(directory, target, sourceCommit);
  assert.equal(artifacts.reports.length, 0);
  assert.equal(overallStatus(completedComponents(target, artifacts.reports, {}, { run: '123', sourceCommit }), false), 'retry');
});
test('three platforms using different candidate archive bytes cannot pass', () => {
  const reports = ['linux/x64','darwin/arm64','win32/x64'].map((value,i) => { const [platform,arch] = value.split('/'); return { platform,arch,status:'partial',archiveSha256:String(i) }; });
  assert.equal(completedComponents(target, reports, {}, { run:'123', sourceCommit }).sdk.status, 'failed');
});

test('structured stdout remains parseable and stderr remains in the evidence log', async t => {
  const directory = await mkdtemp(join(tmpdir(), 'coopanion-stdout-')); t.after(() => rm(directory, { recursive: true, force: true }));
  const result = await command({ stages: [] }, directory, 'structured', process.execPath, ['-e', 'console.error("carrier diagnostic");console.log(JSON.stringify({runtime:"verified"}))'], { captureStdout: true });
  assert.deepEqual(JSON.parse(result), { runtime: 'verified' });
  assert.match(await readFile(join(directory, 'structured.log'), 'utf8'), /carrier diagnostic/);
});

test('Desktop resolution preserves ESM and CommonJS exports, relative chunks and explicit Host file URLs', async t => {
  const { spawnSync } = await import('node:child_process');
  const { pathToFileURL } = await import('node:url');
  const directory = await realpath(await mkdtemp(join(tmpdir(), 'coopanion-asar-resolve-'))); t.after(() => rm(directory, { recursive: true, force: true }));
  const sdk = join(directory, 'DeepSeek Harness.app/Contents/Resources/app.asar/dsh');
  const client = join(directory, 'client');
  for (const [base, label] of [[sdk, 'asar'], [client, 'npm']]) {
    const pkg = join(base, 'node_modules/@deepseek-ai/dsh-compat-fixture'); await mkdir(join(pkg, 'lib'), { recursive: true });
    await writeFile(join(pkg, 'package.json'), JSON.stringify({
      type: 'module',
      exports: {
        '.': './lib/index.js',
        './operations': { require: './lib/operations.cjs', default: './lib/operations.js' },
        './package.json': './package.json',
      },
    }));
    await writeFile(join(pkg, 'lib/index.js'), "export { carrier } from './chunk.js';");
    await writeFile(join(pkg, 'lib/chunk.js'), `export const carrier = '${label}';`);
    await writeFile(join(pkg, 'lib/operations.js'), `export const operation = '${label}-operation';`);
    await writeFile(join(pkg, 'lib/operations.cjs'), `module.exports = '${label}-require';`);
  }
  const npmOnly = join(directory, 'node_modules/@deepseek-ai/dsh-npm-only');
  await mkdir(npmOnly, { recursive: true });
  await writeFile(join(npmOnly, 'index.cjs'), "module.exports = 'outside';");
  await writeFile(join(npmOnly, 'package.json'), JSON.stringify({ main: 'index.cjs' }));
  const explicit = pathToFileURL(join(client, 'node_modules/@deepseek-ai/dsh-compat-fixture/lib/index.js')).href;
  const probe = join(client, 'probe.mjs');
  await writeFile(probe, `
    import assert from 'node:assert/strict';
    import { createRequire } from 'node:module';
    import { carrier } from '@deepseek-ai/dsh-compat-fixture';
    import { operation } from '@deepseek-ai/dsh-compat-fixture/operations';
    import { carrier as explicit } from '${explicit}';
    const require = createRequire(import.meta.url);
    const specifier = '@deepseek-ai/dsh-compat-fixture/operations';
    assert.throws(() => require.resolve('@deepseek-ai/dsh-npm-only'), /must resolve into the signed ASAR/);
    console.log(JSON.stringify([carrier, operation, explicit, require.resolve(specifier), require(specifier)]));
  `);
  const bootstrap = new URL('../scripts/compatibility/desktop-bootstrap.mjs', import.meta.url).href;
  const result = spawnSync(process.execPath, ['--import='+bootstrap, probe], { env: { ...process.env, COOPANION_ASAR_SDK: sdk }, encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(JSON.parse(result.stdout), [
    'asar', 'asar-operation', 'asar', join(sdk, 'node_modules/@deepseek-ai/dsh-compat-fixture/lib/operations.cjs'), 'asar-require',
  ]);
});

test('published npm evidence binds the selected artifact and does not substitute for the candidate', () => {
  const published = { name: baseline.name, version: '0.4.20', integrity: 'sha512-test-publication' };
  const observedTarget = { ...target, published };
  assert.notEqual(componentIdentities(observedTarget).sdk, componentIdentities(target).sdk);
  const report = {
    kind: 'published', platform: 'linux', arch: 'x64', sourceCommit, version, target: observedTarget,
    status: 'passed', admission: 'refused-as-expected',
    package: { ...published, sha256: 'c'.repeat(64), sourceCommit: 'd'.repeat(40) },
    stages: [{ name: 'admission', status: 'refused-as-expected' }],
  };
  assert.equal(validateReport(report, observedTarget, sourceCommit, 'published'), report);
  assert.throws(() => validateReport({ ...report, package: { ...report.package, integrity: 'other' } }, observedTarget, sourceCommit, 'published'));
  const candidates = Array.from({ length: 3 }, () => ({ status: 'partial', archiveSha256: 'e'.repeat(64) }));
  const outcome = reports => completedComponents(observedTarget, reports, {}, { run: '123', sourceCommit }).sdk.status;
  assert.equal(outcome(candidates), 'retry');
  assert.equal(outcome([report]), 'retry');
  assert.equal(outcome([...candidates, report]), 'partial');
  assert.equal(outcome([...candidates, { ...report, status: 'failed' }]), 'failed');
});

test('only an actual Host refusal counts as expected', async t => {
  const directory = await mkdtemp(join(tmpdir(), 'coopanion-refusal-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const report = { stages: [] };
  const opts = { expectedRefusal: log => log.includes('engines.dsh rejection') };
  const run = source => command(report, directory, 'admission', process.execPath, ['-e', source], opts);
  await run('console.error("engines.dsh rejection"); process.exitCode = 1');
  await assert.rejects(run('console.error("engines.dsh rejection")'), { status: 'failed' });
  await assert.rejects(run('console.error("ECONNRESET"); process.exitCode = 1'), { status: 'retry' });
  assert.deepEqual(report.stages.map(stage => stage.status), ['refused-as-expected', 'failed', 'retry']);
});
