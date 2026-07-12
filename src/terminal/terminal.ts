import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebLinksAddon } from '@xterm/addon-web-links';

export function createTerminal(containerId: string) {
  const terminal = new Terminal({
    theme: {
      background: '#0F172A',
      foreground: '#E2E8F0',
      cursor: '#22C55E',
      cursorAccent: '#0F172A',
      selectionBackground: '#1E3A5F',
      black: '#1E293B',
      red: '#EF4444',
      green: '#22C55E',
      yellow: '#F59E0B',
      blue: '#3B82F6',
      magenta: '#A855F7',
      cyan: '#06B6D4',
      white: '#94A3B8',
      brightBlack: '#334155',
      brightRed: '#F87171',
      brightGreen: '#4ADE80',
      brightYellow: '#FBBF24',
      brightBlue: '#60A5FA',
      brightMagenta: '#C084FC',
      brightCyan: '#22D3EE',
      brightWhite: '#F1F5F9',
    },
    fontSize: 14,
    fontFamily: '"JetBrains Mono", "Fira Code", Menlo, Monaco, "Courier New", monospace',
    cursorBlink: true,
    cursorStyle: 'bar',
    allowTransparency: false,
    scrollback: 5000,
  });

  const fitAddon = new FitAddon();
  const webLinksAddon = new WebLinksAddon();

  terminal.loadAddon(fitAddon);
  terminal.loadAddon(webLinksAddon);

  const container = document.getElementById(containerId);
  if (!container) {
    throw new Error(`Container element #${containerId} not found`);
  }

  terminal.open(container);

  // Auto-fit initially and on window resize
  const onResize = () => {
    try {
      fitAddon.fit();
    } catch {
      // Fit may fail if terminal is hidden; ignore
    }
  };
  window.addEventListener('resize', onResize);

  // Initial fit after a short delay (let layout settle)
  setTimeout(onResize, 50);

  return {
    terminal,
    fitAddon,
    webLinksAddon,
    dispose: () => {
      window.removeEventListener('resize', onResize);
      terminal.dispose();
    },
  };
}
