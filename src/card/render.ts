// Drawing: the placed boxes as one SVG string. Every piece of text is escaped, and the flag and
// arms go in as images by data address, never as markup, so nothing a profile carries can run.

import { describe, title } from './describe.ts';
import type { Box, Placed, SeatsBox, SwatchBox, TextBox } from './layout.ts';
import type { CardData } from './model.ts';
import type { SeatChart } from './seats.ts';

/** The card's colours and fonts. The site passes @eurth/style's tokens; the engine has none of its own. */
export interface Theme {
  /** The card itself. */
  ground: string;
  text: string;
  muted: string;
  /** Thin lines and outlines. */
  line: string;
  /** The edge of a complete nation's card. */
  gold: string;
  sans: string;
  mono: string;
}

export interface RenderOptions {
  /**
   * False leaves the flag and arms out, for drawing them separately (on a canvas, or as their
   * own image elements over the card). Default true.
   */
  pictures?: boolean;
}

/** Text made safe for SVG, as content or inside a double-quoted attribute. */
export function escape(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** An SVG as the address of an image. */
export function dataAddress(svg: string): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

const n = (value: number): string => String(Math.round(value * 100) / 100);

function channel(hex: string, at: number): number {
  return parseInt(hex.slice(at, at + 2), 16);
}

/** A colour between two hex colours: 0 gives the first, 1 the second. */
export function mix(from: string, to: string, amount: number): string {
  const part = (at: number): string =>
    Math.round(channel(from, at) + (channel(to, at) - channel(from, at)) * amount)
      .toString(16)
      .padStart(2, '0');
  return `#${part(1)}${part(3)}${part(5)}`;
}

/**
 * A fill for every group of a chart. Parties without a colour of their own get greys between
 * the text and the ground, each a clear step lighter or darker than the last; seats no party
 * holds are hollow.
 */
export function groupFills(chart: SeatChart, theme: Theme): string[] {
  const plain = chart.groups.filter((group) => !group.colour && !group.unassigned).length;
  let step = 0;
  return chart.groups.map((group) => {
    if (group.unassigned) return theme.ground;
    if (group.colour) return group.colour;
    const amount = plain <= 1 ? 0.3 : 0.08 + (0.62 * step) / (plain - 1);
    step++;
    return mix(theme.text, theme.ground, amount);
  });
}

function drawText(box: TextBox, theme: Theme): string {
  const x = box.align === 'start' ? box.x : box.align === 'middle' ? box.x + box.w / 2 : box.x + box.w;
  const attributes = [
    `font-family="${escape(box.mono ? theme.mono : theme.sans)}"`,
    `font-size="${n(box.size)}"`,
    `font-weight="${box.weight}"`,
    `fill="${box.tone === 'muted' ? theme.muted : theme.text}"`,
    box.align === 'start' ? '' : `text-anchor="${box.align}"`,
    box.italic ? 'font-style="italic"' : '',
    box.tracking ? `letter-spacing="${n(box.tracking * box.size)}"` : '',
  ].filter(Boolean);
  // The baseline sits where a line of this size is centred in its line height.
  const first = box.y + box.lineHeight / 2 + box.size * 0.35;
  return box.lines
    .map((line, index) => `<text x="${n(x)}" y="${n(first + index * box.lineHeight)}" ${attributes.join(' ')}>${escape(line)}</text>`)
    .join('');
}

function drawSwatch(box: SwatchBox, fills: string[], theme: Theme): string {
  const fill = typeof box.fill === 'string' ? box.fill : (fills[box.fill.group] ?? theme.muted);
  const stroke = `stroke="${theme.line}" stroke-width="1"`;
  if (box.round) {
    return `<circle cx="${n(box.x + box.w / 2)}" cy="${n(box.y + box.h / 2)}" r="${n(box.w / 2 - 0.5)}" fill="${escape(fill)}" ${stroke}/>`;
  }
  return `<rect x="${n(box.x + 0.5)}" y="${n(box.y + 0.5)}" width="${n(box.w - 1)}" height="${n(box.h - 1)}" rx="2" fill="${escape(fill)}" ${stroke}/>`;
}

function drawBox(box: Box, data: CardData, theme: Theme, fills: string[], withPictures: boolean): string {
  switch (box.kind) {
    case 'text':
      return drawText(box, theme);
    case 'picture': {
      const source = box.which === 'flag' ? data.flag : data.arms;
      if (!source || !withPictures) return '';
      const image = `<image href="${escape(dataAddress(source.svg))}" x="${n(box.x)}" y="${n(box.y)}" width="${n(box.w)}" height="${n(box.h)}" preserveAspectRatio="xMidYMid meet"/>`;
      // A hairline round the flag, so a white flag keeps its edge on a white card.
      const edge =
        box.which === 'flag'
          ? `<rect x="${n(box.x + 0.5)}" y="${n(box.y + 0.5)}" width="${n(box.w - 1)}" height="${n(box.h - 1)}" fill="none" stroke="${theme.line}" stroke-width="1"/>`
          : '';
      return image + edge;
    }
    case 'seats': {
      const r = box.chart.radius * box.w;
      const width = Math.max(0.75, Math.min(1.5, r * 0.18));
      const dots = box.chart.dots
        .map((dot) => `<circle cx="${n(box.x + dot.x * box.w)}" cy="${n(box.y + dot.y * box.w)}" r="${n(r - width / 2)}" fill="${escape(fills[dot.group] ?? theme.muted)}"/>`)
        .join('');
      return `<g stroke="${theme.line}" stroke-width="${n(width)}">${dots}</g>`;
    }
    case 'swatch':
      return drawSwatch(box, fills, theme);
    case 'rule':
      return `<line x1="${n(box.x1)}" y1="${n(box.y1)}" x2="${n(box.x2)}" y2="${n(box.y2)}" stroke="${theme.line}" stroke-width="1.5"/>`;
    case 'mark':
      return `<circle cx="${n(box.x)}" cy="${n(box.y)}" r="${n(box.r)}" fill="${theme.text}"/>`;
  }
}

/** The card as an SVG document, with its name as the title and its description for those who can't see it. */
export function render(placed: Placed, data: CardData, theme: Theme, options: RenderOptions = {}): string {
  const { width, height, frame } = placed;
  const withPictures = options.pictures ?? true;
  const seats = placed.boxes.find((box): box is SeatsBox => box.kind === 'seats');
  const fills = seats ? groupFills(seats.chart, theme) : [];
  const parts = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="card-title card-desc">`,
    `<title id="card-title">${escape(title(data))}</title>`,
    `<desc id="card-desc">${escape(describe(data))}</desc>`,
    `<rect width="${width}" height="${height}" fill="${theme.ground}"/>`,
  ];
  if (placed.gold) {
    // Two lines, not one: the edge is told by its shape as well as its colour.
    const inner = frame + Math.max(4, Math.round(frame * 0.28));
    parts.push(
      `<rect x="${frame}" y="${frame}" width="${width - frame * 2}" height="${height - frame * 2}" fill="none" stroke="${theme.gold}" stroke-width="3"/>`,
      `<rect x="${inner}" y="${inner}" width="${width - inner * 2}" height="${height - inner * 2}" fill="none" stroke="${theme.gold}" stroke-width="1"/>`,
    );
  }
  for (const box of placed.boxes) parts.push(drawBox(box, data, theme, fills, withPictures));
  parts.push('</svg>');
  return parts.join('');
}
