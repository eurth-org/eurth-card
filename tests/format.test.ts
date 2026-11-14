import { describe, expect, it } from 'vitest';
import * as format from '../src/card/format.ts';
import { KEY_FACTS, facts } from '../src/card/facts.ts';
import { readCard } from '../src/card/read.ts';
import { calderwyn, singles, vantmoor } from './helpers.ts';

describe('numbers', () => {
  it('groups thousands', () => {
    expect(format.group(0)).toBe('0');
    expect(format.group(999)).toBe('999');
    expect(format.group(1000)).toBe('1,000');
    expect(format.group(1234567)).toBe('1,234,567');
    expect(format.group(80.6, 1)).toBe('80.6');
    expect(format.group(80, 1)).toBe('80');
    expect(format.group(-1.84, 1)).toBe('−1.8');
    expect(format.group(-0.01, 1)).toBe('0');
  });

  it('writes large counts in words, to three figures', () => {
    expect(format.count(613_000)).toBe('613,000');
    expect(format.count(999_999)).toBe('999,999');
    expect(format.count(1_000_000)).toBe('1 million');
    expect(format.count(12_480_000)).toBe('12.5 million');
    expect(format.count(48_200_000)).toBe('48.2 million');
    expect(format.count(999_400_000)).toBe('999 million');
    expect(format.count(999_950_000)).toBe('1 billion');
    expect(format.count(1_940_000_000_000)).toBe('1.94 trillion');
    expect(format.count(1e16)).toBe('10,000 trillion');
    expect(format.count(0)).toBe('0');
  });

  it('writes money, area, density, per cent and years', () => {
    expect(format.money(512e9)).toBe('$512 billion');
    expect(format.money(41_026)).toBe('$41,026');
    expect(format.area(148_300)).toBe('148,300 km²');
    expect(format.area(2.02)).toBe('2 km²');
    expect(format.area(0.44)).toBe('0.4 km²');
    expect(format.density(12_480_000, 148_300)).toBe('84 per km²');
    expect(format.density(1000, 400)).toBe('2.5 per km²');
    expect(format.density(1000, 0)).toBeUndefined();
    expect(format.percent(71)).toBe('71%');
    expect(format.percent(1.84)).toBe('1.8%');
    expect(format.percent(-2.5)).toBe('−2.5%');
    expect(format.year(1412, 'LR')).toBe('1412 LR');
    expect(format.year(-300)).toBe('−300');
  });

  it('joins lists the British way', () => {
    expect(format.joinList([])).toBe('');
    expect(format.joinList(['Army'])).toBe('Army');
    expect(format.joinList(['Army', 'Navy'])).toBe('Army and Navy');
    expect(format.joinList(['Army', 'Navy', 'Air Force'])).toBe('Army, Navy and Air Force');
  });

  it('names a colour in a word', () => {
    expect(format.colourWord('#123a5a')).toBe('navy blue');
    expect(format.colourWord('#6b1f2a')).toBe('burgundy');
    expect(format.colourWord('#0b3d2e')).toBe('dark green');
    expect(format.colourWord('#000000')).toBe('black');
    expect(format.colourWord('#ffffff')).toBe('white');
    expect(format.colourWord('#d9a520')).toBe('gold');
    expect(format.colourWord('#c8102e')).toBe('red');
    expect(format.colourWord('#808080')).toBe('grey');
  });
});

describe('facts', () => {
  it('puts the six key facts first, in the card\'s order', () => {
    const list = facts(calderwyn());
    expect(list.slice(0, 6).map((fact) => fact.id)).toEqual([...KEY_FACTS]);
    expect(list.slice(0, 6).every((fact) => fact.key)).toBe(true);
    expect(list.slice(6).some((fact) => fact.key)).toBe(false);
  });

  it('states Calderwyn', () => {
    const byId = Object.fromEntries(facts(calderwyn()).map((fact) => [fact.id, fact.value]));
    expect(byId).toMatchObject({
      capital: 'Haldermouth',
      population: '12.5 million',
      government: 'Parliamentary constitutional monarchy',
      headOfState: 'Queen Ysolde III',
      gdp: '$512 billion',
      currency: 'Calder mark (CWM)',
      headOfGovernment: 'First Minister Corin Ashdale',
      area: '148,300 km²',
      density: '84 per km²',
      gdpPerPerson: '$41,026',
      languages: 'Calderwynian and Low Eskish',
      calendar: 'Lantern Reckoning (LR)',
      forces: '38,500 active: Army, Navy and Air Force',
      passport: 'Navy blue cover',
      drivesOn: 'The left',
    });
    // The seat chart names the chamber, the capital is the largest city, and the naming
    // language is one of the languages: none of them is said twice.
    expect(byId.legislature).toBeUndefined();
    expect(byId.largestCity).toBeUndefined();
    expect(byId.namingLanguage).toBeUndefined();
  });

  it('gives every fact a label and a value, and no id twice', () => {
    const list = facts(calderwyn());
    expect(list.every((fact) => fact.label && fact.value)).toBe(true);
    expect(new Set(list.map((fact) => fact.id)).size).toBe(list.length);
    expect(list.find((fact) => fact.id === 'passport')?.swatch).toBe('#123a5a');
  });

  it('says a president who heads the government once', () => {
    const ids = facts(vantmoor()).map((fact) => fact.id);
    expect(ids).toContain('headOfState');
    expect(ids).not.toContain('headOfGovernment');
    expect(ids).toContain('legislature');
  });

  it('has nothing to say about an empty card', () => {
    expect(facts(readCard({}))).toEqual([]);
  });

  it('handles halves of pairs', () => {
    expect(facts(readCard({ bank: { code: 'TLS' } }))[0]?.value).toBe('TLS');
    expect(facts(readCard({ bank: { currency: 'Selun' } }))[0]?.value).toBe('Selun');
    expect(facts(readCard({ calendar: { era: 'FS' } }))[0]?.value).toBe('FS');
    expect(facts(readCard({ stats: { population: 0, gdpUsd: 5 } })).map((fact) => fact.id)).toEqual(['population', 'gdp']);
    expect(facts(readCard({ cities: { list: [{ name: 'Portmere' }] } }))[0]?.value).toBe('Portmere');
  });

  it('finds something to say for every section that has a fact of its own', () => {
    const silent = singles()
      .filter(({ data }) => facts(data).length === 0)
      .map(({ name }) => name);
    // These four show as pictures, a chart or a strip instead.
    expect(silent).toEqual(['flag', 'arms', 'seats', 'timeline']);
  });
});
