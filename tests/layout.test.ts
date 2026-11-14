import { describe, expect, it } from 'vitest';
import { EXAMPLES } from '../src/card/examples.ts';
import { KEY_FACTS } from '../src/card/facts.ts';
import { FORMATS, LAYOUTS, type FormatId, type LayoutId } from '../src/card/formats.ts';
import { layout, type Box, type Placed, type TextBox } from '../src/card/layout.ts';
import { readCard } from '../src/card/read.ts';
import { estimate, type Measure } from '../src/card/text.ts';
import type { CardData } from '../src/card/model.ts';
import { bare, calderwyn, hesperwick, singles, vantmoor } from './helpers.ts';

/** The smallest text any card may carry, in the picture's own pixels. */
const SMALLEST = 14;

type Solid = Exclude<Box, { kind: 'rule' } | { kind: 'mark' }>;
const solid = (box: Box): box is Solid => box.kind !== 'rule' && box.kind !== 'mark';
const texts = (placed: Placed): TextBox[] => placed.boxes.filter((box): box is TextBox => box.kind === 'text');

const every: { format: FormatId; layout: LayoutId }[] = FORMATS.flatMap((size) =>
  LAYOUTS.map((kind) => ({ format: size.id, layout: kind.id })),
);

/** Everything a well-laid card must be, whatever is on it. */
function sound(placed: Placed, measure: Measure = estimate): void {
  const size = FORMATS.find((entry) => entry.id === placed.format);
  expect([placed.width, placed.height]).toEqual([size?.width, size?.height]);
  expect(placed.fits).toBe(true);

  const pad = Math.round(Math.min(placed.width, placed.height) * 0.058);
  for (const box of placed.boxes) {
    if (box.kind === 'rule') {
      for (const x of [box.x1, box.x2]) expect(x).toBeGreaterThanOrEqual(pad - 0.6), expect(x).toBeLessThanOrEqual(placed.width - pad + 0.6);
      for (const y of [box.y1, box.y2]) expect(y).toBeGreaterThanOrEqual(pad - 0.6), expect(y).toBeLessThanOrEqual(placed.height - pad + 0.6);
      continue;
    }
    const [left, top, right, bottom] =
      box.kind === 'mark' ? [box.x - box.r, box.y - box.r, box.x + box.r, box.y + box.r] : [box.x, box.y, box.x + box.w, box.y + box.h];
    expect(left, `${box.kind} left`).toBeGreaterThanOrEqual(pad - 0.6);
    expect(top, `${box.kind} top`).toBeGreaterThanOrEqual(pad - 0.6);
    expect(right, `${box.kind} right`).toBeLessThanOrEqual(placed.width - pad + 0.6);
    expect(bottom, `${box.kind} bottom`).toBeLessThanOrEqual(placed.height - pad + 0.6);
    if (box.kind !== 'mark') {
      expect(box.w).toBeGreaterThan(0);
      expect(box.h).toBeGreaterThan(0);
    }
  }

  const solids = placed.boxes.filter(solid);
  for (let a = 0; a < solids.length; a++) {
    for (let b = a + 1; b < solids.length; b++) {
      const one = solids[a]!;
      const other = solids[b]!;
      const apart =
        one.x + one.w <= other.x + 0.6 || other.x + other.w <= one.x + 0.6 || one.y + one.h <= other.y + 0.6 || other.y + other.h <= one.y + 0.6;
      if (!apart) {
        const name = (box: Solid): string => (box.kind === 'text' ? `${box.role} "${box.lines.join(' / ')}"` : box.kind);
        throw new Error(`${name(one)} overlaps ${name(other)} in ${placed.layout} ${placed.format}`);
      }
    }
  }

  for (const box of texts(placed)) {
    expect(box.size, `${box.role} size`).toBeGreaterThanOrEqual(SMALLEST);
    expect(box.lines.length).toBeGreaterThan(0);
    expect(box.h).toBe(box.lines.length * box.lineHeight);
    for (const line of box.lines) {
      const width = measure(line, { size: box.size, weight: box.weight, mono: box.mono, tracking: box.tracking });
      expect(width, `"${line}" in its ${box.role} box`).toBeLessThanOrEqual(box.w + 0.6);
    }
  }

  const credit = texts(placed).filter((box) => box.role === 'credit');
  expect(credit).toHaveLength(1);
  expect(credit[0]?.lines).toEqual(['card.eurth.org']);
  expect(texts(placed).filter((box) => box.role === 'name')).toHaveLength(1);
}

