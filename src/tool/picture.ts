// The card as a picture file, made in the browser at its exact size. The card itself is drawn
// from one SVG; the flag and the arms are laid over it as pictures of their own, because some
// browsers leave out pictures nested inside an SVG when it is painted on a canvas. Nothing a
// profile carries is ever put into the page as markup: every SVG here goes through an image.

import * as clean from '../card/clean.ts';
import type { Placed, PictureBox } from '../card/layout.ts';
import type { CardData } from '../card/model.ts';
import { render, type Theme } from '../card/render.ts';

export type PictureType = 'image/png' | 'image/webp';

/** An SVG with a stated size, which some browsers need before they will paint it on a canvas. */
function sized(svg: string, width: number, height: number): string {
  const open = svg.search(/<svg(?=[\s>/])/i);
  const close = svg.indexOf('>', open);
  if (open < 0 || close < 0) return svg;
  const tag = svg.slice(open, close);
  if (/\swidth\s*=/.test(tag) && /\sheight\s*=/.test(tag)) return svg;
  const bare = tag.replace(/\s(?:width|height)\s*=\s*(?:"[^"]*"|'[^']*')/g, '');
  return `${svg.slice(0, open)}${bare} width="${Math.round(width)}" height="${Math.round(height)}"${svg.slice(close)}`;
}

async function image(svg: string): Promise<HTMLImageElement> {
  const address = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
  try {
    const picture = new Image();
    picture.decoding = 'async';
    picture.src = address;
    await picture.decode();
    return picture;
  } finally {
    URL.revokeObjectURL(address);
  }
}

/** Where a picture sits inside its box, whole and centred, whatever its own proportions. */
function contain(box: PictureBox, ratio: number): [number, number, number, number] {
  const width = Math.min(box.w, box.h * ratio);
  const height = width / ratio;
  return [box.x + (box.w - width) / 2, box.y + (box.h - height) / 2, width, height];
}

/** The card as a PNG or WebP of exactly the format's size. */
export async function cardPicture(placed: Placed, data: CardData, theme: Theme, type: PictureType = 'image/png'): Promise<Blob> {
  const canvas = document.createElement('canvas');
  canvas.width = placed.width;
  canvas.height = placed.height;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('This browser has no canvas to draw on.');

  context.drawImage(await image(render(placed, data, theme, { pictures: false })), 0, 0, placed.width, placed.height);
  for (const box of placed.boxes) {
    if (box.kind !== 'picture') continue;
    const source = box.which === 'flag' ? data.flag : data.arms;
    if (!source) continue;
    const ratio = clean.svgRatio(source.svg) ?? source.ratio;
    const [x, y, width, height] = contain(box, ratio);
    // Drawn at twice its size on the card, so the browser has detail to spare when it scales.
    context.drawImage(await image(sized(source.svg, width * 2, height * 2)), x, y, width, height);
    if (box.which === 'flag') {
      context.strokeStyle = theme.line;
      context.lineWidth = 1;
      context.strokeRect(box.x + 0.5, box.y + 0.5, box.w - 1, box.h - 1);
    }
  }

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('The picture could not be made.'))), type, 0.92);
  });
}

/** "png" or "webp", from what the browser actually made: not every browser writes WebP. */
export function extension(blob: Blob): string {
  return blob.type === 'image/webp' ? 'webp' : 'png';
}
