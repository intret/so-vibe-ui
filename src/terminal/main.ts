import { createTerminal } from './terminal';
import { connectWebSocket } from './websocket';
import { initBridge, notifyReady, notifySession, notifyError } from './bridge';
import { createToolbar } from './toolbar';

function getWebSocketUrl(): string {
  const params = new URLSearchParams(window.location.search);
  const wsParam = params.get('ws');
  if (wsParam) return wsParam;

  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${protocol}//${window.location.host}/ws`;
}

function getSessionToken(): string | null {
  const params = new URLSearchParams(window.location.search);
  return params.get('session') || null;
}

function main() {
  try {
    const { terminal, fitAddon } = createTerminal('terminal-container');
    initBridge(terminal);

    // Toolbar for mobile shortcut keys
    createToolbar(terminal);

    const wsUrl = getWebSocketUrl();
    const sessionToken = getSessionToken();

    // Callback: server sent us a session token → forward to host SDK
    const onSession = (token: string, status: string) => {
      notifySession(token, status);
    };

    const socket = connectWebSocket(wsUrl, sessionToken, terminal, fitAddon, onSession);

    socket.addEventListener('open', () => {
      notifyReady();
    });

    socket.addEventListener('error', () => {
      notifyError('WebSocket connection error');
    });

    // Auto-focus terminal on click
    terminal.element?.addEventListener('click', () => {
      terminal.focus();
    });

    // Scrollbar: add .scrolling class during active scroll (touch + mouse)
    const viewport = terminal.element?.querySelector('.xterm-viewport') as HTMLElement | null;
    if (viewport) {
      let scrollTimer: ReturnType<typeof setTimeout> | null = null;
      viewport.addEventListener('scroll', () => {
        viewport.classList.add('scrolling');
        if (scrollTimer) clearTimeout(scrollTimer);
        scrollTimer = setTimeout(() => {
          viewport.classList.remove('scrolling');
        }, 600);
      }, { passive: true });
    }

    terminal.focus();
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    notifyError(message);
    console.error('Vibe Terminal failed to initialize:', err);
  }
}

main();
