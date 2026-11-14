import { describe, expect, it } from 'vitest';
import { MAX_DOTS, apportion, seatCaption, seatChart } from '../src/card/seats.ts';
import type { Seats } from '../src/card/model.ts';
import { calderwyn } from './helpers.ts';

const chamber = (total: number, parties: [string, number][] = []): Seats => ({
  total,
  parties: parties.map(([name, seats]) => ({ name, seats })),
});

describe('apportion', () => {
  it('shares whole numbers by largest remainder', () => {
    expect(apportion([1, 1, 1], 10)).toEqual([4, 3, 3]);
    expect(apportion([58, 44, 27, 14, 8], 151)).toEqual([58, 44, 27, 14, 8]);
    expect(apportion([0, 0], 5)).toEqual([0, 0]);
    expect(apportion([3, 1], 0)).toEqual([0, 0]);
  });
});

describe('the seat chart', () => {
  it('draws one dot per seat for Calderwyn, party by party from the left', () => {
    const seats = calderwyn().seats as Seats;
    const chart = seatChart(seats);
    expect(chart.dots).toHaveLength(151);
    expect(chart.seatsPerDot).toBe(1);
    expect(chart.groups.map((group) => group.seats)).toEqual([58, 44, 27, 14, 8]);
    const counts = chart.groups.map((_, index) => chart.dots.filter((dot) => dot.group === index).length);
    expect(counts).toEqual([58, 44, 27, 14, 8]);
    // The largest party sits on the left, the smallest on the right.
    const mean = (group: number): number => {
      const xs = chart.dots.filter((dot) => dot.group === group).map((dot) => dot.x);
      return xs.reduce((a, b) => a + b, 0) / xs.length;
    };
    expect(mean(0)).toBeLessThan(mean(1));
    expect(mean(1)).toBeLessThan(mean(2));
    expect(mean(3)).toBeLessThan(mean(4));
  });

  it.each([1, 2, 3, 7, 8, 9, 24, 25, 60, 100, 120, 151, 200, 349, 360])('fits %i seats inside its box without touching', (total) => {
    const chart = seatChart(chamber(total, [['A', Math.ceil(total / 2)]]));
    expect(chart.dots).toHaveLength(total);
    for (const dot of chart.dots) {
      expect(dot.x - chart.radius).toBeGreaterThanOrEqual(-1e-9);
      expect(dot.x + chart.radius).toBeLessThanOrEqual(1 + 1e-9);
      expect(dot.y - chart.radius).toBeGreaterThanOrEqual(-1e-9);
      expect(dot.y + chart.radius).toBeLessThanOrEqual(chart.aspect + 1e-9);
    }
    let closest = Infinity;
    for (let a = 0; a < chart.dots.length; a++) {
      for (let b = a + 1; b < chart.dots.length; b++) {
        const one = chart.dots[a]!;
        const other = chart.dots[b]!;
        closest = Math.min(closest, Math.hypot(one.x - other.x, one.y - other.y));
      }
    }
    if (total > 1) expect(closest).toBeGreaterThan(chart.radius * 2);
  });

  it('is symmetrical', () => {
    const chart = seatChart(chamber(120));
    const left = chart.dots.filter((dot) => dot.x < 0.5 - 1e-9).length;
    const right = chart.dots.filter((dot) => dot.x > 0.5 + 1e-9).length;
    expect(left).toBe(right);
  });

  it('adds a hollow group for seats no party holds', () => {
    const chart = seatChart(chamber(100, [['A', 60]]));
    expect(chart.groups).toEqual([
      { name: 'A', seats: 60 },
      { name: 'Other seats', seats: 40, unassigned: true },
    ]);
    expect(chart.dots.filter((dot) => dot.group === 1)).toHaveLength(40);
  });

  it('draws a chamber with no parties as seats alone', () => {
    const chart = seatChart(chamber(30));
    expect(chart.groups).toEqual([{ name: 'Seats', seats: 30, unassigned: true }]);
    expect(chart.dots).toHaveLength(30);
  });

  it('lets a dot stand for several seats in a very large chamber', () => {
    const chart = seatChart(chamber(2980, [['A', 2100], ['B', 880]]));
    expect(chart.seatsPerDot).toBe(9);
    expect(chart.dots.length).toBeLessThanOrEqual(MAX_DOTS);
    expect(chart.dots).toHaveLength(331);
    expect(chart.total).toBe(2980);
    const a = chart.dots.filter((dot) => dot.group === 0).length;
    expect(a / chart.dots.length).toBeCloseTo(2100 / 2980, 2);
    expect(seatCaption({ ...chamber(2980), chamber: 'Congress' }, chart)).toBe('Congress · 2,980 seats · each dot is 9 seats');
  });

  it('captions the chart', () => {
    const seats = calderwyn().seats as Seats;
    expect(seatCaption(seats, seatChart(seats))).toBe('The Moot · 151 seats');
    expect(seatCaption(chamber(1), seatChart(chamber(1)))).toBe('1 seat');
  });
});
