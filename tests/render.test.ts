import { describe, expect, it } from 'vitest';
import { FORMATS, LAYOUTS, THEMES } from '../src/card/formats.ts';
import { layout } from '../src/card/layout.ts';
import { readCard } from '../src/card/read.ts';
import { dataAddress, escape, groupFills, mix, render } from '../src/card/render.ts';
import { seatChart } from '../src/card/seats.ts';
import { PALETTES } from '../tools/palette.ts';
import { bare, calderwyn, singles, vantmoor } from './helpers.ts';

const night = PALETTES.night;
const draw = (data = calderwyn(), options: Parameters<typeof layout>[1] = {}, theme = night, more = {}): string =>
  render(layout(data, options), data, theme, more);

/** A small check that markup is well formed: tags balance, text and attributes hold nothing raw. */
function wellFormed(svg: string): void {
  const stack: string[] = [];
  let rest = svg;
  const tag = /^<(\/?)([A-Za-z][\w-]*)((?:\s+[\w:-]+="[^"<]*")*)\s*(\/?)>/;
  while (rest.length) {
    if (rest.startsWith('<')) {
      const found = tag.exec(rest);
      if (!found) throw new Error(`Bad tag at: ${rest.slice(0, 80)}`);
      const [whole, closing, name, attributes, selfClosing] = found;
      for (const amp of (attributes ?? '').match(/&[^;]{0,8};?/g) ?? []) expect(amp).toMatch(/^&(amp|lt|gt|quot|#39);$/);
      if (closing) expect(stack.pop()).toBe(name);
      else if (!selfClosing) stack.push(name ?? '');
      rest = rest.slice(whole.length);
    } else {
      const end = rest.indexOf('<');
      const text = end < 0 ? rest : rest.slice(0, end);
      expect(text).not.toMatch(/>/);
      for (const amp of text.match(/&[^;]{0,8};?/g) ?? []) expect(amp).toMatch(/^&(amp|lt|gt|quot|#39);$/);
      rest = end < 0 ? '' : rest.slice(end);
    }
  }
  expect(stack).toEqual([]);
}

describe('drawing', () => {
  it('draws a well-formed SVG of the exact size, in every layout, format and theme', () => {
    for (const size of FORMATS) {
      for (const kind of LAYOUTS) {
        for (const theme of THEMES) {
          const svg = draw(calderwyn(), { format: size.id, layout: kind.id }, PALETTES[theme.id]);
          expect(svg.startsWith(`<svg xmlns="http://www.w3.org/2000/svg" width="${size.width}" height="${size.height}" viewBox="0 0 ${size.width} ${size.height}"`)).toBe(true);
          expect(svg.endsWith('</svg>')).toBe(true);
          wellFormed(svg);
          expect(svg).toContain(`fill="${PALETTES[theme.id].ground}"`);
        }
      }
    }
  });

  it('is well formed for every one-section card and for an empty one', () => {
    for (const { data } of singles()) wellFormed(draw(data, { format: 'square' }));
    wellFormed(draw(bare()));
    wellFormed(draw(readCard(undefined)));
  });

  it('carries its name as the title and its description for those who cannot see it', () => {
    const svg = draw();
    expect(svg).toContain('<title id="card-title">Kingdom of Calderwyn: country fact card</title>');
    expect(svg).toContain('<desc id="card-desc">Kingdom of Calderwyn (Calderwyn).');
    expect(svg).toContain('role="img" aria-labelledby="card-title card-desc"');
  });

  it('carries the line card.eurth.org and no Eurth logo', () => {
    const svg = draw();
    expect(svg).toContain('>card.eurth.org</text>');
    expect(svg.match(/<image /g)).toHaveLength(2);
  });

  it('prints what the profile says, in the device\'s own fonts', () => {
    const svg = draw();
    for (const text of ['Kingdom of Calderwyn', 'By tide and by lantern', 'CAPITAL', 'Haldermouth', '12.5 million', '$512 billion', 'Queen Ysolde III', 'The Moot · 151 seats', '1412 LR']) {
      expect(svg).toContain(`>${text}</text>`);
    }
    expect(svg).toContain('font-family="system-ui, Arial, sans-serif"');
    expect(svg).toContain('font-family="ui-monospace, Menlo, monospace"');
  });

  it('draws one dot for every seat, in the parties\' colours', () => {
    const svg = draw();
    const dots = svg.slice(svg.indexOf('<g stroke='), svg.indexOf('</g>'));
    expect(dots.match(/<circle /g)).toHaveLength(151);
    expect(dots.match(/fill="#d9a520"/g)).toHaveLength(58);
    expect(dots.match(/fill="#8a8f94"/g)).toHaveLength(8);
  });

  it('gives the gold edge two lines, and only to a complete nation', () => {
    expect(draw().match(new RegExp(`stroke="${night.gold}"`, 'g'))).toHaveLength(2);
    expect(draw(vantmoor())).not.toContain(`stroke="${night.gold}"`);
  });

  it('can leave the pictures out, for drawing them separately', () => {
    const svg = draw(calderwyn(), {}, night, { pictures: false });
    expect(svg).not.toContain('<image');
    wellFormed(svg);
  });
});

describe("someone else's input", () => {
  const hostile = readCard({
    meta: { nation: '</text><script>alert(1)</script>' },
    identity: {
      officialName: '"><script>alert(1)</script>',
      motto: "' onload='alert(1)' & <b>bold</b>",
      capital: ']]><svg onload=alert(1)>',
    },
    flag: { svg: '<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)"><script>alert("flag")</script></svg>' },
    seats: { chamber: '<img src=x onerror=alert(1)>', parties: [{ name: '<i>', seats: 3, colour: '#ff0000' }] },
    timeline: { events: [{ year: 1, title: '&lt;already&gt; &amp; <again>' }] },
    passport: { colour: '#123456"/><script>' },
  });

  it('escapes every text it prints', () => {
    for (const kind of LAYOUTS) {
      const svg = render(layout(hostile, { format: 'portrait', layout: kind.id }), hostile, night);
      wellFormed(svg);
      expect(svg).not.toMatch(/<script/i);
      expect(svg).not.toMatch(/<img|<b>|<i>/);
      expect(svg).toContain('&quot;&gt;&lt;script&gt;alert(1)&lt;/script&gt;');
      expect(svg).toContain('&amp;lt;already&amp;gt;');
    }
  });

  it('puts a picture in as an image address, never as markup', () => {
    const svg = render(layout(hostile), hostile, night);
    expect(svg).toContain('<image href="data:image/svg+xml;charset=utf-8,%3Csvg');
    expect(svg).not.toContain('onload="alert');
    expect(svg).toContain('%3Cscript%3E');
  });

  it('escapes a theme too', () => {
    const svg = draw(calderwyn(), {}, { ...night, sans: '"Evil", sans-serif' });
    wellFormed(svg);
    expect(svg).toContain('font-family="&quot;Evil&quot;, sans-serif"');
  });
});

describe('helpers', () => {
  it('escapes the five characters', () => {
    expect(escape(`<a href="x">Tom & Jerry's</a>`)).toBe('&lt;a href=&quot;x&quot;&gt;Tom &amp; Jerry&#39;s&lt;/a&gt;');
  });

  it('makes an image address', () => {
    expect(dataAddress('<svg a="b#c"/>')).toBe('data:image/svg+xml;charset=utf-8,%3Csvg%20a%3D%22b%23c%22%2F%3E');
  });

  it('mixes colours', () => {
    expect(mix('#000000', '#ffffff', 0)).toBe('#000000');
    expect(mix('#000000', '#ffffff', 1)).toBe('#ffffff');
    expect(mix('#000000', '#ffffff', 0.5)).toBe('#808080');
  });

  it('gives parties without a colour greys that differ in lightness, and leaves unheld seats hollow', () => {
    const chart = seatChart({ total: 100, parties: [{ name: 'A', seats: 40 }, { name: 'B', seats: 30, colour: '#ff0000' }, { name: 'C', seats: 20 }] });
    const fills = groupFills(chart, night);
    expect(fills[1]).toBe('#ff0000');
    expect(fills[3]).toBe(night.ground);
    const light = (hex: string): number => parseInt(hex.slice(1, 3), 16) + parseInt(hex.slice(3, 5), 16) + parseInt(hex.slice(5, 7), 16);
    expect(Math.abs(light(fills[0] ?? '') - light(fills[2] ?? ''))).toBeGreaterThan(200);
    expect(new Set(fills).size).toBe(4);
  });
});
