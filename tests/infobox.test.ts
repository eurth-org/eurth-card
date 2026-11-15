import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { withEdits } from '../src/card/edit.ts';
import { infobox, isSvgName, pngName, profileOf } from '../src/card/infobox.ts';
import { cardLink, readLink } from '../src/card/link.ts';
import { readCard } from '../src/card/read.ts';
import { FIELDS } from '../src/card/wiki/fields.ts';
import { infoboxWikitext, wikiLink, wikiValue } from '../src/card/wiki/infobox.ts';
import { clean, formatMoney, formatNumber, parseNumber } from '../src/card/wiki/model.ts';
import { decodeDesign, fromLink, fromProfile, splitTitle } from '../src/card/wiki/profile.ts';
import { bare, calderwyn, example, hesperwick, singles, vantmoor } from './helpers.ts';

const WIKI = 'https://wiki.eurth.org';

/**
 * What Wiki itself writes. Made with eurth-wiki's own code (commit 825aafe), run on the example
 * profiles of @eurth/profile and on a profile Wiki saved for Teland:
 * infoboxWikitext(fromProfile(profile, 'https://wiki.eurth.org').country).
 */
const fixture = (name: string): string => readFileSync(fileURLToPath(new URL(`./fixtures/infobox/${name}`, import.meta.url)), 'utf8');
const wikis = (name: string): string => fixture(`${name}.wiki`).trimEnd();
const telandProfile = (): Record<string, unknown> => JSON.parse(fixture('teland.eurth.json')) as Record<string, unknown>;

/** The parameters of an infobox, by name. */
function params(wikitext: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const row of wikitext.split('\n')) {
    const found = /^\| (\S+)\s+=(?: (.*))?$/.exec(row);
    if (found) out[found[1]!] = found[2] ?? '';
  }
  return out;
}

describe('the same wikitext as Wiki', () => {
  for (const name of ['calderwyn', 'vantmoor', 'hesperwick'] as const) {
    it(`for ${name}, from its profile`, () => {
      const profile = example(name);
      expect(infobox(readCard(profile), { profile, wikiSite: WIKI }).wikitext).toBe(wikis(name));
    });
  }

  it('for a profile that has been through Wiki: the whole design comes out of wiki.link', () => {
    const profile = telandProfile();
    const made = infobox(readCard(profile), { profile, wikiSite: WIKI });
    expect(made.wikitext).toBe(wikis('teland'));
    // Fields Card has no room for, and couldn't know without the design.
    expect(params(made.wikitext)).toMatchObject({ established_date1: '1184', percent_water: '2.4', calling_code: '+42' });
  });

  it('keeps the empty lines when asked, as Wiki can', () => {
    const { country } = fromProfile(telandProfile(), WIKI);
    expect(infoboxWikitext(country, { blanks: true })).toBe(wikis('teland-blanks'));
    expect(Object.keys(params(wikis('teland-blanks')))).toHaveLength(FIELDS.length);
  });

  it('is one parameter a line, under headings, with the equals signs in a column', () => {
    const rows = wikis('calderwyn').split('\n');
    expect(rows[0]).toBe('{{Infobox country');
    expect(rows.at(-1)).toBe('}}');
    expect(rows[1]).toBe('<!-- NAMES -->');
    const columns = new Set(rows.filter((row) => row.startsWith('| ')).map((row) => row.indexOf('=')));
    expect(columns.size).toBe(1);
  });
});

