export type TriggerPosition = 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';

export interface VibeUIConfig {
  /** URL to load in the iframe (your vibe-ui server) */
  url?: string;

  /** Keyboard shortcut to toggle the panel. Set to null to disable. */
  shortcutKey?: string | null;

  /** Panel width (CSS value, e.g. "70%", "900px") */
  width?: string;

  /** Panel height (CSS value, e.g. "80%", "600px") */
  height?: string;

  /** z-index of the overlay */
  zIndex?: number;

  /** Enable CSS transitions */
  animate?: boolean;

  /** Iframe sandbox attribute */
  sandbox?: string;

  /** Skip keyboard toggle when focus is in input/textarea/contenteditable */
  ignoreWhenFocused?: boolean;

  /** Show a floating trigger button to toggle the terminal */
  triggerButton?: boolean;

  /** Position of the floating trigger button */
  triggerPosition?: TriggerPosition;

  /** Called when the panel opens */
  onOpen?: () => void;

  /** Called when the panel closes */
  onClose?: () => void;

  /** Called when the terminal is ready (WS connected) */
  onReady?: () => void;

  /** Called on errors */
  onError?: (error: Error) => void;
}

export interface VibeMessage {
  source: 'so-vibe-ui' | 'so-vibe-terminal';
  type: string;
  payload?: string;
}
