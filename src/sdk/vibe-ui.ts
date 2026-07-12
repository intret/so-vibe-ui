import type { VibeUIConfig, VibeMessage } from './types.js';
import {
  DEFAULT_URL,
  DEFAULT_SHORTCUT,
  DEFAULT_Z_INDEX,
  DEFAULT_WIDTH,
  DEFAULT_HEIGHT,
  DEFAULT_TRIGGER_BUTTON,
  DEFAULT_TRIGGER_POSITION,
  CLASSES,
  STYLE_ID,
} from './constants.js';
import { getStyles } from './styles.js';

/** Global singleton tracker — prevents multiple instances */
let currentInstance: VibeUI | null = null;

export class VibeUI {
  private config: Required<VibeUIConfig>;
  private backdrop: HTMLDivElement | null = null;
  private panel: HTMLDivElement | null = null;
  private titlebar: HTMLDivElement | null = null;
  private iframe: HTMLIFrameElement | null = null;
  private resizeHandle: HTMLDivElement | null = null;
  private closeBtn: HTMLButtonElement | null = null;
  private titleEl: HTMLSpanElement | null = null;
  private trigger: HTMLButtonElement | null = null;
  private sessionToken: string | null = null;
  private isOpen = false;
  private boundKeydown: ((e: KeyboardEvent) => void) | null = null;
  private boundMessage: ((e: MessageEvent) => void) | null = null;
  private boundWindowResize: (() => void) | null = null;
  private boundDragMouseMove: ((e: MouseEvent) => void) | null = null;
  private boundDragMouseUp: ((e: MouseEvent) => void) | null = null;
  private boundResizeMouseMove: ((e: MouseEvent) => void) | null = null;
  private boundResizeMouseUp: ((e: MouseEvent) => void) | null = null;
  private dragState: { startX: number; startY: number; left: number; top: number } | null = null;
  private resizeState: { startX: number; startY: number; width: number; height: number } | null = null;

  constructor(userConfig: VibeUIConfig = {}) {
    // Destroy previous instance if any (singleton)
    if (currentInstance) {
      currentInstance.destroy();
    }

    // Merge config with defaults
    this.config = {
      url: userConfig.url ?? DEFAULT_URL,
      shortcutKey: userConfig.shortcutKey !== undefined ? userConfig.shortcutKey : DEFAULT_SHORTCUT,
      width: userConfig.width ?? DEFAULT_WIDTH,
      height: userConfig.height ?? DEFAULT_HEIGHT,
      zIndex: userConfig.zIndex ?? DEFAULT_Z_INDEX,
      animate: userConfig.animate ?? true,
      sandbox: userConfig.sandbox ?? 'allow-scripts allow-forms allow-same-origin',
      ignoreWhenFocused: userConfig.ignoreWhenFocused ?? true,
      triggerButton: userConfig.triggerButton ?? DEFAULT_TRIGGER_BUTTON,
      triggerPosition: userConfig.triggerPosition ?? DEFAULT_TRIGGER_POSITION,
      onOpen: userConfig.onOpen ?? (() => {}),
      onClose: userConfig.onClose ?? (() => {}),
      onReady: userConfig.onReady ?? (() => {}),
      onError: userConfig.onError ?? (() => {}),
    };

    // Restore session token from sessionStorage for reconnection
    const url = this.config.url;
    const storedToken = this.getStoredSession(url);
    if (storedToken) {
      this.sessionToken = storedToken;
    }

    this.injectStyles();
    this.createOverlay();
    this.createTrigger();
    this.bindKeyboard();
    this.bindMessage();

    currentInstance = this;
  }

  /** Open the panel */
  open(): void {
    if (!this.backdrop || this.isOpen) return;
    this.backdrop.classList.remove(CLASSES.hidden);
    this.isOpen = true;
    this.trigger?.classList.add(CLASSES.triggerActive);
    this.iframe?.focus();
    this.config.onOpen();
  }

  /** Close the panel */
  close(): void {
    if (!this.backdrop || !this.isOpen) return;
    this.backdrop.classList.add(CLASSES.hidden);
    this.isOpen = false;
    this.trigger?.classList.remove(CLASSES.triggerActive);
    this.config.onClose();
  }

  /** Toggle panel visibility */
  toggle(): void {
    if (this.isOpen) {
      this.close();
    } else {
      this.open();
    }
  }

