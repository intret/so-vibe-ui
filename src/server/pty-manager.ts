import * as pty from 'node-pty';
import { randomUUID } from 'node:crypto';
import type { VibeServerConfig } from './types.js';

interface PTYSession {
  pty: pty.IPty;
  buffer: string[];
  timer: ReturnType<typeof setTimeout> | null;
  cols: number;
  rows: number;
}

/** Max number of buffered output lines before trimming */
const MAX_BUFFER_LINES = 5000;

export function createPTYManager(config: Required<VibeServerConfig>) {
  const sessions = new Map<string, PTYSession>();

  /**
   * Spawn a new PTY and return its session token.
   */
  function spawn(cols: number, rows: number): { sessionId: string; pty: pty.IPty } {
    const sessionId = randomUUID();
    const shellCmd = config.command;
    const args =
      config.shellArgs && config.shellArgs.length > 0 ? config.shellArgs : [];

    const ptyProcess = pty.spawn(shellCmd, args, {
      name: 'xterm-256color',
      cols,
      rows,
      cwd: config.cwd,
      env: {
        ...process.env,
        TERM: 'xterm-256color',
        COLORTERM: 'truecolor',
      },
    });

    const session: PTYSession = {
      pty: ptyProcess,
      buffer: [],
      timer: null,
      cols,
      rows,
    };

    // Buffer PTY output
    ptyProcess.onData((data: string) => {
      session.buffer.push(data);
      // Trim old lines if buffer grows too large
      if (session.buffer.length > MAX_BUFFER_LINES) {
        session.buffer = session.buffer.slice(-MAX_BUFFER_LINES / 2);
      }
    });

    // Handle PTY exit
    ptyProcess.onExit(() => {
      // Cancel any pending grace timer
      if (session.timer) {
        clearTimeout(session.timer);
        session.timer = null;
      }
      sessions.delete(sessionId);
    });

    sessions.set(sessionId, session);
    console.log(`[${sessionId}] PTY spawned. PID: ${ptyProcess.pid}`);

    return { sessionId, pty: ptyProcess };
  }

  /**
   * Look up a session by token. Returns the PTY or null if not found.
   */
  function get(sessionId: string): pty.IPty | null {
    const session = sessions.get(sessionId);
    if (!session) return null;

    // Cancel grace timer if one is pending (session is being reconnected)
    if (session.timer) {
      clearTimeout(session.timer);
      session.timer = null;
    }

    return session.pty;
  }

  /**
   * Drain buffered output for a session (call on reconnect).
   */
  function drainBuffer(sessionId: string): string[] {
    const session = sessions.get(sessionId);
    if (!session) return [];
    const drained = session.buffer.slice();
    session.buffer = [];
    return drained;
  }

  /**
   * Called when a WebSocket disconnects. Starts a grace period
   * before killing the PTY. If the client reconnects within the
   * grace period, the PTY lives on.
   */
  function disconnect(sessionId: string, graceMs = 30000): void {
    const session = sessions.get(sessionId);
    if (!session) return;

    // Already pending disconnect
    if (session.timer) return;

    console.log(
      `[${sessionId}] Client disconnected. Grace period: ${graceMs}ms`,
    );

    session.timer = setTimeout(() => {
      console.log(`[${sessionId}] Grace period expired. Killing PTY.`);
      session.pty.kill();
      sessions.delete(sessionId);
    }, graceMs);
  }

  function resize(sessionId: string, cols: number, rows: number): void {
    const session = sessions.get(sessionId);
    if (session) {
      session.cols = cols;
      session.rows = rows;
      session.pty.resize(cols, rows);
    }
  }

  function kill(sessionId: string): void {
    const session = sessions.get(sessionId);
    if (session) {
      if (session.timer) {
        clearTimeout(session.timer);
        session.timer = null;
      }
      session.pty.kill();
      sessions.delete(sessionId);
    }
  }

  function killAll(): void {
    for (const [id, session] of sessions) {
      if (session.timer) {
        clearTimeout(session.timer);
        session.timer = null;
      }
      session.pty.kill();
      sessions.delete(id);
    }
  }

  function getCount(): number {
    return sessions.size;
  }

  return { spawn, get, drainBuffer, disconnect, resize, kill, killAll, getCount };
}
