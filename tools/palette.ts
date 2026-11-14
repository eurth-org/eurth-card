// Colours and fonts for looking at cards before the site exists. They are @eurth/style's token
// values, copied for the tools and tests only; the site passes the tokens themselves, and the
// engine in src/card holds no colours.

import type { Theme } from '../src/card/render.ts';
import type { ThemeId } from '../src/card/formats.ts';

const fonts = { sans: 'system-ui, Arial, sans-serif', mono: 'ui-monospace, Menlo, monospace' };

export const PALETTES: Readonly<Record<ThemeId, Theme>> = {
  // space, parchment, ink-muted, line-strong; the kit has no gold yet, so caution-text stands in.
  night: { ground: '#030303', text: '#fcf6e1', muted: '#bac1b5', line: '#798c88', gold: '#ffc673', ...fonts },
  // paper, charcoal, ink-muted, line-strong.
  light: { ground: '#ffffff', text: '#222222', muted: '#545454', line: '#646464', gold: '#7a4100', ...fonts },
};
