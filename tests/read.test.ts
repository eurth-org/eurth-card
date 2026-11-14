import { describe, expect, it } from 'vitest';
import { readCard, spread } from '../src/card/read.ts';
import { MAX_EVENTS, MAX_PARTIES, SECTIONS, complete, displayName, missing } from '../src/card/model.ts';
import { bare, calderwyn, example, hesperwick, oneSection, vantmoor } from './helpers.ts';

describe('the three example profiles', () => {
  it('reads every section of Calderwyn', () => {
    const card = calderwyn();
    expect(card.name).toBe('Kingdom of Calderwyn');
    expect(card.commonName).toBe('Calderwyn');
    expect(card.motto).toBe('By tide and by lantern');
    expect(card.flag?.ratio).toBeCloseTo(1.5);
    expect(card.arms?.ratio).toBeCloseTo(200 / 240);
    expect(card).toMatchObject({
      capital: 'Haldermouth',
      population: 12_480_000,
      government: 'Parliamentary constitutional monarchy',
      headOfState: 'Queen Ysolde III',
      gdpUsd: 512_000_000_000,
      currency: 'Calder mark',
      currencyCode: 'CWM',
      headOfGovernment: 'First Minister Corin Ashdale',
      areaKm2: 148_300,
      demonym: 'Calderwynian',
      languages: ['Calderwynian', 'Low Eskish'],
      house: 'House of Maravel',
      heir: 'Prince Edric',
      law: 'Absolute primogeniture',
      calendar: 'Lantern Reckoning',
      era: 'LR',
      anthem: 'Lanterns on the Water',
      namingLanguage: 'Calderwynian',
      branches: ['Army', 'Navy', 'Air Force'],
      highestRank: 'General',
      passportColour: '#123a5a',
      drivesOn: 'left',
    });
    expect(card.seats?.total).toBe(151);
    expect(card.seats?.parties.map((party) => party.seats)).toEqual([58, 44, 27, 14, 8]);
    expect(card.timeline?.events).toHaveLength(5);
    expect(card.filled).toEqual([...SECTIONS]);
    expect(complete(card)).toBe(true);
    expect(missing(card)).toEqual([]);
  });

  it('reads the mid-sized Vantmoor', () => {
    const card = vantmoor();
    expect(card.name).toBe('Republic of Vantmoor');
    expect(card.filled).toEqual(['identity', 'flag', 'government', 'stats', 'cities']);
    expect(card.arms).toBeUndefined();
    expect(card.seats).toBeUndefined();
    expect(complete(card)).toBe(false);
    expect(missing(card)).toContain('arms');
  });

  it('reads Hesperwick, which is a name and a flag section', () => {
    const card = hesperwick();
    expect(card.name).toBe('Hesperwick');
    expect(card.commonName).toBeUndefined();
    expect(card.filled).toEqual(['flag']);
  });
});

