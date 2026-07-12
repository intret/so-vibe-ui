import type { Terminal } from '@xterm/xterm';

interface ToolbarButton {
  label: string;
  /** Key sequence to send to the terminal */
  sequence: string;
  /** Optional CSS class for styling */
  class?: string;
  /** Row group (0-based for layout) */
  row?: number;
}

const BUTTONS: ToolbarButton[] = [
  // Row 0: modifier / navigation keys
  { label: 'Esc', sequence: '\x1b', row: 0 },
  { label: 'Tab', sequence: '\x09', row: 0 },
  { label: 'Ctrl', sequence: '__CTRL__', row: 0, class: 'mod' },
  { label: '↑', sequence: '\x1b[A', row: 0 },
  { label: '↓', sequence: '\x1b[B', row: 0 },

  // Row 1: arrow keys + common symbols
  { label: '←', sequence: '\x1b[D', row: 1 },
  { label: '→', sequence: '\x1b[C', row: 1 },
  { label: '/', sequence: '/', row: 1 },
  { label: '|', sequence: '|', row: 1 },
  { label: 'Enter', sequence: '\r', row: 1, class: 'enter' },

  // Row 2: more symbols + brackets
  { label: 'Space', sequence: ' ', row: 2, class: 'wide' },
  { label: '-', sequence: '-', row: 2 },
  { label: '>', sequence: '>', row: 2 },
  { label: '$', sequence: '$', row: 2 },
  { label: '.', sequence: '.', row: 2 },
];

export function createToolbar(terminal: Terminal): { dispose: () => void } {
  const container = document.getElementById('vibe-app');
  if (!container) return { dispose: () => {} };

  // ── Wrapper ──────────────────────────────────────────────
  const wrapper = document.createElement('div');
  wrapper.id = 'vibe-toolbar';

  // ── Toggle tab ───────────────────────────────────────────
  const toggle = document.createElement('button');
  toggle.className = 'vibe-toolbar-toggle';
  toggle.innerHTML = '⌨';
  toggle.title = 'Toggle keyboard toolbar';
  toggle.addEventListener('click', () => {
    wrapper.classList.toggle('vibe-toolbar-collapsed');
  });

  // ── Button rows ──────────────────────────────────────────
  const rows: HTMLDivElement[] = [];
  const maxRow = Math.max(...BUTTONS.map((b) => b.row ?? 0));

  for (let r = 0; r <= maxRow; r++) {
    const row = document.createElement('div');
    row.className = 'vibe-toolbar-row';
    rows.push(row);
    wrapper.appendChild(row);
  }

  // Track Ctrl latch
  let ctrlLatched = false;

  BUTTONS.forEach((btn) => {
    const el = document.createElement('button');
    el.textContent = btn.label;
    el.className = 'vibe-toolbar-btn';
    if (btn.class) {
      btn.class.split(' ').forEach((c) => el.classList.add(`vibe-toolbar-btn--${c}`));
    }

    el.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      e.stopPropagation();

      if (btn.sequence === '__CTRL__') {
        // Toggle Ctrl latch
        ctrlLatched = !ctrlLatched;
        el.classList.toggle('vibe-toolbar-btn--active', ctrlLatched);
        return;
      }

      let seq = btn.sequence;

      // If Ctrl is latched, convert the character to its control equivalent
      if (ctrlLatched && seq.length === 1) {
        const code = seq.charCodeAt(0);
        // Ctrl+A-Z → \x01-\x1A, other ctrl combos
        if (code >= 0x40 && code <= 0x5f) {
          seq = String.fromCharCode(code - 0x40);
        } else if (code >= 0x61 && code <= 0x7a) {
          seq = String.fromCharCode(code - 0x60);
        }
        // Release Ctrl latch after one use
        ctrlLatched = false;
        const ctrlBtn = wrapper.querySelector('.vibe-toolbar-btn--mod') as HTMLButtonElement;
        if (ctrlBtn) ctrlBtn.classList.remove('vibe-toolbar-btn--active');
      }

      terminal.write(seq);
    });

    const rowIdx = btn.row ?? 0;
    rows[rowIdx].appendChild(el);
  });

  // ── Assemble ─────────────────────────────────────────────
  wrapper.appendChild(toggle);
  container.appendChild(wrapper);

  return {
    dispose: () => {
      wrapper.remove();
    },
  };
}
