// A card in a link. Nothing is stored anywhere, so the link carries the card itself: just the
// card's data (not the whole profile), under short keys, compressed, in the query string.
// A link is someone else's input, exactly as a file is: what comes out of one goes back through
// the same reader a profile does.

import * as clean from './clean.ts';
import {
  DEFAULT_FORMAT,
  DEFAULT_LAYOUT,
  DEFAULT_THEME,
  FORMATS,
  LAYOUTS,
  THEMES,
  formatOf,
  layoutOf,
  themeOf,
  type FormatId,
  type LayoutId,
  type ThemeId,
} from './formats.ts';
import { SECTIONS, type CardData, type SectionName } from './model.ts';
import { readCard } from './read.ts';

/** Raised when the packed shape changes; older versions must stay readable. */
export const LINK_VERSION = 1;

/** The query parameter that holds the card. */
export const LINK_PARAM = 'c';

/** The longest link the card will hand out, in characters: the suite's own ceiling. */
export const LINK_LIMIT = 8000;

/** Up to here a link works everywhere; past it, some apps and chats cut links short. */
export const LINK_COMFORT = 2000;

/** The most a link may unpack to, so a small link can't swell into a huge one. */
const MAX_UNPACKED_BYTES = 1_200_000;

export interface CardState {
  data: CardData;
  format: FormatId;
  layout: LayoutId;
  theme: ThemeId;
}

// The plain facts, under two-letter keys.
const FIELDS = {
  ca: 'capital',
  po: 'population',
  go: 'government',
  hs: 'headOfState',
  gd: 'gdpUsd',
  cu: 'currency',
  cc: 'currencyCode',
  hg: 'headOfGovernment',
  le: 'legislature',
  ar: 'areaKm2',
  de: 'demonym',
  la: 'languages',
  ur: 'urbanisation',
  ho: 'house',
  he: 'heir',
  lw: 'law',
  cl: 'calendar',
  er: 'era',
  dy: 'daysPerYear',
  an: 'anthem',
  nl: 'namingLanguage',
  li: 'lifeExpectancy',
  gg: 'gdpGrowth',
  am: 'activeMilitary',
  br: 'branches',
  hr: 'highestRank',
  pc: 'passportColour',
  dr: 'drivesOn',
} as const satisfies Record<string, keyof CardData>;

type Packed = Record<string, unknown>;

/** The card as the smallest JSON that still says everything. */
export function pack(state: CardState): Packed {
  const { data } = state;
  const out: Packed = {};
  if (data.name) out.n = data.name;
  if (data.commonName) out.c = data.commonName;
  if (data.motto) out.m = data.motto;
  if (data.flag) out.f = [data.flag.svg, data.flag.ratio];
  if (data.arms) out.a = [data.arms.svg, data.arms.ratio];
  for (const [key, field] of Object.entries(FIELDS)) {
    const value = data[field];
    if (value !== undefined) out[key] = value;
  }
  if (data.largestCity) out.lc = [data.largestCity.name, data.largestCity.population ?? null];
  if (data.seats) {
    const { chamber, total, parties, system, election } = data.seats;
    out.s = [
      chamber ?? 0,
      total,
      parties.map((party) => (party.colour ? [party.name, party.seats, party.colour.slice(1)] : [party.name, party.seats])),
      system ?? 0,
      election ?? 0,
    ];
  }
  if (data.timeline) {
    out.t = [data.timeline.title ?? 0, data.timeline.events.map((event) => [event.year, event.title])];
  }
  // Which sections were filled, one bit each, in the order of SECTIONS.
  const filled = SECTIONS.reduce((bits, name, index) => (data.filled.includes(name) ? bits | (1 << index) : bits), 0);
  if (filled) out.x = filled;
  const options = [
    FORMATS.findIndex((entry) => entry.id === state.format),
    LAYOUTS.findIndex((entry) => entry.id === state.layout),
    THEMES.findIndex((entry) => entry.id === state.theme),
  ];
  if (options.some((index) => index > 0)) out.o = options;
  return out;
}

const item = (value: unknown, index: number): unknown => (Array.isArray(value) ? value[index] : undefined);
const text = (value: unknown): unknown => (typeof value === 'string' ? value : undefined);

/**
 * Reads a packed card back. It is laid out as a small profile and read by the same reader a
 * profile file gets, so every limit and every check applies to a link too. Null if the value
 * is not a packed card at all.
 */
