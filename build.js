/**
 * Main build script for vibe-ui.
 * Builds: terminal web app → SDK → Server
 */
import { execSync } from 'node:child_process';
import { rmSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

function run(cmd, label) {
  console.log(`\n🔨 ${label}...`);
  execSync(cmd, {
    cwd: __dirname,
    stdio: 'inherit',
  });
}

try {
  // 1. Build terminal web app (xterm.js bundle)
  run('node build-terminal.js', 'Building terminal web app');

  // 2. Build SDK (vibe-ui frontend) — cleans dist/sdk/
  run(
    'npx tsup src/sdk/index.ts --format esm,cjs --dts --clean --minify --target es2020 --out-dir dist/sdk',
    'Building SDK',
  );

  // Clean stale server output before building
  const serverDist = resolve(__dirname, 'dist/server');
  if (existsSync(serverDist)) {
    rmSync(serverDist, { recursive: true });
  }

  // 3. Build Server (vibe-ui backend) — ESM only (uses import.meta.url)
  run(
    'npx tsup src/server/index.ts src/server/cli.ts --format esm --dts --clean --target node18 --platform node --out-dir dist/server --external express --external ws --external node-pty --external commander',
    'Building Server',
  );

  // 4. Build Vite Plugin
  run(
    'npx tsup src/vite-plugin/index.ts --format esm --dts --clean --target node18 --platform node --out-dir dist/vite-plugin --external vite',
    'Building Vite Plugin',
  );

  console.log('\n✅ vibe-ui build complete!');
  console.log('   SDK:         dist/sdk/');
  console.log('   Server:      dist/server/');
  console.log('   Vite Plugin: dist/vite-plugin/');
  console.log('   Assets:      assets/');
} catch (err) {
  console.error('\n❌ Build failed:', err.message);
  process.exit(1);
}
