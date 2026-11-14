// What a card holds. Everything here has already been through the cleaners in clean.ts, so the
// layout, the drawing, the description and the link can use it without checking again.

/** The profile's sixteen sections, in the order the profile file writes them. */
export const SECTIONS = [
  'identity',
  'flag',
  'arms',
  'government',
  'seats',
  'names',
  'stats',
  'dynasty',
  'calendar',
  'timeline',
  'bank',
  'passport',
  'rank',
  'cities',
  'anthem',
  'wiki',
] as const;

export type SectionName = (typeof SECTIONS)[number];

/**
 * The tool that fills each section, by its id in @eurth/style's tools.json (its subdomain of
 * eurth.org). The page turns these into links at build time; the engine never holds an address.
 */
export const SECTION_TOOL: Readonly<Record<SectionName, string>> = {
  identity: 'wiki',
  flag: 'flag',
  arms: 'arms',
  government: 'gov',
  seats: 'seats',
  names: 'names',
  stats: 'stats',
  dynasty: 'dynasty',
  calendar: 'cal',
  timeline: 'time',
  bank: 'bank',
  passport: 'passport',
  rank: 'rank',
  cities: 'cities',
  anthem: 'anthem',
  wiki: 'wiki',
};

/** What each section is called on the page: "Coat of arms", not "arms". */
export const SECTION_LABEL: Readonly<Record<SectionName, string>> = {
  identity: 'Names and basics',
  flag: 'Flag',
  arms: 'Coat of arms',
  government: 'Government',
  seats: 'Seats',
  names: 'Naming language',
  stats: 'Statistics',
  dynasty: 'Ruling house',
  calendar: 'Calendar',
  timeline: 'History',
  bank: 'Currency',
  passport: 'Passport',
  rank: 'Ranks',
  cities: 'Cities',
  anthem: 'Anthem',
  wiki: 'Wiki page',
};

/** A picture from the profile: SVG text, only ever shown through an image, never as markup. */
export interface Picture {
  svg: string;
  /** Width divided by height. */
  ratio: number;
}

export interface Party {
  name: string;
  seats: number;
  /** A six-digit hex code, lower case. */
  colour?: string;
}

export interface Seats {
  chamber?: string;
  /** Never less than the parties' seats added up. */
  total: number;
  /** Largest first; at most MAX_PARTIES, the rest folded into "Others". */
  parties: Party[];
  system?: string;
  election?: string;
}

export interface TimelineEvent {
  year: number;
  title: string;
}

export interface Timeline {
  title?: string;
  /** Earliest first; at most MAX_EVENTS, picked evenly from a longer list. */
  events: TimelineEvent[];
}

export interface City {
  name: string;
  population?: number;
}

export interface CardData {
  /** The official name, else the common name, else the profile's own name. May be empty. */
  name: string;
  commonName?: string;
  motto?: string;
  flag?: Picture;
  arms?: Picture;

  // The key facts, in the card's order.
  capital?: string;
  population?: number;
  government?: string;
  headOfState?: string;
  gdpUsd?: number;
  currency?: string;
  currencyCode?: string;

  // The rest, shown where a format has room.
  headOfGovernment?: string;
  legislature?: string;
  areaKm2?: number;
  demonym?: string;
  languages?: string[];
  largestCity?: City;
  urbanisation?: number;
  house?: string;
  heir?: string;
  law?: string;
  calendar?: string;
  era?: string;
  daysPerYear?: number;
  anthem?: string;
  namingLanguage?: string;
  lifeExpectancy?: number;
  gdpGrowth?: number;
  activeMilitary?: number;
  branches?: string[];
  highestRank?: string;
  passportColour?: string;
  drivesOn?: 'left' | 'right';

  seats?: Seats;
  timeline?: Timeline;

  /** The sections the profile had filled in, in the order of SECTIONS. */
  filled: SectionName[];
}

/** How many parties a card keeps; smaller ones are folded into "Others". */
export const MAX_PARTIES = 10;

/** How many events a card keeps. */
export const MAX_EVENTS = 8;

/** The sections a profile hasn't filled, in the order of SECTIONS. */
export function missing(data: CardData): SectionName[] {
  return SECTIONS.filter((name) => !data.filled.includes(name));
}

/** Every section filled: the gold edge. */
export function complete(data: CardData): boolean {
  return SECTIONS.every((name) => data.filled.includes(name));
}

/** The name to print: the card's, or a stand-in when the profile has none. */
export function displayName(data: CardData): string {
  return data.name || data.commonName || 'Unnamed nation';
}
