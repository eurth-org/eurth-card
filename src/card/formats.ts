// The sizes a card comes in, the three layouts and the two themes.

export const FORMATS = [
  { id: 'preview', name: 'Link preview', width: 1200, height: 630 },
  { id: 'square', name: 'Square', width: 1080, height: 1080 },
  { id: 'portrait', name: 'Portrait', width: 1080, height: 1350 },
  { id: 'story', name: 'Story', width: 1080, height: 1920 },
  { id: 'pin', name: 'Pin', width: 1000, height: 1500 },
  { id: 'wide', name: 'Wide', width: 1600, height: 900 },
] as const;

export type Format = (typeof FORMATS)[number];
export type FormatId = Format['id'];

export const LAYOUTS = [
  { id: 'classic', name: 'Classic', about: 'Flag, arms and name across the top, the facts in a grid.' },
  { id: 'banner', name: 'Banner', about: 'The flag large, the facts beside or beneath it.' },
  { id: 'ledger', name: 'Ledger', about: 'One column of facts, row by row, like a page of a passport.' },
] as const;

export type LayoutId = (typeof LAYOUTS)[number]['id'];

export const THEMES = [
  { id: 'night', name: 'Night' },
  { id: 'light', name: 'Light' },
] as const;

export type ThemeId = (typeof THEMES)[number]['id'];

export const DEFAULT_FORMAT: FormatId = 'preview';
export const DEFAULT_LAYOUT: LayoutId = 'classic';
export const DEFAULT_THEME: ThemeId = 'night';

/** A format by its id; the link preview for an id it doesn't know. */
export function formatOf(id: unknown): Format {
  return FORMATS.find((format) => format.id === id) ?? FORMATS[0];
}

/** A layout id, or the default for anything else. */
export function layoutOf(id: unknown): LayoutId {
  return LAYOUTS.find((layout) => layout.id === id)?.id ?? DEFAULT_LAYOUT;
}

/** A theme id, or the default for anything else. */
export function themeOf(id: unknown): ThemeId {
  return THEMES.find((theme) => theme.id === id)?.id ?? DEFAULT_THEME;
}