describe('a design in wiki.link', () => {
  const link = (telandProfile().wiki as { link: string }).link;

  it('is only read from a link to Wiki itself', () => {
    expect(fromLink(link, WIKI)?.capital).toBe('Selunna');
    expect(fromLink(link, `${WIKI}/`)?.capital).toBe('Selunna');
    expect(fromLink(link.replace('wiki.eurth.org', 'wiki.example.org'), WIKI)).toBeNull();
    expect(fromLink(link.replace('https://wiki.eurth.org/', 'https://wiki.eurth.org.example.org/'), WIKI)).toBeNull();
    expect(fromLink(42, WIKI)).toBeNull();
    expect(fromLink(`${WIKI}/?d=1.not-a-design`, WIKI)).toBeNull();
    expect(fromLink(`${WIKI}/`, WIKI)).toBeNull();
  });

  it('is left unread until Wiki has an address to check it against', () => {
    expect(fromLink(link, null)).toBeNull();
    const profile = telandProfile();
    const made = infobox(readCard(profile), { profile });
    // The profile's own sections still speak.
    expect(params(made.wikitext)).toMatchObject({ conventional_long_name: 'Republic of Teland', capital: '[[Selunna]]', calling_code: '+42' });
    expect(params(made.wikitext).established_date1).toBeUndefined();
  });

  it('is cleaned like any other input: unknown keys go, long values are cut', () => {
    const packed = (value: unknown): string => `1.${Buffer.from(JSON.stringify(value)).toString('base64url')}`;
    expect(decodeDesign(packed({ capital: 'Selunna' }))).toEqual({ capital: 'Selunna' });
    const arrived = fromLink(`${WIKI}/?d=${packed({ capital: 'x'.repeat(500), nonsense: 'yes', drives_on: 'sideways', common_name: ['a'] })}`, WIKI);
    expect(arrived?.capital).toHaveLength(80);
    expect(arrived).not.toHaveProperty('nonsense');
    expect(arrived?.drives_on).toBe('');
    expect(arrived?.common_name).toBe('');
    for (const bad of [null, undefined, 7, '', 'x', '1.', '1.!!!', `1.${'A'.repeat(9000)}`, '1.eyJh']) expect(decodeDesign(bad)).toBeNull();
  });

  it('gives way to what the other tools say today', () => {
    const profile = { ...telandProfile(), stats: { population: 50_000_000 }, identity: { commonName: 'Teland', capital: 'Port Ansel' } };
    const made = params(infobox(readCard(profile), { profile, wikiSite: WIKI }).wikitext);
    expect(made.population_estimate).toBe('50,000,000');
    expect(made.capital).toBe('[[Port Ansel]]');
    // What only the design knows stays.
    expect(made.percent_water).toBe('2.4');
  });
});

describe('a card with no profile behind it', () => {
  it('says the same as its profile would, for everything the card carries', () => {
    for (const name of ['calderwyn', 'vantmoor', 'hesperwick'] as const) {
      const profile = example(name);
      const fromCard = params(infobox(readCard(profile)).wikitext);
      const fromFile = params(infobox(readCard(profile), { profile, wikiSite: WIKI }).wikitext);
      expect(fromCard, name).toEqual(fromFile);
    }
  });

  it('survives the trip through its link', async () => {
    const data = calderwyn();
    const { url } = await cardLink({ data, format: 'preview', layout: 'classic', theme: 'night' });
    const arrived = await readLink(url);
    expect(infobox(arrived!.data).wikitext).toBe(infobox(data).wikitext);
    expect(infobox(arrived!.data).wikitext).toBe(wikis('calderwyn'));
  });

  it('calls a head of state from the dynasty "Monarch", and one from the government by their office', () => {
    const royal = readCard({ meta: { nation: 'Arvel' }, dynasty: { house: 'Marrow', monarch: 'Ysolde III' } });
    expect(params(infobox(royal).wikitext)).toMatchObject({ leader_title1: 'Monarch', leader_name1: 'Ysolde III' });
    const titled = readCard({ meta: { nation: 'Arvel' }, dynasty: { house: 'Marrow', monarch: 'Queen Ysolde III' } });
    expect(params(infobox(titled).wikitext)).toMatchObject({ leader_title1: 'Queen', leader_name1: 'Ysolde III' });
    const elected = readCard({ meta: { nation: 'Arvel' }, government: { headOfState: 'Maelin Ostrevin', headOfGovernment: 'Prime Minister Dara Voss' } });
    expect(params(infobox(elected).wikitext)).toMatchObject({ leader_title1: 'Head of state', leader_name1: 'Maelin Ostrevin', leader_title2: 'Prime Minister', leader_name2: 'Dara Voss' });
  });

  it('takes what was typed on the card: name, capital and motto', () => {
    const data = withEdits(vantmoor(), { name: 'Free State of Vantmoor', capital: 'Low Harbour', motto: 'Onward' });
    const made = params(infobox(data).wikitext);
    expect(made).toMatchObject({ conventional_long_name: 'Free State of Vantmoor', common_name: 'Vantmoor', capital: '[[Low Harbour]]', national_motto: '"Onward"' });
    // The files keep the everyday name, as the page does.
    expect(made.image_flag).toBe('Flag of Vantmoor.svg');
  });

  it('writes numbers as an encyclopedia does, and works out the two that follow from others', () => {
    const made = params(infobox(readCard({ meta: { nation: 'Arvel' }, stats: { population: 2_000_000, areaKm2: 50_000, gdpUsd: 64_000_000_000 } })).wikitext);
    expect(made).toMatchObject({ population_estimate: '2,000,000', area_km2: '50,000', population_density_km2: '40', GDP_nominal: '$64 billion', GDP_nominal_per_capita: '$32,000' });
  });

  it('says "capital" for a largest city that is the capital, and links one that isn’t', () => {
    const same = readCard({ meta: { nation: 'Arvel' }, identity: { capital: 'Marrowgate' }, cities: { list: [{ name: 'Marrowgate', population: 900_000 }] } });
    expect(params(infobox(same).wikitext).largest_city).toBe('capital');
    const other = readCard({ meta: { nation: 'Arvel' }, identity: { capital: 'Marrowgate' }, cities: { list: [{ name: 'Port Sill', population: 900_000 }] } });
    expect(params(infobox(other).wikitext).largest_city).toBe('[[Port Sill]]');
  });

  it('lays the card out as a small profile with nothing in it the card doesn’t know', () => {
    const small = profileOf(bare());
    expect(small.meta).toEqual({ nation: 'Nowhere' });
    expect(small.flag).toBeUndefined();
    expect(readCard(small).name).toBe('Nowhere');
    expect(readCard(profileOf(calderwyn())).capital).toBe('Haldermouth');
  });
});

