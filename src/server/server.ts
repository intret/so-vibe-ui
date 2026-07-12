import express from 'express';
import { createServer as createHttpServer } from 'node:http';
import { WebSocketServer } from 'ws';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { VibeServerConfig } from './types.js';
import { resolveConfig } from './config.js';
import { createPTYManager } from './pty-manager.js';
import { setupWebSocket } from './websocket.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

export function createServer(userConfig: Partial<VibeServerConfig> = {}) {
  const config = resolveConfig(userConfig);

  const app = express();

  // Determine static asset path for terminal web app
  const assetsPath =
    config.terminalAppPath || resolve(__dirname, '../../assets');

  // Serve terminal web app
  app.use(express.static(assetsPath));

  // CORS middleware
  if (config.allowedOrigins.length > 0) {
    app.use((req, res, next) => {
      const origin = req.headers.origin || '';
      if (
        config.allowedOrigins.includes('*') ||
        config.allowedOrigins.includes(origin)
      ) {
        res.header('Access-Control-Allow-Origin', origin || '*');
        res.header('Access-Control-Allow-Methods', 'GET');
      }
      next();
    });
  }

  // Health check
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  // Create HTTP server (explicit, for WebSocket upgrade handling)
  const httpServer = createHttpServer(app);

  // Create WebSocket server (noServer mode for manual upgrade with origin check)
  const wss = new WebSocketServer({ noServer: true });

  // PTY manager
  const ptyManager = createPTYManager(config);

  // Manual upgrade handling with origin validation
  httpServer.on('upgrade', (request, socket, head) => {
    const origin = request.headers.origin || '';

    if (
      !config.allowedOrigins.includes('*') &&
      !config.allowedOrigins.includes(origin)
    ) {
      socket.write('HTTP/1.1 403 Forbidden\r\n\r\n');
      socket.destroy();
      return;
    }

    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit('connection', ws, request);
    });
  });

  // Handle WebSocket connections
  wss.on('connection', (ws, request) => {
    setupWebSocket(ws, request, ptyManager, config);
  });

  // Keep-alive: ping all clients periodically
  const pingTimer = setInterval(() => {
    wss.clients.forEach((ws) => {
      const client = ws as unknown as { __isAlive: boolean };
      if (client.__isAlive === false) {
        ws.terminate();
        return;
      }
      client.__isAlive = false;
      ws.ping();
    });
  }, config.pingInterval);

  // Start listening
  httpServer.listen(config.port, config.host, () => {
    console.log(
      `🚀 so-vibe-ui server running at http://${config.host}:${config.port}`,
    );
    console.log(`   Terminal:  http://${config.host}:${config.port}/`);
    console.log(`   WebSocket: ws://${config.host}:${config.port}/ws`);
    console.log(`   Command:   ${config.command}`);
    console.log(`   Sessions:  ${ptyManager.getCount()} active`);
  });

  // Return cleanup handle
  return {
    app,
    httpServer,
    wss,
    config,
    close: () => {
      clearInterval(pingTimer);
      ptyManager.killAll();
      wss.clients.forEach((ws) => ws.terminate());
      wss.close();
      httpServer.close();
      console.log('so-vibe-ui server shut down.');
    },
  };
}
