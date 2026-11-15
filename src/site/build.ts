// What the pages hand the tool, worked out when the site is built. Build time only: this
// reads @eurth/style's list of tools, which browser code must never carry.

import { resolveColors } from '@eurth/style';
import { launchedTools, ref } from '@eurth/style/build';
import tokens from '@eurth/style/tokens.json';
import type { ThemeId } from '../card/formats.ts';
import { SECTIONS, SECTION_TOOL, type SectionName } from '../card/model.ts';
import type { Theme } from '../card/render.ts';

type Tokens = Parameters<typeof resolveColors>[0];

/**
 * The card's two themes, from the suite's tokens. A picture can't use custom properties, so
 * the colours go in as plain values. The kit has no gold: caution-text stands in for the edge
 * of a complete nation's card.
 */
export function cardThemes(): Record<ThemeId, Theme> {
  const dark = resolveColors(tokens as unknown as Tokens, 'dark');
  const light = resolveColors(tokens as unknown as Tokens, 'light');
  const fonts = { sans: tokens.type.families.sans, mono: tokens.type.families.mono };
  const pick = (colors: Record<string, string>, name: string): string => {
    const value = colors[name];
    if (!value) throw new Error(`@eurth/style has no colour called ${name}`);
    return value;
  };
  return {
    night: { ground: pick(dark, 'space'), text: pick(dark, 'ink'), muted: pick(dark, 'ink-muted'), line: pick(dark, 'line-strong'), gold: pick(dark, 'caution-text'), ...fonts },
    light: { ground: pick(light, 'surface'), text: pick(light, 'ink'), muted: pick(light, 'ink-muted'), line: pick(light, 'line-strong'), gold: pick(light, 'caution-text'), ...fonts },
  };
}

export interface ToolLink {
  name: string;
  href: string;
}

/**
 * For each profile section, the tool that fills it, if that tool has launched when the site is
 * built. A tool whose door hasn't opened is simply absent: no page mentions it.
 */
export function sectionTools(host: string): Partial<Record<SectionName, ToolLink>> {
  const launched = new Map(launchedTools().map((tool) => [tool.id, tool]));
  const out: Partial<Record<SectionName, ToolLink>> = {};
  for (const section of SECTIONS) {
    const tool = launched.get(SECTION_TOOL[section]);
    if (tool) out[section] = { name: tool.name, href: ref(tool.url, host) };
  }
  return out;
}

/**
 * Wiki's address, if its door has opened when the site is built; null before. Card checks the
 * design a profile brings from Wiki against it, and reads none while there is nothing to check.
 */
export function wikiSite(): string | null {
  return launchedTools().find((tool) => tool.id === 'wiki')?.url.replace(/\/+$/, '') ?? null;
}
