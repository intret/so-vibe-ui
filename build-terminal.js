import * as esbuild from 'esbuild';
import { copyFile, mkdir } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const isWatch = process.argv.includes('--watch');

const outDir = resolve(__dirname, 'assets');

async function build() {
  await mkdir(outDir, { recursive: true });

  const ctx = await esbuild.context({
    entryPoints: [resolve(__dirname, 'src/terminal/main.ts')],
    bundle: true,
    outfile: resolve(outDir, 'terminal.js'),
    format: 'iife',
    minify: true,
    target: 'es2020',
    sourcemap: true,
    platform: 'browser',
  });

  if (isWatch) {
    await ctx.watch();
    console.log('👀 Watching terminal-web for changes...');
  } else {
    await ctx.rebuild();
    await ctx.dispose();

    // Copy HTML to assets
    await copyFile(
      resolve(__dirname, 'src/terminal/index.html'),
      resolve(outDir, 'index.html'),
    );

    // Copy xterm.css from node_modules (required for xterm.js to render)
    await copyFile(
      resolve(__dirname, 'node_modules/@xterm/xterm/css/xterm.css'),
      resolve(outDir, 'xterm.css'),
    );

    console.log('✅ Terminal web app built to assets/');
  }
}

build().catch((err) => {
  console.error('Build failed:', err);
  process.exit(1);
});
