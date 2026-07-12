import type { Terminal } from '@xterm/xterm';

interface VibeMessage {
  source: string;
  type: string;
  payload?: string;
}

export function initBridge(terminal: Terminal): void {
  // Listen for messages from the host page (SDK)
  window.addEventListener('message', (event) => {
    const msg: VibeMessage = event.data;
    if (!msg || msg.source !== 'so-vibe-ui') return;

    switch (msg.type) {
      case 'command':
        if (msg.payload && typeof msg.payload === 'string') {
          terminal.write(msg.payload);
        }
        break;
      case 'focus':
        terminal.focus();
        break;
    }
  });

  // Shift+Escape to request close
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && e.shiftKey) {
      window.parent.postMessage(
        { source: 'so-vibe-terminal', type: 'close' },
        '*',
      );
    }
  });
}

export function notifyReady(): void {
  window.parent.postMessage(
    { source: 'so-vibe-terminal', type: 'ready' },
    '*',
  );
}

export function notifySession(token: string, status: string): void {
  window.parent.postMessage(
    { source: 'so-vibe-terminal', type: 'session', payload: token, status },
    '*',
  );
}

export function notifyError(error: string): void {
  window.parent.postMessage(
    { source: 'so-vibe-terminal', type: 'error', payload: error },
    '*',
  );
}
