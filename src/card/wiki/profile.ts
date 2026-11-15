// Copied from eurth-wiki (src/wiki/profile.ts, commit 825aafe, 15 November 2026) so that Card writes
// the same infobox as Wiki. Wiki's copy leads: change it there first, then here, and keep the two
// alike. Three things differ, on purpose:
//   - only the reading half is here: Card never writes the profile's `wiki` section;
//   - a section is read with a few lines of our own, and the design in `wiki.link` is decoded
//     here, so the engine stays free of the page's packages;
//   - Wiki's address is handed in, and may be absent: no built file of Card's may hold the
//     address of a tool whose door hasn't opened. Without it the design in `wiki.link` isn't read.

import { FIELD } from './fields.ts';
import { fileName, nameOf } from './infobox.ts';
import { clean, defaults, line, type Country } from './model.ts';

/** Titles a head of state or government goes by, longest first, to tell "Queen" from "Ysolde III". */
const TITLES = [
  'President of the Republic', 'Prime Minister', 'First Minister', 'Chief Minister', 'Minister-President', 'Minister President', 'Grand Duchess', 'Grand Duke', 'Grand Prince', 'Grand Princess',
  'Lord Protector', 'Governor-General', 'Governor General', 'Secretary-General', 'Secretary General', 'General Secretary', 'High Chancellor', 'Supreme Leader', 'Head of State', 'State Elder',
  'Vice President', 'President', 'Chancellor', 'Premier', 'Emperor', 'Empress', 'King', 'Queen', 'Prince', 'Princess', 'Duke', 'Duchess', 'Sultan', 'Sultana', 'Emir', 'Shah', 'Tsar', 'Tsarina',
  'Kaiser', 'Doge', 'Consul', 'Archon', 'Regent', 'Chairman', 'Chairwoman', 'Chair', 'Speaker', 'Governor', 'Taoiseach', 'Pope', 'Patriarch', 'Khan', 'Raja', 'Rani', 'Maharaja', 'Negus', 'Pharaoh', 'Chief',
].sort((a, b) => b.length - a.length);

/** "Queen Ysolde III" as a title and a name. A name with no title we know keeps the title empty. */
export function splitTitle(text: string): { title: string; name: string } {
  const value = text.trim();
  const lower = value.toLowerCase();
  for (const title of TITLES) {
    if (lower.startsWith(`${title.toLowerCase()} `) && value.length > title.length + 1) return { title, name: value.slice(title.length + 1).trim() };
  }
  return { title: '', name: value };
}

const str = (value: unknown): string => (typeof value === 'string' ? value : '');
const num = (value: unknown): string => (typeof value === 'number' && Number.isFinite(value) ? String(value) : '');
const record = (value: unknown): Record<string, unknown> => (typeof value === 'object' && value !== null && !Array.isArray(value) ? (value as Record<string, unknown>) : {});

/** One section of a profile, or of anything shaped like one; an empty record when it isn't there. */
const sectionOf = (profile: unknown, name: string): Record<string, unknown> => {
  const whole = record(profile);
  return Object.hasOwn(whole, name) ? record(whole[name]) : {};
};

/**
 * The fields Wiki keeps in its own `wiki` section, beside `drivesOn`: the everyday details the
 * profile holds nowhere else. Infobox parameter on the left, the profile's key on the right.
 */
export const WIKI_KEYS: Readonly<Record<string, string>> = { calling_code: 'callingCode', time_zone: 'timeZone', utc_offset: 'utcOffset', cctld: 'internetDomain', date_format: 'dateFormat' };

/**
 * What a design link's parameter holds, as @eurth/style's decodeState reads it:
 * "<version>.<JSON as base64url>". Null for anything else. Never throws.
 */
export function decodeDesign(text: unknown): unknown {
  if (typeof text !== 'string' || text.length > 8000) return null;
  const found = /^(\d{1,4})\.([A-Za-z0-9_-]*)$/.exec(text);
  if (!found) return null;
  try {
    const binary = atob((found[2] ?? '').replace(/-/g, '+').replace(/_/g, '/'));
    const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
    return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes)) as unknown;
  } catch {
    return null;
  }
}

/**
 * The country a design link holds, if the link is one of Wiki's: the profile's `wiki.link` may
 * point anywhere, and a design is only ever read from a link to that tool.
 */
export function fromLink(link: unknown, siteUrl: string | null | undefined): Country | null {
  if (!siteUrl || typeof link !== 'string' || !link.startsWith(`${siteUrl.replace(/\/+$/, '')}/`)) return null;
  try {
    const arrived = decodeDesign(new URL(link).searchParams.get('d'));
    return arrived === null ? null : clean(arrived);
  } catch {
    return null;
  }
}

