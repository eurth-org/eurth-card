// The cleaners. A profile file and a card link are both someone else's input: every value goes
// through one of these before the card uses it. Each gives back a safe value or undefined.

/** The longest SVG a card takes: the profile's own limit, 512 KB. */
export const MAX_SVG_LENGTH = 512 * 1024;

// Characters that never belong in a line of text: controls, the invisible marks that reorder
// text (which can make a name read as something else), and the byte order mark.
const UNSAFE = /[\u0000-\u001f\u007f-\u009f‎‏‪-‮⁦-⁩﻿￾￿]/g;
const LONE_SURROGATE = /[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/g;

/** One line of plain text: spaces tidied, unsafe characters gone, cut to `max` characters. */
export function text(value: unknown, max: number): string | undefined {
  if (typeof value !== 'string') return undefined;
  // Look at no more than could matter, so an absurdly long string costs nothing.
  const tidy = value
    .slice(0, max * 8 + 64)
    .replace(/\s+/g, ' ')
    .replace(UNSAFE, '')
    .replace(LONE_SURROGATE, '')
    .trim();
  if (!tidy) return undefined;
  const characters = Array.from(tidy);
  return characters.length > max ? characters.slice(0, max).join('').trim() : tidy;
}

/** A finite number within bounds. Anything else, numbers written as text included, is undefined. */
export function number(
  value: unknown,
  min: number,
  max: number,
  { integer = false }: { integer?: boolean } = {},
): number | undefined {
  if (typeof value !== 'number' || !Number.isFinite(value)) return undefined;
  if (value < min || value > max) return undefined;
  if (integer && !Number.isInteger(value)) return undefined;
  return value;
}

/** A colour as a six-digit hex code, lower case. */
export function colour(value: unknown): string | undefined {
  if (typeof value !== 'string' || !/^#[0-9A-Fa-f]{6}$/.test(value)) return undefined;
  return value.toLowerCase();
}

/** A plain object (not a list, not null). */
export function record(value: unknown): Record<string, unknown> | undefined {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return undefined;
  return value as Record<string, unknown>;
}

/** A list, cut to `max` items, each cleaned; items that don't clean are dropped. */
export function list<T>(value: unknown, max: number, each: (item: unknown) => T | undefined): T[] {
  if (!Array.isArray(value)) return [];
  const out: T[] = [];
  for (const item of value) {
    if (out.length >= max) break;
    const cleaned = each(item);
    if (cleaned !== undefined) out.push(cleaned);
  }
  return out;
}

const SVG_START = /^(?:<\?xml[^>]*\?>\s*)?(?:<!--[^]*?-->\s*)*<svg(?=[\s>/])/i;

/**
 * SVG text that is safe to hand to an image element. The card never puts it in a page as markup,
 * so scripts inside can't run; this only turns away what an image couldn't draw or what could
 * swell when read (document types and entities).
 */
export function svg(value: unknown): string | undefined {
  if (typeof value !== 'string' || value.length > MAX_SVG_LENGTH) return undefined;
  const trimmed = value.replace(/^﻿/, '').trim();
  if (!SVG_START.test(trimmed)) return undefined;
  if (/<!DOCTYPE|<!ENTITY/i.test(trimmed)) return undefined;
  // An image element needs the namespace; hand-written SVG often leaves it out.
  const open = trimmed.search(/<svg(?=[\s>/])/i);
  const close = trimmed.indexOf('>', open);
  if (close < 0) return undefined;
  const tag = trimmed.slice(open, close);
  if (/\sxmlns\s*=/.test(tag)) return trimmed;
  return `${trimmed.slice(0, open + 4)} xmlns="http://www.w3.org/2000/svg"${trimmed.slice(open + 4)}`;
}

/** Width divided by height, from an SVG's viewBox or its width and height. */
export function svgRatio(svgText: string): number | undefined {
  const open = svgText.search(/<svg(?=[\s>/])/i);
  const close = svgText.indexOf('>', open);
  if (open < 0 || close < 0) return undefined;
  const tag = svgText.slice(open, close);
  const box = /\sviewBox\s*=\s*(?:"([^"]*)"|'([^']*)')/.exec(tag);
  if (box) {
    const parts = (box[1] ?? box[2] ?? '').trim().split(/[\s,]+/).map(Number);
    const fromBox = parts.length === 4 ? ratio(parts[2], parts[3]) : undefined;
    if (fromBox) return fromBox;
  }
  return ratio(attribute(tag, 'width'), attribute(tag, 'height'));
}

function attribute(tag: string, name: string): number | undefined {
  const found = new RegExp(`\\s${name}\\s*=\\s*["']\\s*([\\d.]+)(?:px)?\\s*["']`).exec(tag);
  return found ? Number(found[1]) : undefined;
}

/** A usable width-to-height ratio, kept between a tall banner and a long pennant. */
export function ratio(width: number | undefined, height: number | undefined): number | undefined {
  if (!width || !height || !Number.isFinite(width) || !Number.isFinite(height)) return undefined;
  if (width <= 0 || height <= 0) return undefined;
  return Math.min(5, Math.max(0.2, width / height));
}