const nations: { name: string; data: CardData }[] = [
  ...EXAMPLES.map((example) => ({ name: example.name, data: readCard(example.profile) })),
  { name: 'a name and nothing else', data: bare() },
  { name: 'nothing at all', data: readCard(null) },
  ...singles().map(({ name, data }) => ({ name: `only ${name}`, data })),
];

describe('every layout in every format', () => {
  for (const nation of nations) {
    it(`is sound for ${nation.name}`, () => {
      for (const options of every) sound(layout(nation.data, options));
    });
  }

  it('is still sound in a font a sixth wider than the estimate', () => {
    const wider: Measure = (text, style) => estimate(text, style) * 1.16;
    for (const nation of nations.slice(0, 4)) {
      for (const options of every) sound(layout(nation.data, { ...options, measure: wider }), wider);
    }
  });

  it('is sound for a profile that fills every text to its limit', () => {
    const long = (length: number, word = 'Wwmwm'): string => Array.from({ length: Math.ceil(length / 6) }, () => word).join(' ').slice(0, length);
    const full = EXAMPLES[0]?.profile as Record<string, Record<string, unknown>>;
    const stretched = readCard({
      ...full,
      identity: { officialName: long(80), commonName: long(80, 'Mmmmm'), capital: long(80), demonym: long(80), motto: long(200), languages: Array.from({ length: 20 }, () => long(80)) },
      government: { form: long(80), headOfState: long(80), headOfGovernment: long(80, 'Qqqqq'), legislature: long(80) },
      seats: { chamber: long(80), total: 10_000, parties: Array.from({ length: 100 }, (_, index) => ({ name: long(80), seats: 100 - index })) },
      timeline: { title: long(80), events: Array.from({ length: 200 }, (_, index) => ({ year: -1_000_000 + index, title: long(200) })) },
      bank: { currency: long(80), code: 'WWWWWWWWWW' },
      calendar: { name: long(80), era: 'WWWWWWWWWWWWWWWWWWWW' },
      dynasty: { house: long(80), heir: long(80), law: long(80) },
      anthem: { title: long(80) },
      names: { language: long(80) },
      rank: { branches: Array.from({ length: 20 }, () => long(80)), ranks: [{ name: long(80) }] },
      cities: { urbanisation: 99.9, list: [{ name: long(80), population: 999_999_999_999 }] },
      stats: { population: 999_999_999_999, areaKm2: 9_999_999_999, gdpUsd: 9.99e15, gdpGrowth: -99.9, lifeExpectancy: 199.9, activeMilitary: 999_999_999_999 },
    });
    for (const options of every) sound(layout(stretched, options));
  });

  it('is sound for one unbroken word of eighty characters', () => {
    const data = readCard({ identity: { officialName: 'W'.repeat(80), motto: 'M'.repeat(200) }, stats: { population: 5 } });
    for (const options of every) sound(layout(data, options));
  });
});