  /** Send a command to the terminal (via postMessage) */
  send(data: string): void {
    this.postMessage({ source: 'so-vibe-ui', type: 'command', payload: data });
  }

  /** Fully remove the overlay and all listeners */
  destroy(): void {
    // Remove keyboard listener
    if (this.boundKeydown) {
      document.removeEventListener('keydown', this.boundKeydown);
      this.boundKeydown = null;
    }

    // Remove message listener
    if (this.boundMessage) {
      window.removeEventListener('message', this.boundMessage);
      this.boundMessage = null;
    }

    // Remove window resize listener
    if (this.boundWindowResize) {
      window.removeEventListener('resize', this.boundWindowResize);
      this.boundWindowResize = null;
    }

    // Remove drag/resize listeners
    this.cleanupDragListeners();
    this.cleanupResizeListeners();
    this.cleanupTriggerDragListeners();

    // Remove DOM elements
    if (this.backdrop && this.backdrop.parentNode) {
      this.backdrop.parentNode.removeChild(this.backdrop);
    }
    if (this.trigger && this.trigger.parentNode) {
      this.trigger.parentNode.removeChild(this.trigger);
    }

    // Remove style tag
    const styleTag = document.getElementById(STYLE_ID);
    if (styleTag && styleTag.parentNode) {
      styleTag.parentNode.removeChild(styleTag);
    }

    // Clear state
    this.backdrop = null;
    this.panel = null;
    this.titlebar = null;
    this.iframe = null;
    this.resizeHandle = null;
    this.closeBtn = null;
    this.titleEl = null;
    this.trigger = null;
    this.triggerDragState = null;
    this.triggerWasDragged = false;
    this.isOpen = false;

    if (currentInstance === this) {
      currentInstance = null;
    }
  }

  // ─── Private Methods ────────────────────────────────────────

  private injectStyles(): void {
    if (document.getElementById(STYLE_ID)) return;

    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = getStyles(
      this.config.zIndex,
      this.config.width,
      this.config.height,
      this.config.animate,
      this.config.triggerButton,
      this.config.triggerPosition,
    );
    document.head.appendChild(style);
  }

