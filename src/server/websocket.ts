import type { WebSocket } from 'ws';
import type { IncomingMessage } from 'node:http';
import type { VibeServerConfig } from './types.js';
import type { createPTYManager } from './pty-manager.js';

export function setupWebSocket(
  ws: WebSocket,
  request: IncomingMessage,
  ptyManager: ReturnType<typeof createPTYManager>,
  config: Required<VibeServerConfig>,
): void {
  const url = new URL(request.url || '/', `http://${request.headers.host}`);
  const existingToken = url.searchParams.get('session') || undefined;

  (ws as unknown as { __isAlive: boolean }).__isAlive = true;
  ws.on('pong', () => {
    (ws as unknown as { __isAlive: boolean }).__isAlive = true;
  });

  let sessionId: string;
  let status: 'new' | 'reconnected';

  if (existingToken) {
    const existing = ptyManager.get(existingToken);
    if (existing) {
      sessionId = existingToken;
      status = 'reconnected';
      console.log(`[${sessionId}] Client reconnected.`);

      // Drain buffered output (no status text — that goes in the title bar)
      const buffered = ptyManager.drainBuffer(sessionId);
      if (buffered.length > 0) {
        ws.send(buffered.join(''));
      }
    } else {
      const { sessionId: newId, pty: ptyProcess } = ptyManager.spawn(
        config.cols,
        config.rows,
      );
      sessionId = newId;
      status = 'new';
      console.log(`[${sessionId}] Session not found, spawned new. PID: ${ptyProcess.pid}`);

      wirePTY(ws, ptyProcess, sessionId, ptyManager);
      ws.send(JSON.stringify({ type: 'session', token: sessionId, status }));
      return;
    }
  } else {
    const { sessionId: newId, pty: ptyProcess } = ptyManager.spawn(
      config.cols,
      config.rows,
    );
    sessionId = newId;
    status = 'new';
    console.log(`[${sessionId}] New connection. PID: ${ptyProcess.pid}`);

    ws.send(JSON.stringify({ type: 'session', token: sessionId, status }));
  }

  wirePTY(ws, ptyManager.get(sessionId)!, sessionId, ptyManager);
  // Send status separately so client knows this is a reconnection
  if (status === 'reconnected') {
    ws.send(JSON.stringify({ type: 'session', token: sessionId, status: 'reconnected' }));
  }
}

function wirePTY(
  ws: WebSocket,
  ptyProcess: ReturnType<ReturnType<typeof createPTYManager>['get']>,
  sessionId: string,
  ptyManager: ReturnType<typeof createPTYManager>,
): void {
  if (!ptyProcess) {
    ws.close(1011, 'PTY not found');
    return;
  }

  // PTY output -> WebSocket
  const onData = (data: string) => {
    if (ws.readyState === ws.OPEN) {
      ws.send(data);
    }
  };
  ptyProcess.onData(onData);

  const onExit = ({ exitCode, signal }: { exitCode: number; signal?: number }) => {
    if (ws.readyState === ws.OPEN) {
      ws.send(
        `\r\n\x1b[33m[Process exited with code ${exitCode ?? signal}]\x1b[0m\r\n`,
      );
      ws.close(1000, 'PTY process exited');
    }
  };
  ptyProcess.onExit(onExit);

  // WebSocket message -> PTY input (or resize control)
  ws.on('message', (rawData: Buffer) => {
    const msg = rawData.toString();

    // Check if it's a JSON control message (resize or session token)
    try {
      const parsed = JSON.parse(msg);
      if (
        parsed.type === 'resize' &&
        typeof parsed.cols === 'number' &&
        typeof parsed.rows === 'number'
      ) {
        ptyManager.resize(sessionId, parsed.cols, parsed.rows);
        return;
      }
    } catch {
      // Not JSON, treat as terminal data
    }

    // Regular terminal input
    ptyProcess.write(msg);
  });

  // Cleanup on disconnect — start grace period, don't kill immediately
  ws.on('close', () => {
    ptyProcess.removeListener('data', onData);
    ptyProcess.removeListener('exit', onExit);
    ptyManager.disconnect(sessionId, 30000);
  });

  // Handle errors
  ws.on('error', (err) => {
    console.error(`[${sessionId}] WebSocket error:`, err.message);
  });
}