export function unpack(value: unknown): CardState | null {
  const packed = clean.record(value);
  if (!packed) return null;

  const field = (key: keyof typeof FIELDS): unknown => packed[key];
  const seats = Array.isArray(packed.s) ? packed.s : undefined;
  const timeline = Array.isArray(packed.t) ? packed.t : undefined;
  const city = Array.isArray(packed.lc) ? packed.lc : undefined;
  const profile = {
    meta: { nation: packed.c ?? packed.n },
    identity: {
      officialName: packed.n,
      commonName: packed.c,
      motto: packed.m,
      capital: field('ca'),
      demonym: field('de'),
      languages: field('la'),
    },
    flag: { svg: item(packed.f, 0) },
    arms: { svg: item(packed.a, 0) },
    government: { form: field('go'), headOfState: field('hs'), headOfGovernment: field('hg'), legislature: field('le') },
    seats: seats && {
      chamber: text(seats[0]),
      total: seats[1],
      parties: Array.isArray(seats[2])
        ? seats[2].map((party: unknown) => ({
            name: item(party, 0),
            seats: item(party, 1),
            colour: typeof item(party, 2) === 'string' ? `#${String(item(party, 2))}` : undefined,
          }))
        : undefined,
      system: text(seats[3]),
      election: text(seats[4]),
    },
    names: { language: field('nl') },
    stats: {
      population: field('po'),
      areaKm2: field('ar'),
      gdpUsd: field('gd'),
      gdpGrowth: field('gg'),
      lifeExpectancy: field('li'),
      activeMilitary: field('am'),
    },
    dynasty: { house: field('ho'), heir: field('he'), law: field('lw') },
    calendar: { name: field('cl'), era: field('er'), daysPerYear: field('dy') },
    timeline: timeline && {
      title: text(timeline[0]),
      events: Array.isArray(timeline[1])
        ? timeline[1].map((event: unknown) => ({ year: item(event, 0), title: item(event, 1) }))
        : undefined,
    },
    bank: { currency: field('cu'), code: field('cc') },
    passport: { colour: field('pc') },
    rank: { branches: field('br'), ranks: [{ name: field('hr') }] },
    cities: { urbanisation: field('ur'), list: city ? [{ name: city[0], population: city[1] ?? undefined }] : undefined },
    anthem: { title: field('an') },
    wiki: { drivesOn: field('dr') },
  };

  const data = readCard(profile);
  // The picture's proportions as the card had them, which a profile states in another form.
  for (const [which, key] of [['flag', 'f'], ['arms', 'a']] as const) {
    const stated = item(packed[key], 1);
    const picture = data[which];
    const ratio = typeof stated === 'number' ? clean.ratio(stated, 1) : undefined;
    if (picture && ratio) picture.ratio = ratio;
  }
  // Which sections were filled is the link's own word: it only decides the list and the gold edge.
  const bits = clean.number(packed.x, 0, 2 ** SECTIONS.length - 1, { integer: true }) ?? 0;
  data.filled = SECTIONS.filter((_, index) => (bits & (1 << index)) !== 0) as SectionName[];

  const options = Array.isArray(packed.o) ? packed.o : [];
  const pick = <T extends { id: string }>(list: readonly T[], index: unknown): string | undefined =>
    typeof index === 'number' ? list[index]?.id : undefined;
  return {
    data,
    format: formatOf(pick(FORMATS, options[0])).id,
    layout: layoutOf(pick(LAYOUTS, options[1])),
    theme: themeOf(pick(THEMES, options[2])),
  };
}

// ---------------------------------------------------------------------------------------------
// Compressing and encoding

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';

function toBase64Url(bytes: Uint8Array): string {
  let out = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const a = bytes[i] ?? 0;
    const b = bytes[i + 1];
    const c = bytes[i + 2];
    out += ALPHABET[a >> 2];
    out += ALPHABET[((a & 3) << 4) | ((b ?? 0) >> 4)];
    if (b !== undefined) out += ALPHABET[((b & 15) << 2) | ((c ?? 0) >> 6)];
    if (c !== undefined) out += ALPHABET[c & 63];
  }
  return out;
}

function fromBase64Url(text: string): Uint8Array | null {
  if (!/^[A-Za-z0-9_-]*$/.test(text) || text.length % 4 === 1) return null;
  const bytes = new Uint8Array(Math.floor((text.length * 3) / 4));
  let at = 0;
  for (let i = 0; i < text.length; i += 4) {
    const [a, b, c, d] = [0, 1, 2, 3].map((offset) => ALPHABET.indexOf(text[i + offset] ?? 'A'));
    const word = ((a ?? 0) << 18) | ((b ?? 0) << 12) | ((c ?? 0) << 6) | (d ?? 0);
    if (at < bytes.length) bytes[at++] = word >> 16;
    if (at < bytes.length) bytes[at++] = (word >> 8) & 255;
    if (at < bytes.length) bytes[at++] = word & 255;
  }
  return bytes;
}

