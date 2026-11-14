// Fitting text into a width without a browser to measure it. The card uses the device's own
// fonts, so widths are estimated from Arial's, with a little to spare. The site hands in a real
// measure instead; the estimate is for the tests and for anywhere without a browser.

export interface TextStyle {
  /** Font size in pixels. */
  size: number;
  weight?: 400 | 700;
  mono?: boolean;
  /** Extra space after every character, in ems. */
  tracking?: number;
}

/** The width of a line of text in pixels. */
export type Measure = (text: string, style: TextStyle) => number;

// Arial's advance widths for the printable ASCII characters (space to tilde), in thousandths of
// an em, regular and bold. Arial is the fallback the suite's font stack names, and the system
// fonts it prefers are as narrow or narrower.
const REGULAR = [
  278, 278, 355, 556, 556, 889, 667, 191, 333, 333, 389, 584, 278, 333, 278, 278, 556, 556, 556, 556, 556, 556, 556, 556,
  556, 556, 278, 278, 584, 584, 584, 556, 1015, 667, 667, 722, 722, 667, 611, 778, 722, 278, 500, 667, 556, 833, 722, 778,
  667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611, 278, 278, 278, 469, 556, 333, 556, 556, 500, 556, 556, 278, 556,
  556, 222, 222, 500, 222, 833, 556, 556, 556, 556, 333, 500, 278, 556, 500, 722, 500, 500, 500, 334, 260, 334, 584,
];
const BOLD = [
  278, 333, 474, 556, 556, 889, 722, 238, 333, 333, 389, 584, 278, 333, 278, 278, 556, 556, 556, 556, 556, 556, 556, 556,
  556, 556, 333, 333, 584, 584, 584, 611, 975, 722, 722, 722, 722, 667, 611, 778, 722, 278, 556, 722, 611, 833, 722, 778,
  667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611, 333, 278, 333, 584, 556, 333, 556, 611, 556, 611, 556, 333, 611,
  611, 278, 278, 556, 278, 889, 611, 611, 611, 611, 389, 556, 333, 611, 556, 778, 556, 556, 500, 389, 280, 389, 584,
];
// The punctuation the card itself prints, beyond ASCII.
const OTHER: Readonly<Record<string, number>> = {
  '—': 1000, '…': 1000, '–': 556, '·': 333, '’': 278, '‘': 278, '“': 500, '”': 500, '²': 333, '°': 400, '−': 584, '×': 584,
};

function em(character: string, bold: boolean): number {
  const table = bold ? BOLD : REGULAR;
  const code = character.codePointAt(0) ?? 0;
  if (code >= 32 && code <= 126) return (table[code - 32] ?? 600) / 1000;
  const other = OTHER[character];
  if (other !== undefined) return other / 1000;
  // Accents that sit on the letter before them take no room of their own.
  if (code >= 0x300 && code <= 0x36f) return 0;
  // Scripts with square characters, and emoji.
  if (code >= 0x2e80) return 1.05;
  // An accented letter is as wide as the letter under the accent.
  const base = character.normalize('NFD').codePointAt(0) ?? 0;
  if (base >= 32 && base <= 126) return (table[base - 32] ?? 600) / 1000;
  // Greek, Cyrillic and the like: capitals are the ones that have a lower case.
  return character.toLowerCase() !== character ? 0.85 : 0.7;
}

/** The estimate: Arial's width and a little more, so a line never runs past its box. */
export const estimate: Measure = (text, { size, weight = 400, mono = false, tracking = 0 }) => {
  let ems = 0;
  let characters = 0;
  for (const character of text) {
    ems += mono ? 0.61 : em(character, weight === 700);
    characters++;
  }
  return (ems * 1.02 + characters * tracking) * size;
};

export interface FitOptions extends TextStyle {
  /** The width the lines must stay within. */
  width: number;
  /** The smallest size to shrink to before cutting. Default: the size itself. */
  minSize?: number;
  /** Default 1. */
  maxLines?: number;
  measure?: Measure;
}

export interface Fitted {
  lines: string[];
  size: number;
  /** The widest line, in pixels. */
  width: number;
  /** True when the text had to be cut short. */
  clipped: boolean;
}

const ELLIPSIS = '…';

/** Words, keeping a hyphen with the part before it so long compounds can break there. */
function pieces(text: string): string[] {
  const out: string[] = [];
  for (const word of text.split(' ')) {
    const parts = word.split(/(?<=[-/])(?=.)/);
    // \u0001 marks a part that joins the next without a space.
    parts.forEach((part, index) => out.push(index < parts.length - 1 ? `${part}\u0001` : part));
  }
  return out;
}

/**
 * Greedy wrapping. `forced` says whether a single word had to be broken mid-word, which fit()
 * takes as a reason to try a smaller size first.
 */
function wrap(text: string, width: number, style: TextStyle, measure: Measure): { lines: string[]; forced: boolean } {
  const lines: string[] = [];
  let forced = false;
  let line = '';
  // A piece ending in \u0001 joins the next without a space (it ended in a hyphen).
  let joinNext = false;
  const push = (): void => {
    if (line) lines.push(line);
    line = '';
  };
  for (const raw of pieces(text)) {
    const glue = raw.endsWith('\u0001');
    let word = glue ? raw.slice(0, -1) : raw;
    const candidate = line ? (joinNext ? line + word : `${line} ${word}`) : word;
    if (measure(candidate, style) <= width) {
      line = candidate;
    } else {
      push();
      // A word wider than the whole line: break it wherever it must.
      while (measure(word, style) > width && Array.from(word).length > 1) {
        forced = true;
        const characters = Array.from(word);
        let take = characters.length - 1;
        while (take > 1 && measure(characters.slice(0, take).join(''), style) > width) take--;
        lines.push(characters.slice(0, take).join(''));
        word = characters.slice(take).join('');
      }
      line = word;
    }
    joinNext = glue;
  }
  push();
  return { lines, forced };
}

/** Cuts a line to fit, with an ellipsis. */
function cut(line: string, width: number, style: TextStyle, measure: Measure): string {
  const characters = Array.from(line);
  while (characters.length > 1 && measure(characters.join('').trimEnd() + ELLIPSIS, style) > width) characters.pop();
  return characters.join('').replace(/[\s,;:·-]+$/, '') + ELLIPSIS;
}

/**
 * Fits text into a width: wrap, then shrink towards the smallest size, then cut the last line
 * with an ellipsis. Always gives back at least one line that fits.
 */
export function fit(text: string, options: FitOptions): Fitted {
  const { width, size, minSize = size, maxLines = 1, measure = estimate, weight, mono, tracking } = options;
  const floor = Math.min(minSize, size);
  let current = size;
  for (;;) {
    const style: TextStyle = { size: current, weight, mono, tracking };
    const wrapped = wrap(text, width, style, measure);
    const smallest = current <= floor;
    if ((wrapped.lines.length <= maxLines && !wrapped.forced) || smallest) {
      let lines = wrapped.lines.length ? wrapped.lines : [''];
      let clipped = false;
      if (lines.length > maxLines) {
        lines = lines.slice(0, maxLines);
        const last = lines.length - 1;
        lines[last] = cut(lines[last] ?? '', width, style, measure);
        clipped = true;
      }
      return {
        lines,
        size: current,
        width: Math.max(0, ...lines.map((line) => measure(line, style))),
        clipped,
      };
    }
    current = Math.max(floor, current * 0.94);
  }
}
