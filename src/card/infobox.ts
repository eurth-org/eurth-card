// The card as a wiki infobox: {{Infobox country}} wikitext for IIWiki, the same as Wiki writes.
// The writing itself is Wiki's, copied into ./wiki so the two tools can't disagree; this module
// is Card's own part: where the country comes from, and which pictures go with it.
//
// A loaded profile is read exactly as Wiki reads it, so the infobox holds everything Wiki would
// put in it, the fields Card has no room for included. A card from a link, or the example, has
// no profile behind it: it is laid out as a small one from what the card knows.

import type { CardData, Picture } from './model.ts';
import { entries, infoboxWikitext } from './wiki/infobox.ts';
import type { Country } from './wiki/model.ts';
import { fromProfile } from './wiki/profile.ts';

/** A picture to upload to the wiki, under the name the infobox asks for. */
export interface WikiFile {
  kind: 'flag' | 'arms';
  /** The file's name on the wiki: "Flag of Teland.svg". */
  name: string;
  picture: Picture;
}

export interface Infobox {
  /** Ready to paste at the top of the nation's page. */
  wikitext: string;
  /** How many parameters it holds. */
  lines: number;
  /** False while the nation has no name: the infobox and its files are named after it. */
  named: boolean;
  /** The flag and the arms the card carries, under the names the infobox gives them. */
  files: WikiFile[];
  /** Files the infobox names that Card can't hand over: to be made, or their lines removed. */
  wanted: string[];
  /** Every field, by its parameter, as Wiki holds it. */
  country: Country;
}

export interface InfoboxOptions {
  /** The profile the card was read from, as it would be saved. Without one, the card speaks for itself. */
  profile?: unknown;
  /** Wiki's address, once its door has opened: a design is only read from a link to that tool. */
  wikiSite?: string | null;
}

/**
 * The card as a small profile: just the sections an infobox draws on. A head of state that
 * can only have come from the dynasty goes back there, so the infobox calls them "Monarch" as
 * it would from the profile itself.
 */
export function profileOf(data: CardData): Record<string, unknown> {
  const byDynasty = data.filled.includes('dynasty') && !data.filled.includes('government');
  return {
    meta: { nation: data.commonName ?? data.name },
    identity: {
      officialName: data.name,
      commonName: data.commonName,
      motto: data.motto,
      capital: data.capital,
      demonym: data.demonym,
      languages: data.languages,
    },
    flag: data.flag ? { svg: data.flag.svg } : undefined,
    arms: data.arms ? { svg: data.arms.svg } : undefined,
    government: {
      form: data.government,
      headOfState: byDynasty ? undefined : data.headOfState,
      headOfGovernment: data.headOfGovernment,
      legislature: data.legislature,
    },
    dynasty: { monarch: byDynasty ? data.headOfState : undefined },
    seats: { chamber: data.seats?.chamber },
    stats: { population: data.population, areaKm2: data.areaKm2, gdpUsd: data.gdpUsd },
    bank: { currency: data.currency, code: data.currencyCode },
    calendar: { name: data.calendar, era: data.era },
    cities: data.largestCity ? { list: [{ name: data.largestCity.name, population: data.largestCity.population }] } : undefined,
    anthem: { title: data.anthem },
    wiki: { drivesOn: data.drivesOn },
  };
}

/** The infobox for a card, and the pictures that go with it. */
export function infobox(data: CardData, { profile, wikiSite = null }: InfoboxOptions = {}): Infobox {
  const has = { flag: Boolean(data.flag), arms: Boolean(data.arms) };
  const { country } = fromProfile(profile ?? profileOf(data), wikiSite, { has });
  const list = entries(country);
  const value = (param: string): string => list.find((entry) => entry.param === param)?.value ?? '';

  const files: WikiFile[] = [];
  const wanted: string[] = [];
  const offer = (kind: WikiFile['kind'], param: string): void => {
    const name = value(param);
    if (!name) return;
    const picture = data[kind];
    if (picture) files.push({ kind, name, picture });
    else wanted.push(name);
  };
  offer('flag', 'image_flag');
  offer('arms', 'image_coat');
  if (value('image_map')) wanted.push(value('image_map'));

  return {
    wikitext: infoboxWikitext(country),
    lines: list.length,
    named: Boolean(value('common_name')),
    files,
    wanted,
    country,
  };
}

/** True when a file's name says it is an SVG: handed over as it is. Any other name gets a PNG. */
export const isSvgName = (name: string): boolean => /\.svg$/i.test(name);

/** The name a drawn copy goes by: the same name, ending in .png. */
export const pngName = (name: string): string => name.replace(/\.[a-z0-9]+$/i, '') + '.png';
