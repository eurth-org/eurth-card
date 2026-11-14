import { describe, expect, it } from 'vitest';
import { estimate, fit, type Measure } from '../src/card/text.ts';

// A measure that is easy to reason about: every character is half its size wide.
const half: Measure = (text, { size }) => Array.from(text).length * size * 0.5;

describe('the width estimate', () => {
  it('grows with the text, the size and the weight', () => {
    expect(estimate('', { size: 20 })).toBe(0);
    expect(estimate('Haldermouth', { size: 20 })).toBeLessThan(estimate('Haldermouth town', { size: 20 }));
    expect(estimate('Haldermouth', { size: 40 })).toBeCloseTo(2 * estimate('Haldermouth', { size: 20 }));
    expect(estimate('Haldermouth', { size: 20, weight: 700 })).toBeGreaterThan(estimate('Haldermouth', { size: 20 }));
    expect(estimate('ab', { size: 10, tracking: 0.1 })).toBeCloseTo(estimate('ab', { size: 10 }) + 2);
  });

  it('knows narrow letters from wide ones', () => {
    expect(estimate('illi', { size: 20 })).toBeLessThan(estimate('mwmw', { size: 20 }));
    expect(estimate('WWWW', { size: 20 })).toBeGreaterThan(estimate('wwww', { size: 20 }));
    expect(estimate('王国', { size: 20 })).toBeGreaterThan(estimate('ab', { size: 20 }));
  });

  it('matches Arial, with a little to spare', () => {
    // Widths at 100px, read from Arial and Arial Bold themselves.
    const arial: [string, number, number][] = [
      ['Kingdom of Calderwyn', 1006.1, 1088.9],
      ['Parliamentary constitutional monarchy', 1695.2, 1850.5],
      ['POPULATION', 644.6, 655.6],
      ['12.5 million', 505.8, 544.6],
      ['$512 billion', 506.0, 544.6],
      ['Queen Ysolde III', 744.9, 778.0],
    ];
    for (const [text, regular, bold] of arial) {
      expect(estimate(text, { size: 100 }) / regular).toBeGreaterThanOrEqual(1);
      expect(estimate(text, { size: 100 }) / regular).toBeLessThan(1.03);
      expect(estimate(text, { size: 100, weight: 700 }) / bold).toBeGreaterThanOrEqual(1);
      expect(estimate(text, { size: 100, weight: 700 }) / bold).toBeLessThan(1.03);
    }
  });

  it('gives accented letters the width of the letter beneath', () => {
    expect(estimate('Sainte-Laguë', { size: 20 })).toBeCloseTo(estimate('Sainte-Lague', { size: 20 }));
    expect(estimate('e\u0301', { size: 20 })).toBeCloseTo(estimate('e', { size: 20 }));
  });
});

describe('fitting', () => {
  it('leaves short text alone', () => {
    expect(fit('Haldermouth', { width: 400, size: 20, measure: half })).toEqual({
      lines: ['Haldermouth'],
      size: 20,
      width: 110,
      clipped: false,
    });
  });

  it('wraps at spaces', () => {
    const fitted = fit('one two three four', { width: 80, size: 20, maxLines: 3, measure: half });
    expect(fitted.lines).toEqual(['one two', 'three', 'four']);
    expect(fitted.clipped).toBe(false);
  });

  it('shrinks before it cuts', () => {
    const fitted = fit('one two three four', { width: 100, size: 20, minSize: 10, maxLines: 1, measure: half });
    expect(fitted.lines).toEqual(['one two three four']);
    expect(fitted.size).toBeLessThan(20);
    expect(fitted.size).toBeGreaterThanOrEqual(10);
    expect(fitted.clipped).toBe(false);
  });

  it('cuts with an ellipsis when the smallest size is still too big', () => {
    const fitted = fit('one two three four five six', { width: 100, size: 20, minSize: 18, maxLines: 2, measure: half });
    expect(fitted.lines).toHaveLength(2);
    expect(fitted.lines[1]?.endsWith('…')).toBe(true);
    expect(fitted.clipped).toBe(true);
    for (const line of fitted.lines) expect(half(line, { size: fitted.size })).toBeLessThanOrEqual(100);
  });

  it('breaks a word that is wider than the line, but only at the smallest size', () => {
    const fitted = fit('Llanfairpwllgwyngyllgogerychwyrndrobwll', { width: 100, size: 20, minSize: 16, maxLines: 3, measure: half });
    expect(fitted.size).toBe(16);
    expect(fitted.lines.length).toBeGreaterThan(1);
    for (const line of fitted.lines) expect(half(line, { size: fitted.size })).toBeLessThanOrEqual(100);
  });

  it('breaks after a hyphen without adding a space', () => {
    const fitted = fit('Saxe-Coburg-Gotha', { width: 70, size: 20, maxLines: 3, measure: half });
    expect(fitted.lines).toEqual(['Saxe-', 'Coburg-', 'Gotha']);
    expect(fit('Saxe-Coburg-Gotha', { width: 400, size: 20, measure: half }).lines).toEqual(['Saxe-Coburg-Gotha']);
  });

  it('always gives a line that fits, even for one enormous character run', () => {
    const fitted = fit('x'.repeat(500), { width: 50, size: 20, maxLines: 1, measure: half });
    expect(fitted.lines).toHaveLength(1);
    expect(half(fitted.lines[0] ?? '', { size: 20 })).toBeLessThanOrEqual(50);
  });

  it('gives one empty line for no text', () => {
    expect(fit('', { width: 50, size: 20 }).lines).toEqual(['']);
  });
});
