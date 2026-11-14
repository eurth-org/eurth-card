import { describe, expect, it } from 'vitest';
import { EXAMPLES } from '../src/card/examples.ts';
import { FORMATS, LAYOUTS, THEMES } from '../src/card/formats.ts';
import {
  LINK_COMFORT,
  LINK_LIMIT,
  cardLink,
  decodeCard,
  encodeCard,
  pack,
  readLink,
  seal,
  unpack,
  unseal,
  verdict,
  type CardState,
} from '../src/card/link.ts';
import { readCard } from '../src/card/read.ts';
import type { CardData } from '../src/card/model.ts';
import { bare, calderwyn, singles, vantmoor } from './helpers.ts';

const state = (data: CardData, more: Partial<CardState> = {}): CardState => ({
  data,
  format: 'preview',
  layout: 'classic',
  theme: 'night',
  ...more,
});

/** SVG that does not compress: `length` characters of path data from a fixed random walk. */
function noisy(length: number): string {
  let seed = 12345;
  let d = '';
  while (d.length < length) {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    d += `L${seed % 997} ${(seed >> 8) % 997}`;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 600"><path d="M0 0${d}"/></svg>`;
}

describe('a card in a link', () => {
  it('comes back exactly as it went in, for every example and every one-section card', async () => {
    const cards = [...EXAMPLES.map((example) => readCard(example.profile)), bare(), readCard(null), ...singles().map(({ data }) => data)];
    for (const data of cards) {
      const back = await decodeCard(await encodeCard(state(data)));
      expect(back).toEqual(state(data));
    }
  });

  it('carries the format, the layout and the theme', async () => {
    for (const size of FORMATS) {
      for (const kind of LAYOUTS) {
        for (const theme of THEMES) {
          const sent = state(vantmoor(), { format: size.id, layout: kind.id, theme: theme.id });
          expect(await decodeCard(await encodeCard(sent))).toEqual(sent);
        }
      }
    }
  });

  it('is the plain address for a blank card', async () => {
    expect(await cardLink(state(readCard(null)))).toEqual({ url: 'https://card.eurth.org/', length: 23, verdict: 'fine' });
    expect((await cardLink(state(readCard(null), { theme: 'light' }))).url).toMatch(/\?c=1\./);
  });

  it('puts the card in the query string, where a Worker could read it', async () => {
    const link = await cardLink(state(calderwyn()), 'https://card.eurth.org/?old=1#top');
    expect(link.url).toMatch(/^https:\/\/card\.eurth\.org\/\?c=1\.[A-Za-z0-9_-]+$/);
    expect(await readLink(link.url)).toEqual(state(calderwyn()));
    expect(await readLink(new URL(link.url).search)).toEqual(state(calderwyn()));
  });

  it('keeps the example nations comfortably short', async () => {
    for (const example of EXAMPLES) {
      const link = await cardLink(state(readCard(example.profile)));
      expect(link.verdict, example.name).toBe('fine');
      expect(link.length).toBeLessThan(LINK_COMFORT);
    }
  });

  it('is much shorter than the card written out', async () => {
    const written = JSON.stringify(calderwyn()).length;
    const link = await cardLink(state(calderwyn()));
    expect(link.length).toBeLessThan(written * 0.6);
  });

  it('carries only the card, not the whole profile', () => {
    const packed = JSON.stringify(pack(state(calderwyn())));
    expect(packed).not.toContain('Tarrowby');
    expect(packed).not.toContain('Frostwane');
    expect(packed).not.toContain('Where the Calder meets the morning');
    expect(packed).not.toContain('https://');
  });
});

describe('a card too big for a link', () => {
  it('judges a link by its length', () => {
    expect(verdict(LINK_COMFORT)).toBe('fine');
    expect(verdict(LINK_COMFORT + 1)).toBe('long');
    expect(verdict(LINK_LIMIT)).toBe('long');
    expect(verdict(LINK_LIMIT + 1)).toBe('too-long');
  });

  it('says a middling card is long but usable', async () => {
    const data = readCard({ identity: { officialName: 'Teland' }, flag: { svg: noisy(5000) } });
    const link = await cardLink(state(data));
    expect(link.verdict).toBe('long');
    expect(link.lighter).toBeUndefined();
    expect(await readLink(link.url)).toEqual(state(data));
  });

  it('offers a link without the arms when that is what makes it fit', async () => {
    const data = readCard({ identity: { officialName: 'Teland' }, flag: { svg: noisy(3000) }, arms: { svg: noisy(40_000) } });
    const link = await cardLink(state(data));
    expect(link.verdict).toBe('too-long');
    expect(link.lighter?.without).toEqual(['arms']);
    expect(link.lighter?.length).toBeLessThanOrEqual(LINK_LIMIT);
    const back = await readLink(link.lighter?.url ?? '');
    expect(back?.data.flag).toEqual(data.flag);
    expect(back?.data.arms).toBeUndefined();
    expect(back?.data.name).toBe('Teland');
  });

  it('leaves out the flag, or both, when it must', async () => {
    const bigFlag = readCard({ flag: { svg: noisy(40_000) }, arms: { svg: noisy(3000) } });
    expect((await cardLink(state(bigFlag))).lighter?.without).toEqual(['flag']);
    const bigBoth = readCard({ flag: { svg: noisy(40_000) }, arms: { svg: noisy(40_000) } });
    expect((await cardLink(state(bigBoth))).lighter?.without).toEqual(['arms', 'flag']);
  });

  it('never unpacks a link that is over the limit', async () => {
    const data = readCard({ flag: { svg: noisy(40_000) } });
    const link = await cardLink(state(data));
    expect(link.length).toBeGreaterThan(LINK_LIMIT);
    expect(await readLink(link.url)).toBeNull();
  });
});

describe("someone else's link", () => {
  it('reads nothing from what is not a card link', async () => {
    const junk = ['', 'hello', '1.', '.abc', '0.abc', '1.!!!', '1.a', '1.abc def', '2.SyvNSS4BAA', '1.AAAA', null, undefined, 42, {}];
    for (const text of junk) expect(await decodeCard(text)).toBeNull();
    expect(await readLink('https://card.eurth.org/')).toBeNull();
    expect(await readLink('https://card.eurth.org/?c=nonsense')).toBeNull();
    expect(await readLink('not a link at all')).toBeNull();
  });

  it('reads nothing from sealed values that are not a card', async () => {
    for (const value of ['text', 42, null, [1, 2, 3], true]) expect(await decodeCard(await seal(value))).toBeNull();
    expect(await decodeCard(await seal({ n: 'Teland' }, 2))).toBeNull();
  });

  it('reads an empty card from an empty object', async () => {
    expect(await decodeCard(await seal({}))).toEqual(state(readCard(null)));
  });

  it('will not let a small link swell into a huge card', async () => {
    const bomb = await seal({ n: 'x'.repeat(4_000_000) });
    expect(bomb.length).toBeLessThan(LINK_LIMIT);
    expect(await unseal(bomb)).toBeNull();
    expect(await decodeCard(bomb)).toBeNull();
  });

  it('cleans what a link carries exactly as it cleans a file', async () => {
    const back = await decodeCard(
      await seal({
        n: `<script>${'x'.repeat(500)}`,
        m: 'Tide‮\u0000 and  lantern',
        f: ['<svg><!DOCTYPE x></svg>', 1.5],
        a: ['<svg viewBox="0 0 10 12"/>', 999],
        po: '12',
        gd: 1e99,
        ca: ['not', 'text'],
        la: Array.from({ length: 50 }, (_, index) => `Language ${index}`),
        pc: 'red',
        dr: 'up',
        s: ['Moot', 5, [['A', 3, 'zzzzzz'], ['B', -2], 'C', ['D', 1.5]], 0, 0],
        t: [0, [[1.5, 'half'], [1412, 'x'.repeat(900)], 'nope']],
        x: 2 ** 40,
        o: [99, -1, 'light'],
      }),
    );
    expect(back?.data.name).toHaveLength(80);
    expect(back?.data.name.startsWith('<script>')).toBe(true);
    expect(back?.data.motto).toBe('Tide and lantern');
    expect(back?.data.flag).toBeUndefined();
    expect(back?.data.arms).toEqual({ svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 12"/>', ratio: 5 });
    expect(back?.data.population).toBeUndefined();
    expect(back?.data.gdpUsd).toBeUndefined();
    expect(back?.data.capital).toBeUndefined();
    expect(back?.data.languages).toHaveLength(6);
    expect(back?.data.passportColour).toBeUndefined();
    expect(back?.data.drivesOn).toBeUndefined();
    expect(back?.data.seats).toEqual({ chamber: 'Moot', total: 5, parties: [{ name: 'A', seats: 3 }] });
    expect(back?.data.timeline?.events).toEqual([{ year: 1412, title: 'x'.repeat(200) }]);
    expect(back?.data.filled).toEqual([]);
    expect([back?.format, back?.layout, back?.theme]).toEqual(['preview', 'classic', 'night']);
  });

  it('unpacks only objects', () => {
    for (const value of [null, 'x', 4, [], [{}]]) expect(unpack(value)).toBeNull();
    expect(unpack({})).toEqual(state(readCard(null)));
  });
});
