import { build } from 'esbuild';
await build({ entryPoints: ['src/index.ts', 'src/bridge.ts', 'src/model.ts', 'src/character-pack.ts', 'src/animation.ts'], outdir: 'dist', bundle: true, packages: 'external', platform: 'node', format: 'esm', target: 'node22', sourcemap: true });
await build({ entryPoints: ['src/character-store.ts'], outfile: 'dist/character-store.cjs', bundle: true, platform: 'node', format: 'cjs', target: 'node22' });
await build({ entryPoints: ['src/character-runtime.ts'], outfile: 'web/character-runtime.js', bundle: true, platform: 'browser', format: 'esm', target: 'chrome130', minify: true });
await build({ entryPoints: ['src/client/index.ts'], outfile: 'dist/client.js', bundle: true, packages: 'external', platform: 'browser', format: 'cjs', target: 'chrome130', jsx: 'automatic', loader: { '.css': 'text' },
  banner: { js: 'window.__ModuleLoader__.load({ id: "dsh-coopanion", factory: (require) => { var module = { exports: {} }; var exports = module.exports;' },
  footer: { js: 'return module.exports; } });' },
});
