// The browser's own measure of a line of text, for the layout. The card is drawn in the
// device's fonts, so only the device knows how wide a line is; the engine's estimate stands in
// until the page is awake, and wherever there is no browser.

import type { Measure } from '../card/text.ts';

/** A measure that asks a canvas, or undefined where there is none to ask. */
export function browserMeasure(sans: string, mono: string): Measure | undefined {
  const context = document.createElement('canvas').getContext('2d');
  if (!context) return undefined;
  const seen = new Map<string, number>();
  return (text, { size, weight = 400, mono: isMono = false, tracking = 0 }) => {
    const font = `${weight} 100px ${isMono ? mono : sans}`;
    const key = `${font}|${text}`;
    let width = seen.get(key);
    if (width === undefined) {
      if (seen.size > 4000) seen.clear();
      context.font = font;
      width = context.measureText(text).width;
      seen.set(key, width);
    }
    // Measured once at 100px and scaled, with a hair to spare for rounding in the drawing.
    return (width / 100) * size * 1.01 + Array.from(text).length * tracking * size;
  };
}
