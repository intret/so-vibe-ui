import type { Terminal } from '@xterm/xterm';
import type { FitAddon } from '@xterm/addon-fit';

export function connectWebSocket(
  url: string,
  sessionToken: string | null,
  terminal: Terminal,
  fitAddon: FitAddon,
  onSession: (token: string, status: string) => void,
): WebSocket {
  // Append session token to WS URL for reconnection
  const wsUrl = sessionToken
    ? `${url}?session=${encodeURIComponent(sessionToken)}`
    : url;

  const socket = new WebSocket(wsUrl);

  socket.onopen = () => {
    fitAddon.fit();
    terminal.focus();
  };

  socket.onmessage = (event) => {
    if (typeof event.data === 'string') {
      // Check if it's a JSON control message from the server
      try {
        const parsed = JSON.parse(event.data);
        if (parsed.type === 'session' && typeof parsed.token === 'string') {
          onSession(parsed.token, parsed.status || 'new');
          return;
        }
      } catch {
        // Not JSON, it's terminal data
      }
      terminal.write(event.data);
    } else if (event.data instanceof Blob) {
      const reader = new FileReader();
      reader.onload = () => {
        terminal.write(new Uint8Array(reader.result as ArrayBuffer));
      };
      reader.readAsArrayBuffer(event.data);
    }
  };

  socket.onclose = (event) => {
    const reason = event.reason ? `: ${event.reason}` : '';
    terminal.write(`\r\n\x1b[33m[Connection closed${reason}]\x1b[0m\r\n`);
  };

  socket.onerror = () => {
    terminal.write('\r\n\x1b[31m[Connection error]\x1b[0m\r\n');
  };

  // Send keystrokes to PTY
  terminal.onData((data) => {
    if (socket.readyState === WebSocket.OPEN) {
      socket.send(data);
    }
  });

  // Send resize events as JSON control messages
  terminal.onResize(({ cols, rows }) => {
    if (socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ type: 'resize', cols, rows }));
    }
  });

  return socket;
}
