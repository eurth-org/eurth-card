import { describe as group, expect, it } from 'vitest';
import { describe, summary, title } from '../src/card/describe.ts';
import { readCard } from '../src/card/read.ts';
import { bare, calderwyn, hesperwick, vantmoor } from './helpers.ts';

group('the card in words', () => {
  it('titles a card', () => {
    expect(title(calderwyn())).toBe('Kingdom of Calderwyn: country fact card');
    expect(title(readCard({}))).toBe('Unnamed nation: country fact card');
  });

  it('sums a card up in a line', () => {
    expect(summary(calderwyn())).toBe(
      'Kingdom of Calderwyn: capital Haldermouth, population 12.5 million, government Parliamentary constitutional monarchy, head of state Queen Ysolde III.',
    );
    expect(summary(hesperwick())).toBe('Hesperwick, on one card.');
  });

  it('describes Calderwyn from top to bottom', () => {
    const text = describe(calderwyn());
    const lines = text.split('\n');
    expect(lines.slice(0, 5)).toEqual([
      'Kingdom of Calderwyn (Calderwyn).',
      'Motto: “By tide and by lantern”.',
      'The card shows its flag and its coat of arms.',
      'Capital: Haldermouth.',
      'Population: 12.5 million.',
    ]);
    expect(lines).toContain('Currency: Calder mark (CWM).');
    expect(lines).toContain(
      'The Moot has 151 seats: Lantern Party 58, Harbour Union 44, Upland League 27, Greenwater 14, Independents 8. (General election of 2025, Sainte-Laguë.)',
    );
    expect(lines).toContain('History of Calderwyn:');
    expect(lines).toContain('1412 LR: The crowns of Calder and Wyn are joined.');
    expect(lines.at(-1)).toBe('1953 LR: Every adult gets the vote.');
  });

  it('says only what there is', () => {
    expect(describe(bare())).toBe('Nowhere.');
    expect(describe(vantmoor()).split('\n').slice(0, 3)).toEqual([
      'Republic of Vantmoor (Vantmoor).',
      'Motto: “Steady as the fen”.',
      'The card shows its flag.',
    ]);
  });

  it('counts seats no party holds, and does not double a full stop', () => {
    const text = describe(readCard({ seats: { total: 10, parties: [{ name: 'A', seats: 6 }] }, identity: { officialName: 'St. Mark Is.' } }));
    expect(text).toBe('St. Mark Is.\nThe legislature has 10 seats: A 6, other seats 4.');
    expect(describe(readCard({ seats: { total: 1 } }))).toBe('Unnamed nation.\nThe legislature has 1 seat.');
  });
});
