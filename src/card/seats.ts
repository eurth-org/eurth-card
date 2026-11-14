// The seat chart: a half-circle of dots, one per seat, filled party by party from the left.
// Positions come out as plain numbers in a box one unit wide, for the layout to scale.

import { group } from './format.ts';
import type { Seats } from './model.ts';

/** Above this many seats a dot stands for several, so the chart stays readable when small. */
export const MAX_DOTS = 360;

export interface SeatGroup {
  name: string;
  seats: number;
  /** A six-digit hex code. Without one, the drawing picks a grey of its own lightness. */
  colour?: string;
  /** Seats no listed party holds: drawn hollow, so they differ by shape and not by colour. */
  unassigned?: boolean;
}

export interface SeatDot {
  /** Centre, in a box 1 wide and `aspect` high, from the top left. */
  x: number;
  y: number;
  /** Index into `groups`. */
  group: number;
}

export interface SeatChart {
  dots: SeatDot[];
  /** Dot radius, in the same units. */
  radius: number;
  /** Height of the box, as a share of its width. */
  aspect: number;
  groups: SeatGroup[];
  total: number;
  /** 1 unless the chamber is larger than MAX_DOTS. */
  seatsPerDot: number;
  rows: number;
}

const INNER = 0.4;

/** How many dots each row of a half-circle holds, for a given number of rows. */
function capacities(rows: number): { radius: number; capacity: number }[] {
  if (rows === 1) return [{ radius: 1, capacity: 7 }];
  const gap = (1 - INNER) / (rows - 1);
  return Array.from({ length: rows }, (_, row) => {
    const radius = INNER + row * gap;
    return { radius, capacity: Math.floor((Math.PI * radius) / gap) + 1 };
  });
}

/** Shares `total` between weights, whole numbers only, by largest remainder. */
export function apportion(weights: readonly number[], total: number): number[] {
  const sum = weights.reduce((a, b) => a + b, 0);
  if (sum <= 0) return weights.map(() => 0);
  const exact = weights.map((weight) => (weight * total) / sum);
  const out = exact.map(Math.floor);
  let left = total - out.reduce((a, b) => a + b, 0);
  const order = exact
    .map((value, index) => ({ index, remainder: value - Math.floor(value) }))
    .sort((a, b) => b.remainder - a.remainder || a.index - b.index);
  for (let i = 0; left > 0 && i < order.length; i++, left--) {
    const slot = order[i];
    if (slot) out[slot.index] = (out[slot.index] ?? 0) + 1;
  }
  return out;
}

/** The chart for a chamber. */
export function seatChart(seats: Seats): SeatChart {
  const groups: SeatGroup[] = seats.parties.map((party) => ({ ...party }));
  const held = groups.reduce((sum, group) => sum + group.seats, 0);
  const total = Math.max(seats.total, held);
  if (total > held) groups.push({ name: held === 0 ? 'Seats' : 'Other seats', seats: total - held, unassigned: true });

  const seatsPerDot = Math.ceil(total / MAX_DOTS);
  const dotTotal = seatsPerDot === 1 ? total : Math.max(1, Math.round(total / seatsPerDot));
  const perGroup = seatsPerDot === 1 ? groups.map((group) => group.seats) : apportion(groups.map((group) => group.seats), dotTotal);

  let rows = 1;
  let layout = capacities(rows);
  while (layout.reduce((sum, row) => sum + row.capacity, 0) < dotTotal) layout = capacities(++rows);

  const perRow = rows === 1 ? [dotTotal] : apportion(layout.map((row) => row.capacity), dotTotal);
  const gap = rows === 1 ? (dotTotal > 1 ? Math.PI / (dotTotal - 1) : 1) : (1 - INNER) / (rows - 1);
  const radius = Math.min(0.42 * gap, 0.16);

  const placed: { angle: number; ring: number }[] = [];
  layout.forEach((row, index) => {
    const count = perRow[index] ?? 0;
    for (let i = 0; i < count; i++) {
      placed.push({ angle: count === 1 ? Math.PI / 2 : Math.PI - (i * Math.PI) / (count - 1), ring: row.radius });
    }
  });
  // Left to right, so each party fills a wedge.
  placed.sort((a, b) => b.angle - a.angle || a.ring - b.ring);

  const width = 2 + 2 * radius;
  const owners: number[] = [];
  perGroup.forEach((count, group) => {
    for (let i = 0; i < count; i++) owners.push(group);
  });
  const dots = placed.map((dot, index) => ({
    x: (dot.ring * Math.cos(dot.angle) + 1 + radius) / width,
    y: (1 + radius - dot.ring * Math.sin(dot.angle)) / width,
    group: owners[index] ?? groups.length - 1,
  }));

  return {
    dots,
    radius: radius / width,
    aspect: (1 + 2 * radius) / width,
    groups,
    total,
    seatsPerDot,
    rows,
  };
}

/** "The Moot · 151 seats", and what a dot stands for when it isn't one seat. */
export function seatCaption(seats: Seats, chart: SeatChart): string {
  const count = `${group(chart.total)} ${chart.total === 1 ? 'seat' : 'seats'}`;
  const scale = chart.seatsPerDot > 1 ? ` · each dot is ${chart.seatsPerDot} seats` : '';
  return `${seats.chamber ? `${seats.chamber} · ` : ''}${count}${scale}`;
}