/** The flag and the arms a profile carries, as SVG text. Only ever shown through an <img>. */
export function pictures(profile: unknown): { flag: string; arms: string } {
  const svg = (name: string): string => {
    const value = sectionOf(profile, name).svg;
    return typeof value === 'string' && /<svg[\s>]/i.test(value) ? value : '';
  };
  return { flag: svg('flag'), arms: svg('arms') };
}

export interface FromProfileOptions {
  /**
   * Which pictures there are to hand over. Card says so itself: it only offers a flag or arms
   * its own reader has passed, and the infobox shouldn't name a file Card can't give.
   * Default: what the profile carries, as Wiki has it.
   */
  has?: { flag: boolean; arms: boolean };
}

/**
 * What a profile fills in. Wiki's own earlier work (the design in `wiki.link`) is the base;
 * on top of it comes what the other tools say today, since their sections are theirs to
 * decide: a new population from Stats replaces the one typed in Wiki last month.
 * Returns the country and the names of the sections that filled something in.
 */
export function fromProfile(profile: unknown, siteUrl: string | null | undefined, options: FromProfileOptions = {}): { country: Country; used: string[] } {
  const section = (name: string) => sectionOf(profile, name);
  const wiki = section('wiki');
  const country: Country = { ...(fromLink(wiki.link, siteUrl) ?? defaults) };
  const used = new Set<string>();
  const set = (param: string, value: string, from: string) => {
    const text = line(value, FIELD[param]?.max ?? 200).trim();
    if (!text) return;
    country[param] = text;
    used.add(from);
  };

  // Wiki's own sections.
  const identity = section('identity');
  set('common_name', str(identity.commonName) || str(sectionOf(profile, 'meta').nation), 'identity');
  set('conventional_long_name', str(identity.officialName), 'identity');
  set('capital', str(identity.capital), 'identity');
  set('demonym', str(identity.demonym), 'identity');
  set('national_motto', str(identity.motto), 'identity');
  if (Array.isArray(identity.languages)) set('official_languages', identity.languages.filter((l) => typeof l === 'string' && l.trim()).join(', '), 'identity');
  if (wiki.drivesOn === 'left' || wiki.drivesOn === 'right') set('drives_on', wiki.drivesOn, 'wiki');
  for (const [param, key] of Object.entries(WIKI_KEYS)) set(param, str(wiki[key]), 'wiki');

  // What the other tools know.
  const government = section('government');
  const dynasty = section('dynasty');
  const seats = section('seats');
  set('government_type', str(government.form), 'government');
  const state = str(government.headOfState);
  const head = splitTitle(state || str(dynasty.monarch));
  if (head.name) {
    set('leader_name1', head.name, state ? 'government' : 'dynasty');
    country.leader_title1 = line(head.title || (state ? '' : 'Monarch'), 80);
  }
  const second = str(government.headOfGovernment);
  if (second && second.trim().toLowerCase() !== state.trim().toLowerCase()) {
    const leader = splitTitle(second);
    set('leader_name2', leader.name, 'government');
    country.leader_title2 = line(leader.title, 80);
  }
  set('legislature', str(government.legislature) || str(seats.chamber), str(government.legislature) ? 'government' : 'seats');

  const stats = section('stats');
  set('population_estimate', num(stats.population), 'stats');
  set('area_km2', num(stats.areaKm2), 'stats');
  set('GDP_nominal', num(stats.gdpUsd), 'stats');

  const bank = section('bank');
  set('currency', str(bank.currency), 'bank');
  set('currency_code', str(bank.code), 'bank');

  const calendar = section('calendar');
  if (str(calendar.name) && !country.date_format) set('date_format', `${str(calendar.name)}${str(calendar.era) ? ` (${str(calendar.era)})` : ''}`, 'calendar');

  const cities = section('cities');
  if (Array.isArray(cities.list)) {
    const list = cities.list.map(record).filter((city) => str(city.name));
    const largest = list.reduce<Record<string, unknown> | null>((best, city) => (best === null || (typeof city.population === 'number' && city.population > (typeof best.population === 'number' ? best.population : -1)) ? city : best), null);
    if (largest) set('largest_city', str(largest.name), 'cities');
    const capital = list.find((city) => city.capital === true);
    if (capital && !country.capital) set('capital', str(capital.name), 'cities');
  }

  set('national_anthem', str(section('anthem').title), 'anthem');

  // A profile brings its flag and arms as SVG, so the infobox asks for SVG files; the downloads
  // then carry exactly these names.
  const name = nameOf(country);
  const carried = pictures(profile);
  const has = options.has ?? { flag: Boolean(carried.flag), arms: Boolean(carried.arms) };
  if (name && has.flag && !country.image_flag) set('image_flag', fileName('flag', name, 'svg'), 'flag');
  if (name && has.arms && !country.image_coat) set('image_coat', fileName('arms', name, 'svg'), 'arms');

  return { country: clean(country), used: [...used] };
}