/** Runs bytes through a compression stream, stopping if the result grows past `cap`. */
async function through(bytes: Uint8Array, stream: CompressionStream | DecompressionStream, cap: number): Promise<Uint8Array> {
  const writer = stream.writable.getWriter();
  // Errors surface on the reading side; these two only keep them from going unhandled.
  writer.write(bytes as Uint8Array<ArrayBuffer>).catch(() => {});
  writer.close().catch(() => {});
  const reader = stream.readable.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.length;
    if (total > cap) {
      await reader.cancel().catch(() => {});
      throw new Error('The link unpacks to more than a card can be.');
    }
    chunks.push(value);
  }
  const out = new Uint8Array(total);
  let at = 0;
  for (const chunk of chunks) {
    out.set(chunk, at);
    at += chunk.length;
  }
  return out;
}

/** Any JSON value as the text of a link parameter: "<version>.<compressed, base64url>". */
export async function seal(value: unknown, version = LINK_VERSION): Promise<string> {
  const bytes = new TextEncoder().encode(JSON.stringify(value));
  const squeezed = await through(bytes, new CompressionStream('deflate-raw'), Infinity);
  return `${version}.${toBase64Url(squeezed)}`;
}

/** The value inside a link parameter, or null for anything that isn't one. Never throws. */
export async function unseal(text: unknown): Promise<{ version: number; value: unknown } | null> {
  if (typeof text !== 'string' || text.length > LINK_LIMIT) return null;
  const found = /^([1-9][0-9]{0,3})\.([A-Za-z0-9_-]+)$/.exec(text);
  if (!found) return null;
  const bytes = fromBase64Url(found[2] ?? '');
  if (!bytes) return null;
  try {
    const plain = await through(bytes, new DecompressionStream('deflate-raw'), MAX_UNPACKED_BYTES);
    const json = new TextDecoder('utf-8', { fatal: true }).decode(plain);
    return { version: Number(found[1]), value: JSON.parse(json) as unknown };
  } catch {
    return null;
  }
}

/** A card as the text of its link parameter. */
export function encodeCard(state: CardState): Promise<string> {
  return seal(pack(state));
}

/** A card from the text of a link parameter; null if it isn't one this version can read. */
export async function decodeCard(text: unknown): Promise<CardState | null> {
  const opened = await unseal(text);
  if (!opened || opened.version !== LINK_VERSION) return null;
  return unpack(opened.value);
}

// ---------------------------------------------------------------------------------------------
// The link itself

export type LinkVerdict = 'fine' | 'long' | 'too-long';

export interface CardLink {
  url: string;
  /** The whole link's length in characters. */
  length: number;
  /** fine: works everywhere. long: works, but some apps cut long links. too-long: don't hand it out. */
  verdict: LinkVerdict;
  /** For a link that is too long: one that fits once pictures are left out, if there is one. */
  lighter?: { url: string; length: number; without: ('arms' | 'flag')[] };
}

export function verdict(length: number): LinkVerdict {
  return length > LINK_LIMIT ? 'too-long' : length > LINK_COMFORT ? 'long' : 'fine';
}

function isBlank(state: CardState): boolean {
  return (
    Object.keys(pack(state)).length === 0 &&
    state.format === DEFAULT_FORMAT &&
    state.layout === DEFAULT_LAYOUT &&
    state.theme === DEFAULT_THEME
  );
}

async function address(state: CardState, base: string): Promise<string> {
  if (isBlank(state)) return base;
  const url = new URL(base);
  url.search = `?${LINK_PARAM}=${await encodeCard(state)}`;
  url.hash = '';
  return url.toString();
}

/**
 * The link for a card. If the card is too big for a practical link, says so, and offers a
 * lighter link without the arms, the flag or both where that is what makes it fit. The picture
 * and the profile file always carry everything.
 */
export async function cardLink(state: CardState, base = 'https://card.eurth.org/'): Promise<CardLink> {
  const url = await address(state, base);
  const out: CardLink = { url, length: url.length, verdict: verdict(url.length) };
  if (out.verdict !== 'too-long') return out;
  const { flag, arms, ...rest } = state.data;
  const tries: { without: ('arms' | 'flag')[]; data: CardData }[] = [];
  if (arms) tries.push({ without: ['arms'], data: flag ? { ...rest, flag } : rest });
  if (flag) tries.push({ without: ['flag'], data: arms ? { ...rest, arms } : rest });
  if (flag && arms) tries.push({ without: ['arms', 'flag'], data: rest });
  for (const { without, data } of tries) {
    const lighter = await address({ ...state, data }, base);
    if (verdict(lighter.length) !== 'too-long') {
      out.lighter = { url: lighter, length: lighter.length, without };
      break;
    }
  }
  return out;
}

/** The card in a link, or in the query string of one. Null when there is none to read. */
export async function readLink(link: string): Promise<CardState | null> {
  let search = link;
  try {
    search = new URL(link).search;
  } catch {
    // Not a whole address: take it as a query string.
  }
  return decodeCard(new URLSearchParams(search).get(LINK_PARAM));
}