describe('fallbacks', () => {
  it('takes the name from the common name, then from meta', () => {
    expect(readCard({ identity: { commonName: 'Teland' } }).name).toBe('Teland');
    expect(readCard({ meta: { nation: 'Teland' } }).name).toBe('Teland');
    expect(displayName(readCard({}))).toBe('Unnamed nation');
  });

  it('takes the head of state from the dynasty when the government names none', () => {
    expect(readCard({ dynasty: { monarch: 'Queen Ilsa I' } }).headOfState).toBe('Queen Ilsa I');
    expect(readCard({ dynasty: { monarch: 'Queen Ilsa I' }, government: { headOfState: 'Regent Orla' } }).headOfState).toBe('Regent Orla');
  });

  it('takes the capital from the cities when identity names none', () => {
    const cities = { list: [{ name: 'Portmere', population: 900 }, { name: 'Selunna', population: 500, capital: true }] };
    const card = readCard({ cities });
    expect(card.capital).toBe('Selunna');
    expect(card.largestCity).toEqual({ name: 'Portmere', population: 900 });
    expect(readCard({ cities, identity: { capital: 'Oldtown' } }).capital).toBe('Oldtown');
  });

  it('finds the largest city by its number, not its place in the list', () => {
    const card = readCard({ cities: { list: [{ name: 'Small', population: 10 }, { name: 'Big', population: 99 }] } });
    expect(card.largestCity?.name).toBe('Big');
  });

  it('works out the flag ratio from the stated ratio, then the viewBox, then a default', () => {
    const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 200"></svg>';
    expect(readCard({ flag: { svg, ratio: '3:5' } }).flag?.ratio).toBeCloseTo(5 / 3);
    expect(readCard({ flag: { svg } }).flag?.ratio).toBe(2);
    expect(readCard({ flag: { svg: '<svg xmlns="http://www.w3.org/2000/svg" width="90" height="60"></svg>' } }).flag?.ratio).toBe(1.5);
    expect(readCard({ flag: { svg: '<svg xmlns="http://www.w3.org/2000/svg"></svg>' } }).flag?.ratio).toBe(1.5);
    expect(readCard({ flag: { svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1 9999"></svg>' } }).flag?.ratio).toBe(0.2);
  });
});

describe('seats', () => {
  it('sorts parties largest first and never states fewer seats than the parties hold', () => {
    const card = readCard({ seats: { total: 10, parties: [{ name: 'B', seats: 4 }, { name: 'A', seats: 9 }] } });
    expect(card.seats?.parties.map((party) => party.name)).toEqual(['A', 'B']);
    expect(card.seats?.total).toBe(13);
  });

  it('folds the smallest parties into Others', () => {
    const parties = Array.from({ length: 30 }, (_, index) => ({ name: `Party ${index}`, seats: 30 - index }));
    const seats = readCard({ seats: { parties } }).seats;
    expect(seats?.parties).toHaveLength(MAX_PARTIES);
    expect(seats?.parties.at(-1)?.name).toBe('Others');
    expect(seats?.parties.reduce((sum, party) => sum + party.seats, 0)).toBe(465);
    expect(seats?.total).toBe(465);
  });

  it('drops parties without a name, a whole number of seats, or any seats', () => {
    const seats = readCard({
      seats: { total: 5, parties: [{ seats: 3 }, { name: 'Half', seats: 1.5 }, { name: 'None', seats: 0 }, { name: 'Text', seats: '4' }] },
    }).seats;
    expect(seats).toEqual({ total: 5, parties: [] });
  });

  it('borrows the chamber name from the government', () => {
    expect(readCard({ government: { legislature: 'The Moot' }, seats: { total: 9 } }).seats?.chamber).toBe('The Moot');
  });

  it('is nothing without seats', () => {
    expect(readCard({ seats: { chamber: 'The Moot' } }).seats).toBeUndefined();
  });
});

describe('timeline', () => {
  it('sorts events and keeps an even spread of a long list, first and last included', () => {
    const events = Array.from({ length: 50 }, (_, index) => ({ year: 2000 - index, title: `Event ${index}` }));
    const timeline = readCard({ timeline: { events } }).timeline;
    expect(timeline?.events).toHaveLength(MAX_EVENTS);
    expect(timeline?.events[0]?.year).toBe(1951);
    expect(timeline?.events.at(-1)?.year).toBe(2000);
    const years = timeline?.events.map((event) => event.year) ?? [];
    expect([...years].sort((a, b) => a - b)).toEqual(years);
  });

  it('spreads evenly', () => {
    expect(spread([1, 2, 3], 5)).toEqual([1, 2, 3]);
    expect(spread([1, 2, 3, 4, 5, 6, 7, 8, 9], 3)).toEqual([1, 5, 9]);
    expect(spread([1, 2, 3], 1)).toEqual([1]);
    expect(spread([1, 2, 3], 0)).toEqual([]);
  });
});

describe('which sections are filled', () => {
  it('does not count a section that holds only a link and a date', () => {
    const card = readCard({ arms: { link: 'https://arms.eurth.org/', updated: '2026-11-04T14:48:30.000Z' } });
    expect(card.filled).toEqual([]);
  });

  it('counts a section with only a summary', () => {
    expect(readCard({ names: { summary: 'Soft vowels, hard endings.' } }).filled).toEqual(['names']);
  });

  it('does not count empty texts and empty lists', () => {
    expect(readCard({ names: { language: '  ', places: [] }, anthem: { title: '' } }).filled).toEqual([]);
  });

  it('counts each section of Calderwyn on its own', () => {
    for (const name of SECTIONS) expect(readCard(oneSection(name)).filled).toEqual([name]);
  });
});

describe("someone else's input", () => {
  it('gives an empty card for anything that is no profile', () => {
    for (const input of [null, undefined, 42, 'profile', [], [1, 2], true, () => 1]) {
      expect(readCard(input)).toEqual({ name: '', filled: [] });
    }
  });

  it('gives an empty card for sections of the wrong shape', () => {
    const card = readCard({ meta: 'x', identity: [], flag: 7, seats: 'many', timeline: null, cities: { list: {} } });
    expect(card).toEqual({ name: '', filled: [] });
  });

  it('keeps markup as plain text, to be escaped when drawn', () => {
    expect(readCard({ identity: { officialName: '<script>alert(1)</script>' } }).name).toBe('<script>alert(1)</script>');
  });

  it('strips control characters and the marks that reorder text', () => {
    const card = readCard({ identity: { officialName: 'Tel\u0000and‮⁦ of\n\tthe  North﻿' } });
    expect(card.name).toBe('Teland of the North');
  });

  it('drops lone surrogates but keeps whole characters', () => {
    expect(readCard({ identity: { officialName: 'A\ud83dB 🌍' } }).name).toBe('AB 🌍');
  });

  it('cuts text to its limit', () => {
    const card = readCard({ identity: { officialName: 'x'.repeat(5000), motto: 'm'.repeat(5000) } });
    expect(card.name).toHaveLength(80);
    expect(card.motto).toHaveLength(200);
  });

  it('ignores numbers that are text, not finite, or out of range', () => {
    const card = readCard({
      stats: { population: '12', areaKm2: Number.NaN, gdpUsd: Number.POSITIVE_INFINITY, lifeExpectancy: -4, activeMilitary: 1.5, gdpGrowth: 5000 },
    });
    expect(card).toEqual({ name: '', filled: ['stats'] });
  });

  it('turns away SVG that is not SVG, is too big, or carries a document type', () => {
    const bad = [
      'hello',
      '<html><svg></svg></html>',
      '<svgx></svgx>',
      '<!DOCTYPE svg [<!ENTITY a "aaaa">]><svg></svg>',
      '<svg><!ENTITY x "y"></svg>',
      `<svg>${' '.repeat(600_000)}</svg>`,
      42,
      null,
    ];
    for (const svg of bad) expect(readCard({ flag: { svg } }).flag).toBeUndefined();
  });

  it('keeps a script inside SVG as text: it only ever goes into an image', () => {
    const svg = '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>';
    expect(readCard({ flag: { svg } }).flag?.svg).toBe(svg);
  });

  it('adds the namespace an image needs', () => {
    expect(readCard({ arms: { svg: '<?xml version="1.0"?>\n<svg viewBox="0 0 10 12"><path/></svg>' } }).arms).toEqual({
      svg: '<?xml version="1.0"?>\n<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 12"><path/></svg>',
      ratio: 0.833,
    });
  });

  it('only takes colours that are six-digit hex codes', () => {
    expect(readCard({ passport: { colour: 'red' } }).passportColour).toBeUndefined();
    expect(readCard({ passport: { colour: '#ABCDEF' } }).passportColour).toBe('#abcdef');
    expect(readCard({ passport: { colour: 'url(javascript:1)' } }).passportColour).toBeUndefined();
  });

  it('only takes left or right for the side of the road', () => {
    expect(readCard({ wiki: { drivesOn: 'up' } }).drivesOn).toBeUndefined();
  });

  it('is not fooled by keys from the object prototype', () => {
    const profile = JSON.parse('{"__proto__": {"identity": {"officialName": "Evil"}}, "constructor": {"x": 1}}') as unknown;
    expect(readCard(profile).name).toBe('');
    expect(({} as Record<string, unknown>).identity).toBeUndefined();
  });

  it('does not change what it is given', () => {
    const profile = example('calderwyn');
    const before = JSON.stringify(profile);
    readCard(profile);
    expect(JSON.stringify(profile)).toBe(before);
  });

  it('reads the same card twice', () => {
    expect(calderwyn()).toEqual(calderwyn());
    expect(bare()).toEqual({ name: 'Nowhere', filled: [] });
  });
});
