import { spawn, type ChildProcess } from 'node:child_process';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer, type AddressInfo } from 'node:net';
import type { Plugin } from 'vite';

const __dirname = dirname(fileURLToPath(import.meta.url));

export interface VibeUIPluginOptions {
  /** Server port (default: auto-find from 3000 upward) */
  port?: number;
  /** Server host (default: '127.0.0.1') */
  host?: string;
  /** Command to run in PTY (default: $SHELL) */
  command?: string;
  /** Working directory for PTY (default: cwd) */
  cwd?: string;
}

/**
 * Find an available port starting from `startPort`.
 */
async function findPort(startPort: number, host: string): Promise<number> {
  return new Promise((resolvePort, reject) => {
    const server = createServer();
    server.unref();
    server.on('error', reject);
    server.listen(startPort, host, () => {
      const { port } = server.address() as AddressInfo;
      server.close(() => resolvePort(port));
    });
  });
}

/**
 * Vite plugin that auto-starts the so-vibe-ui PTY server alongside vite dev.
 * If no port is specified, auto-finds a free port to avoid conflicts.
 *
 * @example
 * ```ts
 * // vite.config.ts
 * import { vibeUIPlugin } from 'so-vibe-ui/vite-plugin';
 *
 * export default defineConfig({
 *   plugins: [
 *     vibeUIPlugin({ command: 'bash' }),  // port auto-assigned
 *   ],
 * });
 * ```
 */
export function vibeUIPlugin(options: VibeUIPluginOptions = {}): Plugin {
  const host = options.host ?? '127.0.0.1';
  const command = options.command ?? 'bash';
  const cwd = options.cwd ?? process.cwd();
  const explicitPort = options.port;

  let serverProcess: ChildProcess | null = null;
  let resolvedPort: number | null = null;

  return {
    name: 'so-vibe-ui-plugin',

    async configureServer(viteServer) {
      viteServer.httpServer?.once('listening', async () => {
        // Auto-find a free port or use the explicit one
        if (explicitPort) {
          resolvedPort = explicitPort;
        } else {
          try {
            resolvedPort = await findPort(3000, host);
          } catch {
            resolvedPort = 3000;
          }
        }

        const cliPath = resolve(__dirname, '../../server/cli.js');

        const args = [
          cliPath,
          '--port', String(resolvedPort),
          '--host', host,
          '--command', command,
          '--cwd', cwd,
        ];

        serverProcess = spawn(process.execPath, args, {
          stdio: 'inherit',
        });

        console.log(`[so-vibe-ui] PTY server → http://${host}:${resolvedPort}`);
      });

      viteServer.httpServer?.once('close', () => {
        if (serverProcess) {
          serverProcess.kill('SIGTERM');
          serverProcess = null;
          console.log('[so-vibe-ui] PTY server stopped');
        }
      });
    },

    closeBundle() {
      if (serverProcess) {
        serverProcess.kill('SIGTERM');
        serverProcess = null;
      }
    },
  };
}

export default vibeUIPlugin;
