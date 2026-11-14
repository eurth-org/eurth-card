// What does it cost to draw a card's link preview outside a browser?
//
// A Worker on Cloudflare's Free plan gets 10 ms of CPU per request. A Worker that drew a card's
// picture from its link would have to: read the link, lay the card out, draw it as SVG, and turn
// that SVG into a 1200 x 630 PNG. This script does exactly that, with the same engine the site
// uses and an SVG rasteriser compiled to WebAssembly (resvg), which is what a Worker would run,
// and times each part in CPU milliseconds.
//
// Run: npm install && npm run measure [regular.ttf bold.ttf]
// A Worker has no fonts of its own, so it would have to carry them; the script takes two font
// files, and on a Mac uses the system's Arial when none are given. Nothing here is deployed.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { Resvg, initWasm } from '@resvg/resvg-wasm';
import { EXAMPLES } from '../../src/card/examples.ts';
import { layout } from '../../src/card/layout.ts';
import { cardLink, readLink } from '../../src/card/link.ts';
import { readCard } from '../../src/card/read.ts';
import { render } from '../../src/card/render.ts';
import { PALETTES } from '../palette.ts';

const LIMIT_MS = 10;
const RUNS = 40;
const WARM_UP = 5;

const fontPaths = process.argv.slice(2).length
  ? process.argv.slice(2)
  : ['/System/Library/Fonts/Supplemental/Arial.ttf', '/System/Library/Fonts/Supplemental/Arial Bold.ttf'];
const missing = fontPaths.filter((path) => !existsSync(path));
if (missing.length) {
  console.error(`No font at ${missing.join(', ')}. Give two font files: npm run measure regular.ttf bold.ttf`);
  process.exit(1);
}
const fontBuffers = fontPaths.map((path) => new Uint8Array(readFileSync(path)));

/** CPU time a function takes, in milliseconds: this process's own user and system time. */
async function cpu<T>(work: () => T | Promise<T>): Promise<{ ms: number; result: T }> {
  const before = process.cpuUsage();
  const result = await work();
  const used = process.cpuUsage(before);
  return { ms: (used.user + used.system) / 1000, result };
}

function spread(times: number[]): { median: number; p95: number; max: number } {
  const sorted = [...times].sort((a, b) => a - b);
  const at = (share: number): number => sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * share))] ?? 0;
  return { median: at(0.5), p95: at(0.95), max: sorted[sorted.length - 1] ?? 0 };
}

const show = (value: number): string => value.toFixed(1).padStart(7);

const require = createRequire(import.meta.url);
const wasm = readFileSync(require.resolve('@resvg/resvg-wasm/index_bg.wasm'));
const start = await cpu(() => initWasm(wasm));

const out = new URL('../../out/', import.meta.url);
mkdirSync(out, { recursive: true });

console.log(`Drawing a 1200 x 630 link preview, ${RUNS} times each. CPU milliseconds; the Free plan allows ${LIMIT_MS}.`);
console.log(`Node ${process.version} on ${process.arch}. Starting the rasteriser (${(wasm.length / 1e6).toFixed(1)} MB of WebAssembly): ${start.ms.toFixed(1)} ms, once.`);
console.log(`Fonts a Worker would have to carry: ${(fontBuffers.reduce((sum, font) => sum + font.length, 0) / 1e6).toFixed(1)} MB.\n`);
console.log('nation        part              median     p95     max');

let worst = 0;
for (const example of EXAMPLES.slice(0, 3)) {
  const data = readCard(example.profile);
  const link = await cardLink({ data, format: 'preview', layout: 'classic', theme: 'night' });

  const parts: Record<string, number[]> = { 'read the link': [], 'lay out and draw': [], 'SVG to PNG': [], 'all three': [] };
  let png = new Uint8Array();
  for (let run = 0; run < RUNS + WARM_UP; run++) {
    const read = await cpu(() => readLink(link.url));
    const state = read.result;
    if (!state) throw new Error('The link did not read back.');
    const drawn = await cpu(() => render(layout(state.data, { format: 'preview', layout: state.layout }), state.data, PALETTES[state.theme]));
    const raster = await cpu(() => {
      const resvg = new Resvg(drawn.result, {
        fitTo: { mode: 'width', value: 1200 },
        font: { fontBuffers, loadSystemFonts: false, defaultFontFamily: 'Arial' },
      });
      const image = resvg.render();
      const bytes = image.asPng();
      image.free();
      resvg.free();
      return bytes;
    });
    png = raster.result;
    if (run < WARM_UP) continue;
    parts['read the link']?.push(read.ms);
    parts['lay out and draw']?.push(drawn.ms);
    parts['SVG to PNG']?.push(raster.ms);
    parts['all three']?.push(read.ms + drawn.ms + raster.ms);
  }
  for (const [part, times] of Object.entries(parts)) {
    const { median, p95, max } = spread(times);
    console.log(`${example.name.padEnd(13)} ${part.padEnd(16)} ${show(median)} ${show(p95)} ${show(max)}`);
    if (part === 'all three') worst = Math.max(worst, p95);
  }
  writeFileSync(new URL(`preview-${example.id}.png`, out), png);
  console.log(`${''.padEnd(13)} the PNG is ${(png.length / 1000).toFixed(0)} kB, the link ${link.length} characters\n`);
}

console.log(
  worst > LIMIT_MS
    ? `Over the limit: the slowest card needs ${worst.toFixed(0)} ms at the 95th percentile, ${(worst / LIMIT_MS).toFixed(1)} times what the Free plan allows.`
    : `Within the limit here: ${worst.toFixed(1)} ms at the 95th percentile. Measure on Cloudflare's own machines before relying on it.`,
);
