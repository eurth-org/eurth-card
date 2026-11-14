// From a profile to a card's data. One pure function that trusts nothing: a profile file is
// someone else's input, and so is anything shaped like one. It reads all sixteen sections and
// keeps only what a card can show.

import * as clean from './clean.ts';
import {
  MAX_EVENTS,
  MAX_PARTIES,
  SECTIONS,
  type CardData,
  type City,
  type Party,
  type Picture,
  type Seats,
  type SectionName,
  type Timeline,
  type TimelineEvent,
} from './model.ts';

type Section = Record<string, unknown>;

// The fields of its own that each section has, as the profile's schema lists them. A section
// counts as filled when one of these holds something, or when it has a summary: a link and a
// date alone say only that a tool was opened.
const OWN_FIELDS: Readonly<Record<SectionName, readonly string[]>> = {
  identity: ['commonName', 'officialName', 'capital', 'demonym', 'motto', 'languages'],
  flag: ['svg', 'ratio', 'colours'],
  arms: ['svg', 'blazon'],
  government: ['form', 'headOfState', 'headOfGovernment', 'legislature'],
  seats: ['chamber', 'total', 'system', 'election', 'parties'],
  names: ['language', 'places', 'people', 'surnames'],
  stats: ['population', 'areaKm2', 'gdpUsd', 'gdpGrowth', 'lifeExpectancy', 'activeMilitary'],
  dynasty: ['house', 'law', 'monarch', 'heir', 'succession'],
  calendar: ['name', 'daysPerYear', 'months', 'weekdays', 'era'],
  timeline: ['title', 'startYear', 'endYear', 'events'],
  bank: ['currency', 'code', 'issuer', 'denominations'],
  passport: ['colour'],
  rank: ['branches', 'ranks'],
  cities: ['urbanisation', 'list'],
  anthem: ['title', 'lyrics'],
  wiki: ['drivesOn'],
};

const NAME = 80;
const COUNT = 1_000_000_000_000;

function substance(value: unknown): boolean {
  if (typeof value === 'string') return value.trim().length > 0;
  if (typeof value === 'number') return Number.isFinite(value);
  if (typeof value === 'boolean') return true;
  if (Array.isArray(value)) return value.length > 0;
  return false;
}

function isFilled(name: SectionName, section: Section | undefined): boolean {
  if (!section) return false;
  if (substance(section.summary)) return true;
  return OWN_FIELDS[name].some((field) => substance(section[field]));
}

/** A copy without the keys that hold nothing, so two readings of the same card compare equal. */
export function compact<T extends object>(value: T): T {
  const out: Record<string, unknown> = {};
  for (const [key, held] of Object.entries(value)) {
    if (held !== undefined) out[key] = held;
  }
  return out as T;
}

function picture(section: Section | undefined, fallbackRatio: number, stated?: number): Picture | undefined {
  const svg = clean.svg(section?.svg);
  if (!svg) return undefined;
  return { svg, ratio: stated ?? clean.svgRatio(svg) ?? fallbackRatio };
}

/** The flag's own "height:width" as width over height. */
function flagRatio(value: unknown): number | undefined {
  if (typeof value !== 'string') return undefined;
  const found = /^([1-9][0-9]{0,3}):([1-9][0-9]{0,3})$/.exec(value);
  return found ? clean.ratio(Number(found[2]), Number(found[1])) : undefined;
}

function readSeats(section: Section | undefined, legislature: string | undefined): Seats | undefined {
  if (!section) return undefined;
  const all = clean.list<Party>(section.parties, 100, (item) => {
    const party = clean.record(item);
    const name = clean.text(party?.name, NAME);
    const seats = clean.number(party?.seats, 0, 10_000, { integer: true });
    if (!name || seats === undefined || seats === 0) return undefined;
    return compact({ name, seats, colour: clean.colour(party?.colour) });
  });
  // Largest first, whatever order the file had; equal parties keep their order.
  const sorted = all
    .map((party, index) => ({ party, index }))
    .sort((a, b) => b.party.seats - a.party.seats || a.index - b.index)
    .map(({ party }) => party);
  let parties = sorted;
  if (sorted.length > MAX_PARTIES) {
    const kept = sorted.slice(0, MAX_PARTIES - 1);
    const rest = sorted.slice(MAX_PARTIES - 1).reduce((sum, party) => sum + party.seats, 0);
    parties = [...kept, { name: 'Others', seats: rest }];
  }
  const held = parties.reduce((sum, party) => sum + party.seats, 0);
  const stated = clean.number(section.total, 1, 10_000, { integer: true });
  const total = Math.max(stated ?? 0, held);
  if (total === 0) return undefined;
  return compact({
    chamber: clean.text(section.chamber, NAME) ?? legislature,
    total,
    parties,
    system: clean.text(section.system, NAME),
    election: clean.text(section.election, NAME),
  });
}

/** `count` items spread evenly over a list, the first and the last always among them. */
export function spread<T>(items: readonly T[], count: number): T[] {
  if (items.length <= count) return [...items];
  if (count <= 0) return [];
  if (count === 1) return [items[0] as T];
  const out: T[] = [];
  for (let i = 0; i < count; i++) {
    out.push(items[Math.round((i * (items.length - 1)) / (count - 1))] as T);
  }
  return out;
}

