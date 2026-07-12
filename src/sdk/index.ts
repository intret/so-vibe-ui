import { VibeUI } from './vibe-ui.js';
import type { VibeUIConfig } from './types.js';

export { VibeUI };
export type { VibeUIConfig, VibeMessage } from './types.js';

/**
 * Shorthand factory to create a VibeUI instance.
 *
 * @example
 * ```ts
 * import { createVibeUI } from 'so-vibe-ui';
 * const vibe = createVibeUI({ url: 'http://localhost:3000' });
 * // Press Alt+V to toggle, or:
 * vibe.toggle();
 * ```
 */
export function createVibeUI(config?: VibeUIConfig): VibeUI {
  return new VibeUI(config);
}
