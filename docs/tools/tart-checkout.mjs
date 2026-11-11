import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync, realpathSync, statSync } from 'node:fs';
import { join } from 'node:path';

// The checkout must be verified before we can load its shared lab resolver.
const [lockFile, source, selected] = process.argv.slice(2);
const label = { argument: '--checkout', environment: 'DSH_ENGINEERING_CHECKOUT', config: 'config checkout' }[source];
try {
  const lock = JSON.parse(readFileSync(lockFile, 'utf8'));
  const https = /^https:\/\/github\.com\/([\w.-]+\/[\w.-]+)$/i;
  const ssh = /^(?:git@github\.com:|ssh:\/\/git@github\.com\/)([\w.-]+\/[\w.-]+)$/i;
  const repositoryId = match => match?.[1].replace(/\.git$/i, '').toLowerCase();
  const repository = typeof lock?.repository === 'string' && repositoryId(https.exec(lock.repository));
  assert.ok(lock?.schemaVersion === 1 && repository &&
    typeof lock.tag === 'string' && /^v\d+\.\d+\.\d+(?:-[\w.-]+)?(?:\+[\w.-]+)?$/.test(lock.tag) &&
    typeof lock.commit === 'string' && /^[a-f0-9]{40}$/.test(lock.commit),
    'Fix schemaVersion, repository, tag and commit in dsh-engineering.lock.json.');

  let checkout = selected;
  if (source === 'config') {
    const configRoot = process.env.XDG_CONFIG_HOME || (process.env.HOME && join(process.env.HOME, '.config'));
    try {
      const file = join(configRoot, 'dsh-plugin-engineering', 'checkout');
      assert.ok(statSync(file).isFile());
      checkout = readFileSync(file, 'utf8').replace(/\n$/, '');
    } catch {
      throw new Error('Write one absolute directory path in the local dsh-plugin-engineering/checkout file, or supply --checkout or DSH_ENGINEERING_CHECKOUT.');
    }
  }
  assert.ok(checkout.startsWith('/') && !/\/\/|[\x00-\x1f\x7f]|(?:^|\/)\.\.?(?:\/|$)/.test(checkout),
    `Set ${label} to an existing absolute directory.`);
  const git = (args, message) => {
    const result = spawnSync('git', ['--no-replace-objects', '-C', checkout, ...args], { encoding: 'utf8' });
    assert.equal(result.status, 0, message);
    return result.stdout.replace(/\n$/, '');
  };
  assert.equal(git(['rev-parse', '--show-toplevel'], `Set ${label} to the base Git checkout root.`),
    realpathSync(checkout), `Set ${label} to the base Git checkout root.`);
  const origin = git(['remote', 'get-url', '--all', 'origin'], `Select a checkout with the locked origin in ${label}.`);
  assert.ok(repositoryId(https.exec(origin) ?? ssh.exec(origin)) === repository,
    `Set ${label} to a checkout of the repository in dsh-engineering.lock.json.`);
  const ref = `refs/tags/${lock.tag}`;
  const commit = git(['rev-parse', '--verify', `${ref}^{commit}`], `Fetch ${ref} from the verified origin.`);
  assert.ok(commit === lock.commit, `Tag ${lock.tag} resolves to ${commit}, expected ${lock.commit}. Check the lock or select a verified checkout.`);
  console.log(`${lock.tag} ${commit}\n${checkout}`);
} catch (error) {
  console.error(error.code === 'ENOENT' ? 'Run from a project checkout containing dsh-engineering.lock.json.' : error.message);
  process.exitCode = 2;
}