  private createOverlay(): void {
    // Backdrop
    const backdrop = document.createElement('div');
    backdrop.className = `${CLASSES.backdrop} ${CLASSES.hidden}`;
    backdrop.addEventListener('click', (e) => {
      // Close when clicking backdrop (not the panel itself)
      if (e.target === backdrop) {
        this.close();
      }
    });

    // Panel
    const panel = document.createElement('div');
    panel.className = CLASSES.panel;

    // Title bar (drag handle)
    const titlebar = document.createElement('div');
    titlebar.className = CLASSES.titlebar;
    titlebar.addEventListener('mousedown', this.onDragStart);

    const title = document.createElement('span');
    title.className = CLASSES.title;
    title.textContent = 'Vibe UI';
    this.titleEl = title;

    const closeBtn = document.createElement('button');
    closeBtn.className = CLASSES.closeBtn;
    closeBtn.innerHTML = '&#x00D7;'; // ×
    closeBtn.title = 'Close (Alt+V)';
    closeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.close();
    });

    titlebar.appendChild(title);
    titlebar.appendChild(closeBtn);

    // Iframe
    const iframe = document.createElement('iframe');
    iframe.className = CLASSES.iframe;
    // Build URL with session token for reconnection
    const iframeUrl = this.sessionToken
      ? `${this.config.url}?session=${encodeURIComponent(this.sessionToken)}`
      : this.config.url;
    iframe.src = iframeUrl;
    iframe.setAttribute('sandbox', this.config.sandbox);
    iframe.setAttribute('allow', 'clipboard-read; clipboard-write');

    // Error handling for iframe
    iframe.addEventListener('error', () => {
      this.config.onError(new Error(`Failed to load iframe: ${this.config.url}`));
    });

    // Resize handle
    const resizeHandle = document.createElement('div');
    resizeHandle.className = CLASSES.resizeHandle;
    resizeHandle.addEventListener('mousedown', this.onResizeStart);

    // Assemble
    panel.appendChild(titlebar);
    panel.appendChild(iframe);
    panel.appendChild(resizeHandle);
    backdrop.appendChild(panel);
    document.body.appendChild(backdrop);

    // Store refs
    this.backdrop = backdrop;
    this.panel = panel;
    this.titlebar = titlebar;
    this.iframe = iframe;
    this.resizeHandle = resizeHandle;
    this.closeBtn = closeBtn;
  }

  private triggerDragState: { startX: number; startY: number; left: number; top: number } | null = null;
  private triggerWasDragged = false;

  private createTrigger(): void {
    if (!this.config.triggerButton) return;

    const trigger = document.createElement('button');
    trigger.className = CLASSES.trigger;
    trigger.innerHTML = '&gt;_';
    trigger.title = 'Toggle Vibe UI (Alt+V)\nDrag to reposition';
    trigger.setAttribute('aria-label', 'Toggle Vibe UI terminal');

    // Restore saved position (clamped to current viewport)
    const saved = this.getTriggerPosition();
    if (saved) {
      const clamped = this.clampTriggerPosition(saved.left, saved.top);
      trigger.style.bottom = 'auto';
      trigger.style.right = 'auto';
      trigger.style.top = 'auto';
      trigger.style.left = 'auto';
      trigger.style.left = `${clamped.left}px`;
      trigger.style.top = `${clamped.top}px`;
    }

    // Reposition on window resize so the button stays visible
    this.boundWindowResize = () => this.repositionTrigger();
    window.addEventListener('resize', this.boundWindowResize);

    // Click: toggle (only if not dragged — click fires after mouseup, so we use
    // the separate triggerWasDragged flag which outlives the drag state reset)
    trigger.addEventListener('click', (e) => {
      if (this.triggerWasDragged) {
        this.triggerWasDragged = false;
        return;
      }
      e.stopPropagation();
      this.toggle();
    });

    // Drag to reposition
    trigger.addEventListener('mousedown', this.onTriggerDragStart);
    // Touch support
    trigger.addEventListener('touchstart', this.onTriggerTouchStart, { passive: false });

    document.body.appendChild(trigger);
    this.trigger = trigger;
  }

  // ─── Trigger Drag ────────────────────────────────────────────

  private DRAG_THRESHOLD = 3;

  private onTriggerDragStart = (e: MouseEvent): void => {
    if (!this.trigger) return;
    e.preventDefault();

    const rect = this.trigger.getBoundingClientRect();
    this.triggerDragState = {
      startX: e.clientX,
      startY: e.clientY,
      left: rect.left,
      top: rect.top,
    };
    this.triggerWasDragged = false;

    // Remove CSS positioning to use explicit left/top
    this.trigger.style.bottom = 'auto';
    this.trigger.style.right = 'auto';
    this.trigger.style.top = 'auto';
    this.trigger.style.left = 'auto';
    this.trigger.style.left = `${rect.left}px`;
    this.trigger.style.top = `${rect.top}px`;
    this.trigger.classList.add('so-vibe-ui-trigger-dragging');

    document.addEventListener('mousemove', this.onTriggerDragMove);
    document.addEventListener('mouseup', this.onTriggerDragEnd);
  };

  private onTriggerDragMove = (e: MouseEvent): void => {
    if (!this.trigger || !this.triggerDragState) return;

    const dx = e.clientX - this.triggerDragState.startX;
    const dy = e.clientY - this.triggerDragState.startY;

    if (Math.abs(dx) > this.DRAG_THRESHOLD || Math.abs(dy) > this.DRAG_THRESHOLD) {
      this.triggerWasDragged = true;
    }

    const newLeft = Math.max(0, Math.min(window.innerWidth - 48, this.triggerDragState.left + dx));
    const newTop = Math.max(0, Math.min(window.innerHeight - 48, this.triggerDragState.top + dy));

    this.trigger.style.left = `${newLeft}px`;
    this.trigger.style.top = `${newTop}px`;
  };

  private onTriggerDragEnd = (): void => {
    if (!this.trigger || !this.triggerDragState) return;

    this.trigger.classList.remove('so-vibe-ui-trigger-dragging');

    // Save position
    const left = parseInt(this.trigger.style.left, 10);
    const top = parseInt(this.trigger.style.top, 10);
    if (!isNaN(left) && !isNaN(top)) {
      this.saveTriggerPosition(left, top);
    }

    this.triggerDragState = null;

    document.removeEventListener('mousemove', this.onTriggerDragMove);
    document.removeEventListener('mouseup', this.onTriggerDragEnd);
  };

  // Touch support
  private onTriggerTouchStart = (e: TouchEvent): void => {
    if (!this.trigger || e.touches.length !== 1) return;
    e.preventDefault();

    const touch = e.touches[0];
    const rect = this.trigger.getBoundingClientRect();
    this.triggerDragState = {
      startX: touch.clientX,
      startY: touch.clientY,
      left: rect.left,
      top: rect.top,
    };
    this.triggerWasDragged = false;

    this.trigger.style.bottom = 'auto';
    this.trigger.style.right = 'auto';
    this.trigger.style.top = 'auto';
    this.trigger.style.left = 'auto';
    this.trigger.style.left = `${rect.left}px`;
    this.trigger.style.top = `${rect.top}px`;
    this.trigger.classList.add('so-vibe-ui-trigger-dragging');

    const onMove = (te: TouchEvent) => {
      if (!this.trigger || !this.triggerDragState) return;
      const t = te.touches[0];
      const dx = t.clientX - this.triggerDragState.startX;
      const dy = t.clientY - this.triggerDragState.startY;
      if (Math.abs(dx) > this.DRAG_THRESHOLD || Math.abs(dy) > this.DRAG_THRESHOLD) {
        this.triggerWasDragged = true;
      }
      const nl = Math.max(0, Math.min(window.innerWidth - 48, this.triggerDragState.left + dx));
      const nt = Math.max(0, Math.min(window.innerHeight - 48, this.triggerDragState.top + dy));
      this.trigger.style.left = `${nl}px`;
      this.trigger.style.top = `${nt}px`;
    };

    const onEnd = () => {
      if (!this.trigger || !this.triggerDragState) return;
      this.trigger.classList.remove('so-vibe-ui-trigger-dragging');
      const left = parseInt(this.trigger.style.left, 10);
      const top = parseInt(this.trigger.style.top, 10);
      if (!isNaN(left) && !isNaN(top)) {
        this.saveTriggerPosition(left, top);
      }
      this.triggerDragState = null;
      document.removeEventListener('touchmove', onMove);
      document.removeEventListener('touchend', onEnd);
    };

    document.addEventListener('touchmove', onMove, { passive: false });
    document.addEventListener('touchend', onEnd);
  };

  private EDGE_THRESHOLD = 60; // px — within this distance, button snaps to edge
  private TRIGGER_SIZE = 48;

  private triggerPositionKey(): string {
    return `so-vibe-ui-trigger-pos-${this.config.triggerPosition}`;
  }

  /**
   * Save position with edge anchoring info.
   * If button is within EDGE_THRESHOLD of an edge, we store the distance
   * to that edge instead of absolute pixels, so it moves with the edge on resize.
   */
  private saveTriggerPosition(left: number, top: number): void {
    try {
      const data: Record<string, number> = {};

      const distRight = window.innerWidth - left - this.TRIGGER_SIZE;
      const distBottom = window.innerHeight - top - this.TRIGGER_SIZE;

      if (left <= this.EDGE_THRESHOLD) {
        data.anchorLeft = left;
      } else if (distRight <= this.EDGE_THRESHOLD) {
        data.anchorRight = distRight;
      } else {
        data.left = left;
      }

      if (top <= this.EDGE_THRESHOLD) {
        data.anchorTop = top;
      } else if (distBottom <= this.EDGE_THRESHOLD) {
        data.anchorBottom = distBottom;
      } else {
        data.top = top;
      }

      localStorage.setItem(this.triggerPositionKey(), JSON.stringify(data));
    } catch { /* localStorage may be unavailable */ }
  }

  /**
   * Resolve stored position to absolute pixels for the current viewport size.
   */
  private getTriggerPosition(): { left: number; top: number } | null {
    try {
      const raw = localStorage.getItem(this.triggerPositionKey());
      if (!raw) return null;
      const pos = JSON.parse(raw);

      let left: number;
      if (typeof pos.anchorRight === 'number') {
        left = window.innerWidth - this.TRIGGER_SIZE - pos.anchorRight;
      } else if (typeof pos.anchorLeft === 'number') {
        left = pos.anchorLeft;
      } else if (typeof pos.left === 'number') {
        left = pos.left;
      } else {
        return null;
      }

      let top: number;
      if (typeof pos.anchorBottom === 'number') {
        top = window.innerHeight - this.TRIGGER_SIZE - pos.anchorBottom;
      } else if (typeof pos.anchorTop === 'number') {
        top = pos.anchorTop;
      } else if (typeof pos.top === 'number') {
        top = pos.top;
      } else {
        return null;
      }

      return this.clampTriggerPosition(left, top);
    } catch { return null; }
  }

  private clampTriggerPosition(left: number, top: number): { left: number; top: number } {
    const margin = 8;
    return {
      left: Math.max(margin, Math.min(window.innerWidth - this.TRIGGER_SIZE - margin, left)),
      top: Math.max(margin, Math.min(window.innerHeight - this.TRIGGER_SIZE - margin, top)),
    };
  }

  /**
   * On window resize: re-resolve the position from stored edge anchors,
   * so the button moves with its edge.
   */
  private repositionTrigger(): void {
    if (!this.trigger) return;

    const saved = this.getTriggerPosition();
    if (!saved) return;

    const currentLeft = parseInt(this.trigger.style.left, 10);
    const currentTop = parseInt(this.trigger.style.top, 10);

    // Only reposition if button has been dragged (has inline styles)
    if (isNaN(currentLeft) || isNaN(currentTop)) return;

    if (saved.left !== currentLeft || saved.top !== currentTop) {
      this.trigger.style.left = `${saved.left}px`;
      this.trigger.style.top = `${saved.top}px`;
    }
  }

  // ─── Drag ───────────────────────────────────────────────────

  private onDragStart = (e: MouseEvent): void => {
    if (!this.panel) return;
    e.preventDefault();

    const rect = this.panel.getBoundingClientRect();
    this.dragState = {
      startX: e.clientX,
      startY: e.clientY,
      left: rect.left,
      top: rect.top,
    };

    // Remove centering during drag
    if (this.backdrop) {
      this.backdrop.style.alignItems = 'flex-start';
      this.backdrop.style.justifyContent = 'flex-start';
    }
    this.panel.style.position = 'fixed';
    this.panel.style.left = `${rect.left}px`;
    this.panel.style.top = `${rect.top}px`;
    this.panel.style.margin = '0';
    this.panel.style.transform = 'none';

    this.boundDragMouseMove = this.onDragMove.bind(this);
    this.boundDragMouseUp = this.onDragEnd.bind(this);
    document.addEventListener('mousemove', this.boundDragMouseMove);
    document.addEventListener('mouseup', this.boundDragMouseUp);
  };

  private onDragMove = (e: MouseEvent): void => {
    if (!this.panel || !this.dragState) return;

    const dx = e.clientX - this.dragState.startX;
    const dy = e.clientY - this.dragState.startY;

    const newLeft = this.dragState.left + dx;
    const newTop = Math.max(0, this.dragState.top + dy);

    this.panel.style.left = `${newLeft}px`;
    this.panel.style.top = `${newTop}px`;
  };

  private onDragEnd = (): void => {
    this.dragState = null;
    this.cleanupDragListeners();
  };

  private cleanupDragListeners(): void {
    if (this.boundDragMouseMove) {
      document.removeEventListener('mousemove', this.boundDragMouseMove);
      this.boundDragMouseMove = null;
    }
    if (this.boundDragMouseUp) {
      document.removeEventListener('mouseup', this.boundDragMouseUp);
      this.boundDragMouseUp = null;
    }
  }

  // ─── Resize ─────────────────────────────────────────────────

  private onResizeStart = (e: MouseEvent): void => {
    if (!this.panel) return;
    e.preventDefault();
    e.stopPropagation();

    const rect = this.panel.getBoundingClientRect();
    this.resizeState = {
      startX: e.clientX,
      startY: e.clientY,
      width: rect.width,
      height: rect.height,
    };

    this.boundResizeMouseMove = this.onResizeMove.bind(this);
    this.boundResizeMouseUp = this.onResizeEnd.bind(this);
    document.addEventListener('mousemove', this.boundResizeMouseMove);
    document.addEventListener('mouseup', this.boundResizeMouseUp);
  };

  private onResizeMove = (e: MouseEvent): void => {
    if (!this.panel || !this.resizeState) return;

    const dx = e.clientX - this.resizeState.startX;
    const dy = e.clientY - this.resizeState.startY;

    const newWidth = Math.max(400, this.resizeState.width + dx);
    const newHeight = Math.max(300, this.resizeState.height + dy);

    this.panel.style.width = `${newWidth}px`;
    this.panel.style.height = `${newHeight}px`;
  };

  private onResizeEnd = (): void => {
    this.resizeState = null;
    this.cleanupResizeListeners();
  };

  private cleanupResizeListeners(): void {
    if (this.boundResizeMouseMove) {
      document.removeEventListener('mousemove', this.boundResizeMouseMove);
      this.boundResizeMouseMove = null;
    }
    if (this.boundResizeMouseUp) {
      document.removeEventListener('mouseup', this.boundResizeMouseUp);
      this.boundResizeMouseUp = null;
    }
  }

  private cleanupTriggerDragListeners(): void {
    document.removeEventListener('mousemove', this.onTriggerDragMove);
    document.removeEventListener('mouseup', this.onTriggerDragEnd);
  }

  // ─── Keyboard ───────────────────────────────────────────────

  private bindKeyboard(): void {
    if (this.config.shortcutKey === null) return;

    this.boundKeydown = this.handleKeydown.bind(this);
    document.addEventListener('keydown', this.boundKeydown);
  }

  private handleKeydown(e: KeyboardEvent): void {
    if (!this.config.shortcutKey) return;

    // Skip if focus is in an editable element
    if (this.config.ignoreWhenFocused) {
      const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      const isEditable =
        tag === 'input' ||
        tag === 'textarea' ||
        tag === 'select' ||
        (e.target as HTMLElement)?.isContentEditable;
      if (isEditable) return;
    }

    const parsed = this.parseShortcut(this.config.shortcutKey);
    if (!parsed) return;

    const keyMatches =
      e.key.toLowerCase() === parsed.key.toLowerCase() ||
      e.code.toLowerCase() === `key${parsed.key.toLowerCase()}`;

    const modsMatch =
      e.altKey === parsed.alt &&
      e.ctrlKey === parsed.ctrl &&
      e.metaKey === parsed.meta &&
      e.shiftKey === parsed.shift;

    if (keyMatches && modsMatch) {
      e.preventDefault();
      this.toggle();
    }
  }

  private parseShortcut(shortcut: string): {
    alt: boolean;
    ctrl: boolean;
    meta: boolean;
    shift: boolean;
    key: string;
  } | null {
    const parts = shortcut.split('+');
    if (parts.length < 2) return null;

    const key = parts.pop()!;
    if (!key || key.length === 0) return null;

    const mods = {
      alt: false,
      ctrl: false,
      meta: false,
      shift: false,
    };

    for (const part of parts) {
      switch (part.toLowerCase().trim()) {
        case 'alt':
          mods.alt = true;
          break;
        case 'ctrl':
        case 'control':
          mods.ctrl = true;
          break;
        case 'meta':
        case 'cmd':
        case 'command':
          mods.meta = true;
          break;
        case 'shift':
          mods.shift = true;
          break;
      }
    }

    return { ...mods, key };
  }

  // ─── postMessage ────────────────────────────────────────────

  private bindMessage(): void {
    this.boundMessage = this.handleMessage.bind(this);
    window.addEventListener('message', this.boundMessage);
  }

  private handleMessage(event: MessageEvent): void {
    const msg: VibeMessage = event.data;
    if (!msg || msg.source !== 'so-vibe-terminal') return;

    switch (msg.type) {
      case 'ready':
        this.config.onReady();
        break;
      case 'session':
        if (msg.payload) {
          this.sessionToken = msg.payload;
          this.storeSession(this.config.url, msg.payload);
        }
        // Show session status in title bar
        if (this.titleEl) {
          const statusText = (msg as any).status === 'reconnected' ? ' ↻ Reconnected' : ' ● Connected';
          this.titleEl.textContent = `Vibe UI${statusText}`;
          // Reset to normal after 3 seconds
          setTimeout(() => {
            if (this.titleEl) {
              this.titleEl.textContent = 'Vibe UI';
            }
          }, 3000);
        }
        break;
      case 'close':
        this.close();
        break;
      case 'error':
        this.config.onError(new Error(msg.payload ?? 'Terminal error'));
        break;
    }
  }

  private postMessage(msg: VibeMessage): void {
    if (this.iframe?.contentWindow) {
      this.iframe.contentWindow.postMessage(msg, '*');
    }
  }

  // ─── Session Persistence ─────────────────────────────────────

  private sessionStorageKey(): string {
    return `so-vibe-ui-session-${this.config.url}`;
  }

  private getStoredSession(url: string): string | null {
    try {
      return sessionStorage.getItem(`so-vibe-ui-session-${url}`) || null;
    } catch {
      return null;
    }
  }

  private storeSession(url: string, token: string): void {
    try {
      sessionStorage.setItem(`so-vibe-ui-session-${url}`, token);
    } catch {
      // sessionStorage may be unavailable
    }
  }
}
