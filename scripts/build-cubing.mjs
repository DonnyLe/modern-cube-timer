import { build } from 'esbuild';
import { rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const outdir = fileURLToPath(new URL('../public/cubing/', import.meta.url));
await rm(outdir, { recursive: true, force: true });
await build({
  absWorkingDir: root,
  entryPoints: {
    scramble: 'scripts/cubing/scramble.ts',
    twisty: 'scripts/cubing/twisty.ts',
  },
  outdir,
  bundle: true,
  splitting: true,
  format: 'esm',
  platform: 'browser',
  target: 'es2022',
  minify: true,
  chunkNames: 'chunks/[name]-[hash]',
});