describe('the pictures that go with it', () => {
  it('are the flag and the arms, under the names the infobox asks for', () => {
    const made = infobox(calderwyn());
    expect(made.files.map((file) => [file.kind, file.name])).toEqual([
      ['flag', 'Flag of Calderwyn.svg'],
      ['arms', 'Coat of arms of Calderwyn.svg'],
    ]);
    expect(made.files[0]!.picture.svg).toContain('<svg');
    expect(made.wikitext).toContain('| image_flag             = Flag of Calderwyn.svg');
    // The map is the one picture no tool draws.
    expect(made.wanted).toEqual(['Map of Calderwyn.png']);
  });

  it('are asked for by name when the card has none to give', () => {
    const made = infobox(bare());
    expect(made.files).toEqual([]);
    expect(made.wanted).toEqual(['Flag of Nowhere.png', 'Coat of arms of Nowhere.png', 'Map of Nowhere.png']);
  });

  it('keep the name a design gave them, and say whether that is a drawing or a PNG', () => {
    const design = `1.${Buffer.from(JSON.stringify({ common_name: 'Teland', image_flag: 'File:Banner of Teland.png' })).toString('base64url')}`;
    const profile = { meta: { nation: 'Teland' }, wiki: { link: `${WIKI}/?d=${design}` }, flag: example('calderwyn').flag, arms: example('calderwyn').arms };
    const made = infobox(readCard(profile), { profile, wikiSite: WIKI });
    expect(made.files.map((file) => file.name)).toEqual(['Banner of Teland.png', 'Coat of arms of Teland.svg']);
    // Without the design the flag goes by the name Wiki gives an SVG.
    expect(infobox(readCard(profile), { profile }).files[0]!.name).toBe('Flag of Teland.svg');
    expect(isSvgName('Flag of Teland.svg')).toBe(true);
    expect(isSvgName('Flag of Teland.SVG')).toBe(true);
    expect(isSvgName('Flag of Teland.png')).toBe(false);
    expect(pngName('Flag of Teland.jpeg')).toBe('Flag of Teland.png');
    expect(pngName('Flag of St. Aldric')).toBe('Flag of St. Aldric.png');
  });

  it('are never named for a picture Card’s own reader turned away', () => {
    const profile = { meta: { nation: 'Arvel' }, flag: { svg: '<!DOCTYPE svg [<!ENTITY x "y">]><svg xmlns="http://www.w3.org/2000/svg"/>' } };
    const made = infobox(readCard(profile), { profile, wikiSite: WIKI });
    expect(made.files).toEqual([]);
    expect(params(made.wikitext).image_flag).toBe('Flag of Arvel.png');
  });
});

describe('a nation with little or nothing', () => {
  it('has no infobox to speak of until it has a name', () => {
    const made = infobox(readCard({}));
    expect(made.named).toBe(false);
    expect(made.wikitext).toBe('{{Infobox country\n}}');
    expect(made.files).toEqual([]);
    expect(made.wanted).toEqual([]);
    expect(made.lines).toBe(0);
  });

  it('has one from a name alone', () => {
    const made = infobox(bare());
    expect(made.named).toBe(true);
    expect(params(made.wikitext)).toMatchObject({ conventional_long_name: 'Nowhere', common_name: 'Nowhere' });
    expect(made.lines).toBe(Object.keys(params(made.wikitext)).length);
  });

  it('is well formed from a profile with any one section', () => {
    for (const { name, data } of singles()) {
      const { wikitext } = infobox(data);
      expect(wikitext.startsWith('{{Infobox country\n'), name).toBe(true);
      expect(wikitext.endsWith('\n}}'), name).toBe(true);
      expect(params(wikitext).common_name, name).toBe('Calderwyn');
    }
  });

  it('counts its lines', () => {
    expect(infobox(hesperwick()).lines).toBe(Object.keys(params(wikis('hesperwick'))).length);
  });
});

