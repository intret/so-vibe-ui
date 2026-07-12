export const DEFAULT_URL = 'http://localhost:3000';
export const DEFAULT_SHORTCUT = 'Alt+V';
export const DEFAULT_Z_INDEX = 99999;
export const DEFAULT_WIDTH = '70%';
export const DEFAULT_HEIGHT = '80%';
export const DEFAULT_TRIGGER_BUTTON = true;
export const DEFAULT_TRIGGER_POSITION = 'bottom-right';

export const CSS_PREFIX = 'so-vibe-ui';

export const CLASSES = {
  backdrop: `${CSS_PREFIX}-backdrop`,
  panel: `${CSS_PREFIX}-panel`,
  titlebar: `${CSS_PREFIX}-titlebar`,
  title: `${CSS_PREFIX}-title`,
  closeBtn: `${CSS_PREFIX}-close-btn`,
  iframe: `${CSS_PREFIX}-iframe`,
  resizeHandle: `${CSS_PREFIX}-resize-handle`,
  hidden: `${CSS_PREFIX}-hidden`,
  trigger: `${CSS_PREFIX}-trigger`,
  triggerActive: `${CSS_PREFIX}-trigger-active`,
} as const;

export const STYLE_ID = `${CSS_PREFIX}-styles`;
