import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
const entries = execFileSync('tar', ['-tzf', `${pkg.name}-${pkg.version}.tgz`], { encoding: 'utf8' }).trim().split('\n');
for (const required of ['package/dist/index.js', 'package/cordis.patch.yml', 'package/desktop/main.cjs', 'package/desktop/preload.cjs', 'package/web/index.html', 'package/web/pet.js', 'package/web/style.css', 'package/LICENSE', 'package/README.md']) assert.ok(entries.includes(required), `missing ${required}`);
assert.ok(!entries.some(path => path.includes('node_modules/') || path.includes('tests/') || path.includes('.cache/')));
console.log(`Package verified: ${entries.length} files, native window and renderer included.`);