describe('someone else’s input', () => {
  const hostile = '}} [[x|y]] | evil = 1 {{ <!-- <nowiki> </ref>\n| next = 2';

  it('can’t break out of the template: every line stays one parameter', () => {
    const profile = {
      meta: { nation: hostile },
      identity: { officialName: hostile, capital: hostile, motto: hostile, demonym: hostile, languages: [hostile, 'a|b'] },
      government: { form: hostile, headOfState: hostile, headOfGovernment: `Premier ${hostile}`, legislature: hostile },
      bank: { currency: hostile, code: hostile },
      calendar: { name: hostile, era: hostile },
      anthem: { title: hostile },
      cities: { list: [{ name: hostile, population: 5 }] },
    };
    for (const options of [{}, { profile, wikiSite: WIKI }]) {
      const { wikitext } = infobox(readCard(profile), options);
      const rows = wikitext.split('\n');
      expect(rows[0]).toBe('{{Infobox country');
      expect(rows.at(-1)).toBe('}}');
      for (const row of rows.slice(1, -1)) {
        if (/^<!-- [A-Z]+ -->$/.test(row)) continue;
        expect(/^\| \w+\s+=( .*)?$/.test(row), row).toBe(true);
        const value = row.replace(/^\| \w+\s+=/, '');
        // No pipe outside a link or a template, and nothing left open.
        expect(value.replace(/\[\[[^\]]*\]\]|\{\{!\}\}/g, ''), row).not.toMatch(/[|{}]|<!--|<nowiki/);
      }
      expect(wikitext).not.toContain('evil = 1\n');
      expect(params(wikitext).next).toBeUndefined();
    }
  });

  it('never throws, whatever a profile or a card holds', () => {
    for (const junk of [null, undefined, 7, 'text', [], { identity: 7, wiki: { link: 9 }, stats: { population: 'many' }, cities: { list: 'none' } }, { meta: { nation: 'A' }, wiki: { link: 'https://wiki.eurth.org/?d=%%%' } }]) {
      expect(() => infobox(readCard(junk), { profile: junk, wikiSite: WIKI })).not.toThrow();
      expect(() => infobox(readCard(junk))).not.toThrow();
    }
  });
});

describe('Wiki’s own rules, as copied', () => {
  it('turn a loose pipe into {{!}} and leave whole links and templates alone', () => {
    expect(wikiValue('a | b')).toBe('a {{!}} b');
    expect(wikiValue('[[Selunna|the capital]] and {{flag|Teland}}')).toBe('[[Selunna|the capital]] and {{flag|Teland}}');
    expect(wikiValue('half {{open')).toBe('half &#123;&#123;open');
    expect(wikiValue('half [[open')).toBe('half &#91;&#91;open');
    expect(wikiValue('a <!-- comment')).toBe('a &lt;!-- comment');
  });

  it('link a page by its name, and never wrap a link in a link', () => {
    expect(wikiLink('Selunna')).toBe('[[Selunna]]');
    expect(wikiLink('[[Selunna]]')).toBe('[[Selunna]]');
    expect(wikiLink('  ')).toBe('');
  });

  it('read numbers however they were typed, and write them with commas', () => {
    expect(parseNumber('48,200,000')).toBe(48_200_000);
    expect(parseNumber('48.2 million')).toBe(48_200_000);
    expect(parseNumber('$1.94 trillion')).toBe(1.94e12);
    expect(parseNumber('many')).toBeNull();
    expect(formatNumber(48_200_000)).toBe('48,200,000');
    expect(formatMoney(1.94e12)).toBe('$1.94 trillion');
    expect(formatMoney(41_026)).toBe('$41,026');
  });

  it('tell a title from a name', () => {
    expect(splitTitle('Queen Ysolde III')).toEqual({ title: 'Queen', name: 'Ysolde III' });
    expect(splitTitle('Prime Minister Dara Voss')).toEqual({ title: 'Prime Minister', name: 'Dara Voss' });
    expect(splitTitle('Maelin Ostrevin')).toEqual({ title: '', name: 'Maelin Ostrevin' });
    expect(splitTitle('Queen')).toEqual({ title: '', name: 'Queen' });
  });

  it('keep every field of the tutorial, each under a name that never changes', () => {
    expect(FIELDS).toHaveLength(109);
    expect(new Set(FIELDS.map((field) => field.param)).size).toBe(109);
    expect(Object.keys(clean({}))).toEqual(FIELDS.map((field) => field.param));
  });
});
