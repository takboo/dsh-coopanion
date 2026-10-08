import { build } from 'esbuild';
await build({ entryPoints: ['src/index.ts', 'src/bridge.ts', 'src/model.ts'], outdir: 'dist', bundle: true, packages: 'external', platform: 'node', format: 'esm', target: 'node22', sourcemap: true });
