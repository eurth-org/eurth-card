import { describe, expect, it } from 'vitest';
import { hasEdits, identityWith, withEdits } from '../src/card/edit.ts';
import { readCard } from '../src/card/read.ts';
import { bare, calderwyn, vantmoor } from './helpers.ts';

describe('editing the name, the capital and the motto', () => {
  it('leaves a card alone when nothing is typed', () => {
    expect(withEdits(calderwyn(), {})).toEqual(calderwyn());
    expect(hasEdits({})).toBe(false);
    expect(hasEdits({ motto: '' })).toBe(true);
  });

  it('lays what is typed over the profile', () => {
    const card = withEdits(calderwyn(), { name: 'Free State of Calderwyn', capital: 'Wynmere', motto: 'Onward' });
    expect(card).toMatchObject({ name: 'Free State of Calderwyn', capital: 'Wynmere', motto: 'Onward', commonName: 'Calderwyn' });
    expect(card.population).toBe(12_480_000);
  });

  it('removes what is emptied out', () => {
    const card = withEdits(calderwyn(), { capital: '  ', motto: '' });
    expect(card.capital).toBeUndefined();
    expect(card.motto).toBeUndefined();
    expect(withEdits(calderwyn(), { name: '' }).name).toBe('');
  });

  it('cleans what is typed as it cleans a file', () => {
    const card = withEdits(bare(), { name: `Te‮land${'x'.repeat(200)}`, motto: 'a\n\nb' });
    expect(card.name).toHaveLength(80);
    expect(card.name.startsWith('Teland')).toBe(true);
    expect(card.motto).toBe('a b');
  });

  it('drops a common name that only repeats the name', () => {
    expect(withEdits(calderwyn(), { name: 'Calderwyn' }).commonName).toBeUndefined();
  });

  it('counts the names and basics as filled once something is typed', () => {
    expect(withEdits(bare(), { capital: 'Selunna' }).filled).toEqual(['identity']);
    expect(withEdits(bare(), { capital: ' ' }).filled).toEqual([]);
    expect(withEdits(vantmoor(), { motto: 'x' }).filled).toEqual(vantmoor().filled);
  });

  it('does not change what it is given', () => {
    const before = calderwyn();
    withEdits(before, { name: 'X', capital: '', motto: 'Y' });
    expect(before).toEqual(calderwyn());
  });
});

describe('the section to save', () => {
  const identity = { link: 'https://wiki.eurth.org/', commonName: 'Calderwyn', officialName: 'Kingdom of Calderwyn', capital: 'Haldermouth', languages: ['Calderwynian'], future: { kept: true } };

  it('writes only what was edited and keeps every other key', () => {
    expect(identityWith(identity, { capital: 'Wynmere' })).toEqual({ ...identity, capital: 'Wynmere' });
    expect(identityWith(identity, {})).toEqual(identity);
    expect(identityWith(identity, { name: 'Free State', motto: 'Onward' })).toEqual({ ...identity, officialName: 'Free State', motto: 'Onward' });
  });

  it('removes a key that was emptied', () => {
    expect(identityWith(identity, { capital: '' })).not.toHaveProperty('capital');
  });

  it('starts a section where there was none', () => {
    expect(identityWith(undefined, { name: 'Teland' })).toEqual({ officialName: 'Teland' });
    expect(readCard({ identity: identityWith(undefined, { name: 'Teland', motto: 'Steady' }) })).toMatchObject({ name: 'Teland', motto: 'Steady' });
  });

  it('does not change the section it is given', () => {
    const copy = structuredClone(identity);
    identityWith(identity, { name: 'X', capital: '' });
    expect(identity).toEqual(copy);
  });
});