describe('what a card shows', () => {
  it('shows Calderwyn\'s six key facts and its seats in every layout and format', () => {
    for (const options of every) {
      const placed = layout(calderwyn(), options);
      expect(placed.shown.facts.slice(0, 6), `${options.layout} ${options.format}`).toEqual([...KEY_FACTS]);
      expect(placed.shown.seats).toBe(true);
    }
  });

  it('shows the mock-up\'s card: six facts, the chart and the timeline on a link preview', () => {
    const placed = layout(calderwyn(), { format: 'preview', layout: 'classic' });
    expect(placed.shown).toEqual({ facts: [...KEY_FACTS], seats: true, legend: false, events: 5 });
    expect(layout(calderwyn(), { format: 'preview', layout: 'banner' }).shown.facts).toHaveLength(6);
    expect(placed.boxes.filter((box) => box.kind === 'picture').map((box) => box.which)).toEqual(['flag', 'arms']);
  });

  it('gives tall formats more of the story', () => {
    const preview = layout(calderwyn(), { format: 'preview' });
    const story = layout(calderwyn(), { format: 'story' });
    expect(story.shown.facts.length).toBeGreaterThan(preview.shown.facts.length);
    expect(story.shown.legend).toBe(true);
    expect(story.shown.events).toBe(5);
  });

  it('never shows more facts than a card should carry', () => {
    for (const options of every) expect(layout(calderwyn(), options).shown.facts.length).toBeLessThanOrEqual(14);
  });

  it('shows the one thing a one-section profile has', () => {
    for (const { name, data } of singles()) {
      for (const options of every) {
        const placed = layout(data, options);
        const where = `${name} ${options.layout} ${options.format}`;
        if (name === 'flag' || name === 'arms') {
          expect(placed.boxes.filter((box) => box.kind === 'picture').map((box) => box.which), where).toEqual([name]);
        } else if (name === 'seats') {
          expect(placed.shown.seats, where).toBe(true);
          expect(placed.shown.legend, where).toBe(true);
        } else if (name === 'timeline') {
          expect(placed.shown.events, where).toBeGreaterThanOrEqual(3);
        } else {
          expect(placed.shown.facts.length, where).toBeGreaterThan(0);
        }
      }
    }
  });

  it('lets a lone name fill the card', () => {
    for (const options of every) {
      const placed = layout(hesperwick(), options);
      const name = texts(placed).find((box) => box.role === 'name');
      expect(name?.align).toBe('middle');
      expect(name?.size).toBeGreaterThan(90);
      expect(placed.boxes).toHaveLength(2);
    }
  });

  it('prints a stand-in for a nation without a name', () => {
    const name = texts(layout(readCard({}))).find((box) => box.role === 'name');
    expect(name?.lines.join(' ')).toBe('Unnamed nation');
  });

  it('says more, larger, when there is less to say', () => {
    const size = (data: CardData): number => texts(layout(data, { format: 'square' })).find((box) => box.role === 'value')?.size ?? 0;
    expect(size(vantmoor())).toBeGreaterThanOrEqual(size(calderwyn()));
    expect(size(readCard({ identity: { capital: 'Selunna' } }))).toBeGreaterThan(size(calderwyn()));
  });

  it('gives the gold edge to a complete nation only', () => {
    expect(layout(calderwyn()).gold).toBe(true);
    expect(layout(vantmoor()).gold).toBe(false);
    expect(layout(bare()).gold).toBe(false);
  });
});

describe('the options', () => {
  it('falls back to the link preview and the classic layout', () => {
    const placed = layout(calderwyn());
    expect([placed.format, placed.layout, placed.width, placed.height]).toEqual(['preview', 'classic', 1200, 630]);
    const odd = layout(calderwyn(), { format: 'poster' as FormatId, layout: 'fancy' as LayoutId });
    expect([odd.format, odd.layout]).toEqual(['preview', 'classic']);
  });

  it('gives the same card for the same input', () => {
    for (const options of every) expect(layout(calderwyn(), options)).toEqual(layout(calderwyn(), options));
  });

  it('makes three layouts that differ', () => {
    for (const size of FORMATS) {
      const [a, b, c] = LAYOUTS.map((kind) => JSON.stringify(layout(calderwyn(), { format: size.id, layout: kind.id }).boxes));
      expect(a).not.toBe(b);
      expect(b).not.toBe(c);
      expect(a).not.toBe(c);
    }
  });

  it('uses the measure it is given', () => {
    const calls: string[] = [];
    layout(calderwyn(), { measure: (text, style) => (calls.push(text), estimate(text, style)) });
    expect(calls).toContain('Kingdom of Calderwyn');
  });
});