function readTimeline(section: Section | undefined): Timeline | undefined {
  if (!section) return undefined;
  const events = clean
    .list<TimelineEvent>(section.events, 200, (item) => {
      const event = clean.record(item);
      const year = clean.number(event?.year, -1_000_000, 1_000_000, { integer: true });
      const title = clean.text(event?.title, 200);
      return year === undefined || !title ? undefined : { year, title };
    })
    .map((event, index) => ({ event, index }))
    .sort((a, b) => a.event.year - b.event.year || a.index - b.index)
    .map(({ event }) => event);
  if (events.length === 0) return undefined;
  return compact({ title: clean.text(section.title, NAME), events: spread(events, MAX_EVENTS) });
}

function readCities(section: Section | undefined): { capital?: string; largest?: City } {
  const cities = clean.list(section?.list, 200, (item) => {
    const city = clean.record(item);
    const name = clean.text(city?.name, NAME);
    if (!name) return undefined;
    return {
      name,
      population: clean.number(city?.population, 0, COUNT, { integer: true }),
      capital: city?.capital === true,
    };
  });
  const capital = cities.find((city) => city.capital)?.name;
  // "Largest first" is the file's promise, not a fact: go by the numbers where there are any.
  let largest = cities[0];
  for (const city of cities) {
    if ((city.population ?? -1) > (largest?.population ?? -1)) largest = city;
  }
  return {
    capital,
    largest: largest ? compact({ name: largest.name, population: largest.population }) : undefined,
  };
}

/**
 * Reads a profile, or anything at all, into a card's data. Never throws: what can't be used is
 * left out, and a value that is no profile gives an empty card.
 */
export function readCard(input: unknown): CardData {
  const profile = clean.record(input) ?? {};
  const section = (name: string): Section | undefined => clean.record(profile[name]);

  const meta = section('meta');
  const identity = section('identity');
  const flag = section('flag');
  const government = section('government');
  const stats = section('stats');
  const dynasty = section('dynasty');
  const calendar = section('calendar');
  const bank = section('bank');
  const rank = section('rank');
  const cities = section('cities');

  const officialName = clean.text(identity?.officialName, NAME);
  const commonName = clean.text(identity?.commonName, NAME);
  const nation = clean.text(meta?.nation, NAME);
  const name = officialName ?? commonName ?? nation ?? '';
  const short = commonName ?? nation;

  const town = readCities(cities);
  const capital = clean.text(identity?.capital, NAME) ?? town.capital;
  const legislature = clean.text(government?.legislature, NAME);
  const languages = clean.list(identity?.languages, 6, (item) => clean.text(item, NAME));
  const namingLanguage = clean.text(section('names')?.language, NAME);
  const branches = clean.list(rank?.branches, 6, (item) => clean.text(item, NAME));
  const highestRank = clean.list(rank?.ranks, 1, (item) => clean.text(clean.record(item)?.name, NAME))[0];
  const drivesOn = section('wiki')?.drivesOn;

  const data: CardData = {
    name,
    commonName: short && short !== name ? short : undefined,
    motto: clean.text(identity?.motto, 200),
    flag: picture(flag, 1.5, flagRatio(flag?.ratio)),
    arms: picture(section('arms'), 200 / 240),

    capital,
    population: clean.number(stats?.population, 0, COUNT, { integer: true }),
    government: clean.text(government?.form, NAME),
    headOfState: clean.text(government?.headOfState, NAME) ?? clean.text(dynasty?.monarch, NAME),
    gdpUsd: clean.number(stats?.gdpUsd, 0, 1e16),
    currency: clean.text(bank?.currency, NAME),
    currencyCode: clean.text(bank?.code, 10),

    headOfGovernment: clean.text(government?.headOfGovernment, NAME),
    legislature,
    areaKm2: clean.number(stats?.areaKm2, 0, 1e10),
    demonym: clean.text(identity?.demonym, NAME),
    languages: languages.length ? languages : undefined,
    largestCity: town.largest,
    urbanisation: clean.number(cities?.urbanisation, 0, 100),
    house: clean.text(dynasty?.house, NAME),
    heir: clean.text(dynasty?.heir, NAME),
    law: clean.text(dynasty?.law, NAME),
    calendar: clean.text(calendar?.name, NAME),
    era: clean.text(calendar?.era, 20),
    daysPerYear: clean.number(calendar?.daysPerYear, 1, 100_000, { integer: true }),
    anthem: clean.text(section('anthem')?.title, NAME),
    namingLanguage,
    lifeExpectancy: clean.number(stats?.lifeExpectancy, 0, 200),
    gdpGrowth: clean.number(stats?.gdpGrowth, -100, 1000),
    activeMilitary: clean.number(stats?.activeMilitary, 0, COUNT, { integer: true }),
    branches: branches.length ? branches : undefined,
    highestRank,
    passportColour: clean.colour(section('passport')?.colour),
    drivesOn: drivesOn === 'left' || drivesOn === 'right' ? drivesOn : undefined,

    seats: readSeats(section('seats'), legislature),
    timeline: readTimeline(section('timeline')),

    filled: SECTIONS.filter((sectionName) => isFilled(sectionName, section(sectionName))),
  };
  return compact(data);
}
