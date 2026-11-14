// Every layout, format and theme for the example nations on one page, to look over by eye.
// Run: npm run sheet. Writes out/contact-sheet.html and one SVG per card in out/cards/.

import { mkdirSync, writeFileSync } from 'node:fs';
import { EXAMPLES } from '../src/card/examples.ts';
import { FORMATS, LAYOUTS, THEMES } from '../src/card/formats.ts';
import { layout } from '../src/card/layout.ts';
import { readCard } from '../src/card/read.ts';
import { render } from '../src/card/render.ts';
import { SECTIONS } from '../src/card/model.ts';
import { PALETTES } from './palette.ts';

const only = process.argv[2];
const out = new URL('../out/', import.meta.url);
mkdirSync(new URL('cards/', out), { recursive: true });

const calderwyn = EXAMPLES[0]?.profile as Record<string, unknown>;
const nations: { id: string; name: string; profile: unknown }[] = [
  ...EXAMPLES,
  { id: 'bare', name: 'A name and nothing else', profile: { meta: { nation: 'Nowhere' } } },
  ...SECTIONS.map((section) => ({
    id: `only-${section}`,
    name: `Calderwyn, only "${section}"`,
    profile: { meta: calderwyn.meta, [section]: calderwyn[section] },
  })),
];

let html = '<!doctype html><meta charset="utf-8"><title>Card contact sheet</title>' +
  '<style>body{font:14px system-ui;margin:16px;background:#777;color:#fff}h2{margin:28px 0 8px}' +
  '.row{display:flex;flex-wrap:wrap;gap:12px;align-items:flex-start}figure{margin:0}img{display:block;height:' + (only ? 520 : 300) + 'px;width:auto}' +
  'figcaption{font-size:12px;padding:2px 0}.bad{color:#ff0;font-weight:700}</style>';
let count = 0;
let unfit = 0;
for (const nation of nations) {
  if (only && !nation.id.includes(only)) continue;
  const data = readCard(nation.profile);
  html += `<h2>${nation.name}</h2>`;
  // The one-section cards are shown in one theme, to keep the page a reasonable length.
  const themes = nation.id.startsWith('only-') ? THEMES.slice(0, 1) : THEMES;
  for (const theme of themes) {
    for (const kind of LAYOUTS) {
      html += '<div class="row">';
      for (const size of FORMATS) {
        const placed = layout(data, { format: size.id, layout: kind.id });
        const file = `cards/${nation.id}-${kind.id}-${size.id}-${theme.id}.svg`;
        writeFileSync(new URL(file, out), render(placed, data, PALETTES[theme.id]));
        count++;
        if (!placed.fits) unfit++;
        html += `<figure><img src="${file}" alt=""><figcaption class="${placed.fits ? '' : 'bad'}">${kind.name} · ${size.name} · ` +
          `${placed.shown.facts.length} facts${placed.shown.seats ? ' · seats' : ''}${placed.shown.legend ? ' · legend' : ''}` +
          `${placed.shown.events ? ` · ${placed.shown.events} events` : ''}${placed.fits ? '' : ' · DOES NOT FIT'}</figcaption></figure>`;
      }
      html += '</div>';
    }
  }
}
writeFileSync(new URL('contact-sheet.html', out), html);
console.log(`${count} cards written to out/, ${unfit} that do not fit.`);
