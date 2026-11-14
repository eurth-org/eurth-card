// Where everything goes. One function from a card's data, a format and a layout to a list of
// placed boxes: plain numbers, no drawing, no colours. The same list feeds the SVG, a canvas,
// and the tests that check nothing overlaps or falls off the card.

import { facts as allFacts, type Fact, type FactId } from './facts.ts';
import * as format from './format.ts';
import { formatOf, layoutOf, type FormatId, type LayoutId } from './formats.ts';
import { complete, displayName, type CardData, type Picture, type TimelineEvent } from './model.ts';
import { spread } from './read.ts';
import { seatCaption, seatChart, type SeatChart } from './seats.ts';
import { estimate, fit, type Measure } from './text.ts';

export interface TextBox {
  kind: 'text';
  /** What the text is: 'name', 'motto', 'label', 'value', 'caption', 'legend', 'year', 'event', 'credit'. */
  role: string;
  x: number;
  y: number;
  w: number;
  h: number;
  lines: string[];
  size: number;
  lineHeight: number;
  weight: 400 | 700;
  align: 'start' | 'middle' | 'end';
  tone: 'text' | 'muted';
  italic?: boolean;
  mono?: boolean;
  /** Space after every character, in ems. */
  tracking?: number;
}

export interface PictureBox {
  kind: 'picture';
  which: 'flag' | 'arms';
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface SeatsBox {
  kind: 'seats';
  x: number;
  y: number;
  w: number;
  h: number;
  chart: SeatChart;
}

export interface SwatchBox {
  kind: 'swatch';
  x: number;
  y: number;
  w: number;
  h: number;
  /** A hex colour, or a group of the seat chart. */
  fill: string | { group: number };
  round: boolean;
}

/** A thin line: under a row, along the timeline. */
export interface RuleBox {
  kind: 'rule';
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

/** A small disc that marks an event on the timeline. */
export interface MarkBox {
  kind: 'mark';
  x: number;
  y: number;
  r: number;
}

export type Box = TextBox | PictureBox | SeatsBox | SwatchBox | RuleBox | MarkBox;

export interface Placed {
  width: number;
  height: number;
  format: FormatId;
  layout: LayoutId;
  boxes: Box[];
  /** Every section filled: the card gets its gold edge, drawn as a double line `frame` in from the sides. */
  gold: boolean;
  frame: number;
  /** What made it onto the card. */
  shown: { facts: FactId[]; seats: boolean; legend: boolean; events: number };
  /** False only when even the barest card was too tall for the format. */
  fits: boolean;
}

export interface LayoutOptions {
  format?: FormatId;
  layout?: LayoutId;
  /** A real text measure, from the browser. Default: the estimate. */
  measure?: Measure;
}

/** Something with a size that can be put somewhere. */
interface Block {
  w: number;
  h: number;
  at(x: number, y: number): Box[];
}

interface Plan {
  facts: number;
  seats: boolean;
  legend: boolean;
  events: number;
  /** Smaller pictures and closer parts, tried before a key fact has to go. */
  tight: boolean;
}

interface Tune {
  /** The gap between the card's main parts. */
  gap: number;
  /** How tall the pictures are, where the layout lets them grow. */
  picture: number;
}

interface Context {
  data: CardData;
  facts: Fact[];
  chart?: SeatChart;
  measure: Measure;
  /** Scale: 1 on a card 1080 wide. */
  k: number;
  layout: LayoutId;
  /** Content width and height. */
  cw: number;
  ch: number;
  shape: 'wide' | 'square' | 'tall';
}

const NOTHING: Block = { w: 0, h: 0, at: () => [] };

const round = (value: number): number => Math.round(value * 100) / 100;

function px(context: Context, value: number): number {
  return round(value * context.k);
}

// ---------------------------------------------------------------------------------------------
// Combinators

function stack(blocks: Block[], gap: number, align: 'start' | 'center' = 'start', width?: number): Block {
  const parts = blocks.filter((block) => block.h > 0);
  if (parts.length === 0) return NOTHING;
  const w = width ?? Math.max(...parts.map((block) => block.w));
  const h = parts.reduce((sum, block) => sum + block.h, 0) + gap * (parts.length - 1);
  return {
    w,
    h,
    at(x, y) {
      const out: Box[] = [];
      let top = y;
      for (const block of parts) {
        out.push(...block.at(align === 'center' ? x + (w - block.w) / 2 : x, top));
        top += block.h + gap;
      }
      return out;
    },
  };
}

function row(blocks: Block[], gap: number, align: 'start' | 'center' = 'center'): Block {
  const parts = blocks.filter((block) => block.h > 0);
  if (parts.length === 0) return NOTHING;
  const w = parts.reduce((sum, block) => sum + block.w, 0) + gap * (parts.length - 1);
  const h = Math.max(...parts.map((block) => block.h));
  return {
    w,
    h,
    at(x, y) {
      const out: Box[] = [];
      let left = x;
      for (const block of parts) {
        out.push(...block.at(left, align === 'center' ? y + (h - block.h) / 2 : y));
        left += block.w + gap;
      }
      return out;
    },
  };
}

/** A block set in a wider or taller space. */
function within(block: Block, w: number, h: number = block.h): Block {
  if (block.h === 0) return NOTHING;
  return { w, h, at: (x, y) => block.at(x + (w - block.w) / 2, y + (h - block.h) / 2) };
}

// ---------------------------------------------------------------------------------------------
// The pieces

interface TextOptions {
  role: string;
  w: number;
  size: number;
  min?: number;
  lines?: number;
  weight?: 400 | 700;
  align?: 'start' | 'middle' | 'end';
  tone?: 'text' | 'muted';
  italic?: boolean;
  mono?: boolean;
  caps?: boolean;
  leading?: number;
}

function text(context: Context, content: string, options: TextOptions): Block {
  const tracking = options.caps ? 0.08 : 0;
  const fitted = fit(options.caps ? content.toUpperCase() : content, {
    width: options.w,
    size: options.size,
    minSize: options.min,
    maxLines: options.lines ?? 1,
    weight: options.weight,
    mono: options.mono,
    tracking,
    measure: context.measure,
  });
  const size = round(fitted.size);
  const lineHeight = Math.round(size * (options.leading ?? 1.25));
  const h = fitted.lines.length * lineHeight;
  const w = options.w;
  return {
    w,
    h,
    at(x, y) {
      const box: TextBox = {
        kind: 'text',
        role: options.role,
        x: round(x),
        y: round(y),
        w: round(w),
        h,
        lines: fitted.lines,
        size,
        lineHeight,
        weight: options.weight ?? 400,
        align: options.align ?? 'start',
        tone: options.tone ?? 'text',
      };
      if (options.italic) box.italic = true;
      if (options.mono) box.mono = true;
      if (tracking) box.tracking = tracking;
      return [box];
    },
  };
}

function picture(which: 'flag' | 'arms', w: number, h: number): Block {
  return { w, h, at: (x, y) => [{ kind: 'picture', which, x: round(x), y: round(y), w: round(w), h: round(h) }] };
}

/** One picture, as large as a box allows. */
function pictureIn(which: 'flag' | 'arms', source: Picture | undefined, maxW: number, maxH: number): Block {
  if (!source || maxW <= 0 || maxH <= 0) return NOTHING;
  const h = Math.min(maxH, maxW / source.ratio);
  return picture(which, h * source.ratio, h);
}

/** Flag and arms side by side at one height, shrunk together if they would be too wide. */
function pictures(context: Context, height: number, maxW: number): Block {
  const { flag, arms } = context.data;
  if (!flag && !arms) return NOTHING;
  const gap = flag && arms ? px(context, 24) : 0;
  const natural = (flag ? height * flag.ratio : 0) + (arms ? height * arms.ratio : 0);
  const h = natural + gap > maxW ? (height * (maxW - gap)) / natural : height;
  return row(
    [flag ? picture('flag', h * flag.ratio, h) : NOTHING, arms ? picture('arms', h * arms.ratio, h) : NOTHING],
    gap,
  );
}

function nameAndMotto(context: Context, w: number, align: 'start' | 'middle', lines: number, size = 60): Block {
  const name = text(context, displayName(context.data), {
    role: 'name',
    w,
    size: px(context, size),
    min: px(context, size * 0.56),
    lines,
    weight: 700,
    align,
    leading: 1.15,
  });
  const motto = context.data.motto
    ? text(context, context.data.motto, {
        role: 'motto',
        w,
        size: px(context, 28),
        min: px(context, 22),
        lines: 2,
        italic: true,
        tone: 'muted',
        align,
      })
    : NOTHING;
  return stack([name, motto], px(context, 8), 'start', w);
}

function factCell(context: Context, fact: Fact, w: number): Block {
  const label = text(context, fact.label, { role: 'label', w, size: px(context, 17), weight: 700, tone: 'muted', caps: true });
  const size = px(context, 30);
  const swatch = fact.swatch ? Math.round(size * 0.8) : 0;
  const offset = swatch ? swatch + px(context, 12) : 0;
  const value = text(context, fact.value, { role: 'value', w: w - offset, size, min: px(context, 23), lines: 2 });
  const h = label.h + px(context, 3) + value.h;
  return {
    w,
    h,
    at(x, y) {
      const top = y + label.h + px(context, 3);
      const out = [...label.at(x, y), ...value.at(x + offset, top)];
      const first = value.at(0, 0)[0] as TextBox;
      if (fact.swatch) {
        out.push({
          kind: 'swatch',
          x: round(x),
          y: round(top + (first.lineHeight - swatch) / 2),
          w: swatch,
          h: swatch,
          fill: fact.swatch,
          round: false,
        });
      }
      return out;
    },
  };
}

/** The facts in a grid, filled row by row. */
function factsGrid(context: Context, list: Fact[], w: number): Block {
  if (list.length === 0) return NOTHING;
  const columns = Math.min(list.length, w >= px(context, 1100) ? 3 : w >= px(context, 560) ? 2 : 1);
  const gap = px(context, 40);
  const cell = (w - gap * (columns - 1)) / columns;
  const rows: Block[] = [];
  for (let start = 0; start < list.length; start += columns) {
    const cells = list.slice(start, start + columns).map((fact) => factCell(context, fact, cell));
    rows.push(row(cells, gap, 'start'));
  }
  return stack(rows, px(context, 18), 'start', w);
}

/** The facts one to a row, label on the left, a line under each. */
function factsRows(context: Context, list: Fact[], w: number): Block {
  if (list.length === 0) return NOTHING;
  const labelW = Math.round(w * 0.34);
  const between = px(context, 20);
  const pad = px(context, 10);
  const rows = list.map((fact) => {
    const size = px(context, 27);
    const swatch = fact.swatch ? Math.round(size * 0.8) : 0;
    const offset = swatch ? swatch + px(context, 12) : 0;
    const label = text(context, fact.label, { role: 'label', w: labelW, size: px(context, 17), weight: 700, tone: 'muted', caps: true, lines: 2 });
    const value = text(context, fact.value, { role: 'value', w: w - labelW - between - offset, size, min: px(context, 21), lines: 2 });
    const valueLine = (value.at(0, 0)[0] as TextBox).lineHeight;
    const labelLine = (label.at(0, 0)[0] as TextBox).lineHeight;
    // The label's first line sits level with the value's first line.
    const drop = Math.max(0, (valueLine - labelLine) / 2);
    const h = Math.max(label.h + drop, value.h);
    const block: Block = {
      w,
      h,
      at(x, y) {
        const out = [...label.at(x, y + drop), ...value.at(x + labelW + between + offset, y)];
        if (fact.swatch) {
          out.push({
            kind: 'swatch',
            x: round(x + labelW + between),
            y: round(y + (valueLine - swatch) / 2),
            w: swatch,
            h: swatch,
            fill: fact.swatch,
            round: false,
          });
        }
        return out;
      },
    };
    return block;
  });
  const h = rows.reduce((sum, block) => sum + block.h, 0) + pad * 2 * (rows.length - 1);
  return {
    w,
    h,
    at(x, y) {
      const out: Box[] = [];
      let top = y;
      rows.forEach((block, index) => {
        out.push(...block.at(x, top));
        top += block.h + pad;
        if (index < rows.length - 1) {
          out.push({ kind: 'rule', x1: round(x), y1: round(top), x2: round(x + w), y2: round(top) });
          top += pad;
        }
      });
      return out;
    },
  };
}

/** The parties beside their dots: a swatch, a name and a number each. */
function legend(context: Context, chart: SeatChart, w: number, columns: number): Block {
  const groups = chart.groups.map((group, index) => ({ group, index }));
  const shown = groups.length > 6 ? groups.slice(0, 5) : groups;
  const rest = groups.length > 6 ? groups.slice(5).reduce((sum, { group }) => sum + group.seats, 0) : 0;
  const size = px(context, 19);
  const dot = Math.round(size * 0.82);
  const numberW = px(context, 62);
  const gap = px(context, 10);
  const columnGap = px(context, 36);
  const cellW = (w - columnGap * (columns - 1)) / columns;
  const entry = (name: string, seats: number, fill: SwatchBox['fill'] | undefined): Block => {
    const label = text(context, name, { role: 'legend', w: cellW - dot - gap * 2 - numberW, size });
    const count = text(context, format.group(seats), { role: 'legend', w: numberW, size, weight: 700, align: 'end' });
    return {
      w: cellW,
      h: label.h,
      at(x, y) {
        const out: Box[] = [...label.at(x + dot + gap, y), ...count.at(x + cellW - numberW, y)];
        if (fill !== undefined) {
          out.push({ kind: 'swatch', x: round(x), y: round(y + (label.h - dot) / 2), w: dot, h: dot, fill, round: true });
        }
        return out;
      },
    };
  };
  const entries = shown.map(({ group, index }) => entry(group.name, group.seats, { group: index }));
  if (rest > 0) entries.push(entry('Others', rest, undefined));
  const perColumn = Math.ceil(entries.length / columns);
  const lists: Block[] = [];
  for (let start = 0; start < entries.length; start += perColumn) {
    lists.push(stack(entries.slice(start, start + perColumn), px(context, 6), 'start', cellW));
  }
  return row(lists, columnGap, 'start');
}

function seatsBlock(context: Context, w: number, withLegend: boolean, side: boolean, maxChart = 420): Block {
  const { chart } = context;
  const seats = context.data.seats;
  if (!chart || !seats) return NOTHING;
  const chartW = Math.min(side ? w * 0.5 : w, px(context, maxChart));
  const drawing: Block = {
    w: chartW,
    h: chartW * chart.aspect,
    at: (x, y) => [{ kind: 'seats', x: round(x), y: round(y), w: round(chartW), h: round(chartW * chart.aspect), chart }],
  };
  const captionW = side ? chartW : w;
  const caption = text(context, seatCaption(seats, chart), {
    role: 'caption',
    w: captionW,
    size: px(context, 20),
    min: px(context, 16),
    lines: 2,
    tone: 'muted',
    align: 'middle',
  });
  const charted = stack([drawing, caption], px(context, 10), 'center', captionW);
  if (!withLegend) return charted;
  if (side) {
    const gap = px(context, 44);
    const key = legend(context, chart, Math.min(w - chartW - gap, px(context, 400)), 1);
    return row([charted, key], gap);
  }
  const columns = w >= px(context, 520) && chart.groups.length > 3 ? 2 : 1;
  const key = legend(context, chart, Math.min(w, px(context, columns === 2 ? 640 : 340)), columns);
  return stack([charted, key], px(context, 16), 'center', w);
}

function yearLabel(context: Context, event: TimelineEvent): string {
  return format.year(event.year, context.data.era);
}

/** The timeline along a line, one column to an event. */
function timelineStrip(context: Context, w: number, events: number): Block {
  const all = context.data.timeline?.events ?? [];
  const gap = px(context, 28);
  const room = Math.max(1, Math.floor((w + gap) / (px(context, 200) + gap)));
  const list = spread(all, Math.min(events, room));
  if (list.length === 0) return NOTHING;
  const columnW = (w - gap * (list.length - 1)) / list.length;
  const r = px(context, 7);
  const columns = list.map((event) =>
    stack(
      [
        text(context, yearLabel(context, event), { role: 'year', w: columnW, size: px(context, 23), min: px(context, 18), weight: 700 }),
        text(context, event.title, { role: 'event', w: columnW, size: px(context, 19), min: px(context, 17), lines: 3 }),
      ],
      px(context, 2),
      'start',
      columnW,
    ),
  );
  const under = row(columns, gap, 'start');
  const drop = r * 2 + px(context, 10);
  return {
    w,
    h: drop + under.h,
    at(x, y) {
      const out: Box[] = [{ kind: 'rule', x1: round(x), y1: round(y + r), x2: round(x + w), y2: round(y + r) }];
      list.forEach((_, index) => out.push({ kind: 'mark', x: round(x + index * (columnW + gap) + r), y: round(y + r), r }));
      out.push(...under.at(x, y + drop));
      return out;
    },
  };
}

/** The timeline as a list, one row to an event, down a line. */
function timelineList(context: Context, w: number, events: number): Block {
  const timeline = context.data.timeline;
  const list = spread(timeline?.events ?? [], events);
  if (list.length === 0) return NOTHING;
  const r = px(context, 7);
  const lead = r * 2 + px(context, 16);
  const yearSize = px(context, 22);
  const labels = list.map((event) => yearLabel(context, event));
  const widest = Math.max(...labels.map((label) => context.measure(label, { size: yearSize, weight: 700 })));
  const yearW = Math.min(Math.ceil(widest) + px(context, 4), Math.round(w * 0.3));
  const between = px(context, 18);
  const rows = list.map((event, index) => {
    const year = text(context, labels[index] ?? '', { role: 'year', w: yearW, size: yearSize, min: px(context, 16), weight: 700 });
    const title = text(context, event.title, { role: 'event', w: w - lead - yearW - between, size: px(context, 21), min: px(context, 18), lines: 2 });
    return { year, title, h: Math.max(year.h, title.h), line: (title.at(0, 0)[0] as TextBox).lineHeight };
  });
  const heading = timeline?.title
    ? text(context, timeline.title, { role: 'label', w, size: px(context, 17), weight: 700, tone: 'muted', caps: true })
    : NOTHING;
  const headGap = heading.h ? px(context, 12) : 0;
  const rowGap = px(context, 12);
  const h = heading.h + headGap + rows.reduce((sum, item) => sum + item.h, 0) + rowGap * (rows.length - 1);
  return {
    w,
    h,
    at(x, y) {
      const out: Box[] = [...heading.at(x, y)];
      let top = y + heading.h + headGap;
      const centres: number[] = [];
      for (const item of rows) {
        const centre = top + item.line / 2;
        centres.push(centre);
        out.push(...item.year.at(x + lead, top + (item.line - item.year.h) / 2), ...item.title.at(x + lead + yearW + between, top));
        top += item.h + rowGap;
      }
      const first = centres[0] ?? y;
      const last = centres[centres.length - 1] ?? first;
      if (last > first) out.unshift({ kind: 'rule', x1: round(x + r), y1: round(first), x2: round(x + r), y2: round(last) });
      for (const centre of centres) out.push({ kind: 'mark', x: round(x + r), y: round(centre), r });
      return out;
    },
  };
}

// ---------------------------------------------------------------------------------------------
// The three layouts, each for a wide card and for a square or tall one

type Compose = (context: Context, plan: Plan, tune: Tune) => Block;

function chosen(context: Context, plan: Plan): Fact[] {
  return context.facts.slice(0, plan.facts);
}

function timelineFor(context: Context, w: number, plan: Plan): Block {
  if (plan.events === 0) return NOTHING;
  return context.shape === 'tall' ? timelineList(context, w, plan.events) : timelineStrip(context, w, plan.events);
}

/** Classic: flag, arms, name and motto across the top; the facts in a grid; the chart beside or beneath. */
const classic: Compose = (context, plan, tune) => {
  const { cw } = context;
  const list = chosen(context, plan);
  if (context.shape === 'wide') {
    const marks = pictures(context, px(context, 118), cw * 0.4);
    const gap = marks.h ? px(context, 30) : 0;
    const header = row([marks, nameAndMotto(context, cw - marks.w - gap, 'start', 2)], gap);
    const between = px(context, 48);
    let body: Block;
    if (plan.seats && list.length > 0) {
      const seatsW = Math.min(Math.max(cw * 0.27, px(context, 250)), px(context, 380));
      body = row([factsGrid(context, list, cw - seatsW - between), seatsBlock(context, seatsW, plan.legend, false, 380)], between);
    } else if (plan.seats) {
      body = within(seatsBlock(context, cw, plan.legend, true), cw);
    } else {
      body = factsGrid(context, list, cw);
    }
    return stack([header, body, timelineFor(context, cw, plan)], tune.gap, 'start', cw);
  }
  const marks = within(pictures(context, tune.picture, cw * 0.9), cw);
  const header = stack([marks, nameAndMotto(context, cw, 'middle', 3, 64)], px(context, 22), 'start', cw);
  const seats = plan.seats ? within(seatsBlock(context, cw, plan.legend, cw >= px(context, 800)), cw) : NOTHING;
  return stack([header, factsGrid(context, list, cw), seats, timelineFor(context, cw, plan)], tune.gap, 'start', cw);
};

/** Banner: the flag as large as it goes; the name and the facts beside or beneath it. */
const banner: Compose = (context, plan, tune) => {
  const { cw, ch, data } = context;
  const list = chosen(context, plan);
  if (context.shape === 'wide') {
    const leftW = Math.round(cw * 0.36);
    const lead = data.flag
      ? pictureIn('flag', data.flag, leftW, ch * 0.5)
      : pictureIn('arms', data.arms, leftW, ch * 0.5);
    const seats = plan.seats ? seatsBlock(context, leftW, plan.legend, false, 340) : NOTHING;
    const left = stack([lead, seats], px(context, 26), 'center', leftW);
    const between = left.h ? px(context, 52) : 0;
    const rightW = cw - (left.h ? leftW + between : 0);
    const small = data.flag ? pictureIn('arms', data.arms, rightW * 0.2, px(context, 104)) : NOTHING;
    const smallGap = small.h ? px(context, 24) : 0;
    const head = row([small, nameAndMotto(context, rightW - small.w - smallGap, 'start', 2, 54)], smallGap);
    const right = stack([head, factsGrid(context, list, rightW), timelineFor(context, rightW, plan)], tune.gap, 'start', rightW);
    return row([left, right], between);
  }
  const flag = within(pictureIn('flag', data.flag, cw, tune.picture), cw);
  const arms = pictureIn('arms', data.arms, cw * 0.3, px(context, 136));
  const armsGap = arms.h ? px(context, 28) : 0;
  const head = row([arms, nameAndMotto(context, cw - arms.w - armsGap, 'start', 3, 60)], armsGap);
  const seats = plan.seats ? within(seatsBlock(context, cw, plan.legend, cw >= px(context, 800)), cw) : NOTHING;
  return stack([flag, head, factsGrid(context, list, cw), seats, timelineFor(context, cw, plan)], tune.gap, 'start', cw);
};

/** Ledger: the facts one to a row with a line under each, like the data page of a passport. */
const ledger: Compose = (context, plan, tune) => {
  const { cw } = context;
  const list = chosen(context, plan);
  if (context.shape === 'wide') {
    const hasRight = list.length > 0 || plan.events > 0;
    const leftW = hasRight ? Math.round(cw * 0.34) : cw;
    const between = px(context, 56);
    const left = stack(
      [
        nameAndMotto(context, leftW, 'middle', 3, 46),
        within(pictures(context, px(context, 116), leftW), leftW),
        plan.seats ? within(seatsBlock(context, leftW, plan.legend, false, 300), leftW) : NOTHING,
      ],
      px(context, 22),
      'start',
      leftW,
    );
    if (!hasRight) return left;
    const rightW = cw - leftW - between;
    const right = stack(
      [factsRows(context, list, rightW), plan.events ? timelineList(context, rightW, plan.events) : NOTHING],
      tune.gap,
      'start',
      rightW,
    );
    return row([left, right], between);
  }
  const header = stack(
    [nameAndMotto(context, cw, 'middle', 3, 60), within(pictures(context, tune.picture, cw * 0.8), cw)],
    px(context, 24),
    'start',
    cw,
  );
  const seats = plan.seats ? within(seatsBlock(context, cw, plan.legend, cw >= px(context, 800), 360), cw) : NOTHING;
  return stack(
    [header, factsRows(context, list, cw), seats, plan.events ? timelineList(context, cw, plan.events) : NOTHING],
    tune.gap,
    'start',
    cw,
  );
};

const COMPOSERS: Readonly<Record<LayoutId, Compose>> = { classic, banner, ledger };

/** A card with a name and nothing to go with it: the name, in the middle. */
const alone: Compose = (context) => nameAndMotto(context, context.cw, 'middle', 4, 72);

// ---------------------------------------------------------------------------------------------
// Choosing what fits

/** A card is a card, not a spreadsheet: the most facts a format takes, however much room is left. */
function mostFacts(context: Context): number {
  if (context.shape === 'tall') return context.layout === 'ledger' ? 14 : 12;
  return 8;
}

/** How many events a format shows at most. */
function mostEvents(context: Context): number {
  return Math.min(context.data.timeline?.events.length ?? 0, context.shape === 'tall' ? 6 : 5);
}

/**
 * What to try, fullest first. Things leave in the order they are least missed: the extra facts,
 * the parties' names, the timeline, some of the air, key facts down to four, the chart, and then
 * the rest.
 */
function* plans(context: Context): Generator<Plan> {
  const keys = context.facts.filter((fact) => fact.key).length;
  const plan: Plan = {
    facts: Math.min(context.facts.length, mostFacts(context)),
    seats: Boolean(context.chart),
    legend: Boolean(context.chart && context.chart.groups.length > 1),
    events: mostEvents(context),
    tight: false,
  };
  yield { ...plan };
  while (plan.facts > Math.max(keys, 1)) {
    plan.facts--;
    yield { ...plan };
  }
  if (plan.legend) {
    plan.legend = false;
    yield { ...plan };
  }
  while (plan.events > 0) {
    plan.events = plan.events > 3 ? 3 : 0;
    yield { ...plan };
  }
  plan.tight = true;
  yield { ...plan };
  while (plan.facts > 4) {
    plan.facts--;
    yield { ...plan };
  }
  if (plan.seats) {
    plan.seats = false;
    yield { ...plan };
  }
  while (plan.facts > 0) {
    plan.facts--;
    yield { ...plan };
  }
}

/** Lays a card out. Never throws; `fits` says whether everything stayed on the card. */
export function layout(data: CardData, options: LayoutOptions = {}): Placed {
  const size = formatOf(options.format);
  const layoutId = layoutOf(options.layout);
  const { width, height } = size;
  const k = Math.min(width, height * 1.6) / 1080;
  const ratio = width / height;
  const pad = Math.round(Math.min(width, height) * 0.058);
  const measure = options.measure ?? estimate;

  const creditSize = round(18 * k);
  const creditLine = Math.round(creditSize * 1.25);
  let context: Context = {
    data,
    facts: allFacts(data),
    measure,
    k,
    layout: layoutId,
    cw: width - pad * 2,
    ch: height - pad * 2 - creditLine - round(10 * k),
    shape: ratio > 1.25 ? 'wide' : ratio < 0.85 ? 'tall' : 'square',
  };
  if (data.seats) context.chart = seatChart(data.seats);

  const lone = !data.flag && !data.arms && !context.chart && !data.timeline && context.facts.length === 0;
  const compose = lone ? alone : COMPOSERS[layoutId];
  const baseTune = (at: Context): Tune => ({
    gap: px(at, at.shape === 'wide' ? 28 : 34),
    picture: layoutId === 'banner' ? at.ch * 0.24 : px(at, layoutId === 'ledger' ? 150 : 190),
  });
  const tuneFor = (at: Context, tried: Plan): Tune => {
    const tune = baseTune(at);
    return tried.tight ? { gap: tune.gap * 0.7, picture: tune.picture * 0.68 } : tune;
  };
  const attempt = (at: Context, tried: Plan, tune: Tune = tuneFor(at, tried)): Block | undefined => {
    const made = compose(at, tried, tune);
    return made.h <= at.ch ? made : undefined;
  };
  const marks = (made: Block): number => made.at(0, 0).filter((box) => box.kind === 'mark').length;

  // First, the fullest plan that fits.
  let plan: Plan = { facts: 0, seats: false, legend: false, events: 0, tight: true };
  let block = NOTHING;
  let fits = false;
  for (plan of plans(context)) {
    const made = attempt(context, plan);
    block = made ?? compose(context, plan, tuneFor(context, plan));
    if (made) {
      fits = true;
      break;
    }
  }

  if (fits) {
    // Dropping one thing can leave room for another that went earlier: put back what fits.
    const better = (next: Plan): boolean => {
      const made = attempt(context, next);
      if (!made) return false;
      plan = next;
      block = made;
      return true;
    };
    if (plan.seats && !plan.legend && (context.chart?.groups.length ?? 0) > 1) better({ ...plan, legend: true });
    if (plan.events < mostEvents(context)) {
      if (!better({ ...plan, events: mostEvents(context) }) && plan.events < 3 && mostEvents(context) > 3) {
        better({ ...plan, events: 3 });
      }
    }
    while (plan.facts < Math.min(context.facts.length, mostFacts(context)) && better({ ...plan, facts: plan.facts + 1 }));
    if (plan.tight) better({ ...plan, tight: false });

    // A card with little on it says it larger.
    const events = marks(block);
    for (let zoom = lone ? 2.2 : 1.7; zoom > 1.001 && !plan.tight; zoom -= 0.05) {
      const larger: Context = { ...context, k: k * zoom };
      const made = attempt(larger, plan);
      // Larger type must not push an event off the timeline.
      if (made && marks(made) >= events) {
        context = larger;
        block = made;
        break;
      }
    }

    // Room still to spare goes to the pictures first, then to the gaps; the rest centres the card.
    let tune = tuneFor(context, plan);
    if (context.shape !== 'wide' && (data.flag || data.arms)) {
      const tallest = layoutId === 'banner' ? context.ch * 0.42 : Math.min(context.ch * 0.3, px(context, 440));
      const grown: Tune = { ...tune, picture: Math.max(tune.picture, Math.min(tallest, tune.picture + (context.ch - block.h) * 0.6)) };
      const made = attempt(context, plan, grown);
      if (made) {
        block = made;
        tune = grown;
      }
    }
    if (block.h < context.ch) {
      const wider: Tune = { ...tune, gap: Math.min(tune.gap * 2.2, tune.gap + (context.ch - block.h) / 4) };
      const made = attempt(context, plan, wider);
      if (made) block = made;
    }
  }

  const top = pad + Math.max(0, (context.ch - block.h) / 2);
  const boxes = block.at(pad + (context.cw - block.w) / 2, top);
  boxes.push({
    kind: 'text',
    role: 'credit',
    x: pad,
    y: height - pad - creditLine,
    w: context.cw,
    h: creditLine,
    lines: ['card.eurth.org'],
    size: creditSize,
    lineHeight: creditLine,
    weight: 400,
    align: 'end',
    tone: 'muted',
    mono: true,
  });

  return {
    width,
    height,
    format: size.id,
    layout: layoutId,
    boxes,
    gold: complete(data),
    frame: Math.round(pad * 0.42),
    shown: {
      facts: chosen(context, plan).map((fact) => fact.id),
      seats: plan.seats,
      legend: plan.seats && plan.legend,
      events: boxes.filter((box) => box.kind === 'mark').length,
    },
    fits,
  };
}
