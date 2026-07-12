import { CLASSES } from './constants.js';
import type { TriggerPosition } from './types.js';

/**
 * CSS-in-JS for the floating panel + trigger button.
 * Design: OLED Dark Mode — Slate palette, green accent, JetBrains Mono + IBM Plex Sans.
 */
export function getStyles(
  zIndex: number,
  width: string,
  height: string,
  animate: boolean,
  showTrigger: boolean,
  triggerPosition: TriggerPosition,
): string {
  const transition = animate
    ? 'opacity 0.2s ease-out, transform 0.2s ease-out'
    : 'none';

  const panelCSS = `
.${CLASSES.backdrop} {
  position: fixed;
  inset: 0;
  z-index: ${zIndex};
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: ${transition};
  opacity: 1;
  pointer-events: all;
}
.${CLASSES.backdrop}.${CLASSES.hidden} {
  opacity: 0;
  pointer-events: none;
}
.${CLASSES.backdrop}.${CLASSES.hidden} .${CLASSES.panel} {
  transform: scale(0.96);
  opacity: 0;
}
.${CLASSES.panel} {
  position: relative;
  width: ${width};
  height: ${height};
  min-width: 400px;
  min-height: 300px;
  background: #0F172A;
  border-radius: 12px;
  box-shadow:
    0 0 0 1px rgba(51, 65, 85, 0.6),
    0 4px 24px rgba(0, 0, 0, 0.5),
    0 16px 48px rgba(0, 0, 0, 0.4);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  transition: transform 0.2s ease-out, opacity 0.2s ease-out;
  transform: scale(1);
  opacity: 1;
}
.${CLASSES.titlebar} {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 40px;
  padding: 0 14px;
  background: #1E293B;
  border-bottom: 1px solid #334155;
  cursor: move;
  user-select: none;
  flex-shrink: 0;
}
.${CLASSES.title} {
  color: #F8FAFC;
  font-family: 'IBM Plex Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  font-size: 13px;
  font-weight: 500;
  letter-spacing: 0.02em;
}
.${CLASSES.closeBtn} {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: #94A3B8;
  font-size: 18px;
  line-height: 1;
  cursor: pointer;
  transition: background 0.15s ease, color 0.15s ease;
  flex-shrink: 0;
}
.${CLASSES.closeBtn}:hover {
  background: rgba(239, 68, 68, 0.15);
  color: #EF4444;
}
.${CLASSES.iframe} {
  flex: 1;
  border: none;
  width: 100%;
  height: 100%;
  background: #0F172A;
}
.${CLASSES.resizeHandle} {
  position: absolute;
  bottom: 0;
  right: 0;
  width: 20px;
  height: 20px;
  cursor: nwse-resize;
  background: linear-gradient(135deg, transparent 50%, rgba(148, 163, 184, 0.2) 50%);
  border-radius: 0 0 12px 0;
  transition: background 0.15s ease;
}
.${CLASSES.resizeHandle}:hover {
  background: linear-gradient(135deg, transparent 50%, rgba(148, 163, 184, 0.4) 50%);
}

/* Reduced motion */
@media (prefers-reduced-motion: reduce) {
  .${CLASSES.backdrop},
  .${CLASSES.panel},
  .${CLASSES.trigger} {
    transition: none !important;
  }
  .${CLASSES.backdrop}.${CLASSES.hidden} .${CLASSES.panel} {
    transform: none;
  }
}`;

  const posMap: Record<TriggerPosition, string> = {
    'bottom-right': 'bottom: 24px; right: 24px;',
    'bottom-left': 'bottom: 24px; left: 24px;',
    'top-right': 'top: 24px; right: 24px;',
    'top-left': 'top: 24px; left: 24px;',
  };

  const triggerCSS = showTrigger ? `
.${CLASSES.trigger} {
  position: fixed;
  ${posMap[triggerPosition]}
  z-index: ${zIndex - 1};
  width: 48px;
  height: 48px;
  border-radius: 50%;
  border: none;
  background: #1E293B;
  color: #22C55E;
  font-size: 18px;
  font-weight: 700;
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
  cursor: grab;
  box-shadow:
    0 0 0 1px rgba(34, 197, 94, 0.3),
    0 4px 16px rgba(34, 197, 94, 0.2),
    0 0 32px rgba(34, 197, 94, 0.08);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.2s ease, box-shadow 0.2s ease, background 0.2s ease, color 0.2s ease;
  user-select: none;
  margin: 0;
}
.${CLASSES.trigger}:hover {
  transform: scale(1.1);
  background: #22C55E;
  color: #0F172A;
  box-shadow:
    0 0 0 1px rgba(34, 197, 94, 0.5),
    0 6px 24px rgba(34, 197, 94, 0.35),
    0 0 48px rgba(34, 197, 94, 0.15);
}
.${CLASSES.trigger}:active {
  cursor: grabbing;
  transform: scale(0.95);
}
.${CLASSES.trigger}.vibe-ui-trigger-dragging {
  transition: none;
  transform: none !important;
  cursor: grabbing;
}
.${CLASSES.triggerActive} {
  background: #22C55E !important;
  color: #0F172A !important;
  box-shadow:
    0 0 0 1px rgba(34, 197, 94, 0.5),
    0 4px 16px rgba(34, 197, 94, 0.35),
    0 0 32px rgba(34, 197, 94, 0.12) !important;
}
.${CLASSES.triggerActive}:hover {
  background: #EF4444 !important;
  color: #FFFFFF !important;
  box-shadow:
    0 0 0 1px rgba(239, 68, 68, 0.5),
    0 6px 24px rgba(239, 68, 68, 0.35),
    0 0 48px rgba(239, 68, 68, 0.15) !important;
}` : '';

  return (panelCSS + triggerCSS).trim();
}
