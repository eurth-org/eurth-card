// The card's facts as labels and values, in the order they earn a place: the six key facts
// first, then the rest. A format shows as many as it has room for, from the top.

import * as format from './format.ts';
import type { CardData } from './model.ts';

export type FactId =
  | 'capital'
  | 'population'
  | 'government'
  | 'headOfState'
  | 'gdp'
  | 'currency'
  | 'headOfGovernment'
  | 'legislature'
  | 'area'
  | 'density'
  | 'gdpPerPerson'
  | 'demonym'
  | 'languages'
  | 'largestCity'
  | 'house'
  | 'heir'
  | 'calendar'
  | 'anthem'
  | 'lifeExpectancy'
  | 'gdpGrowth'
  | 'forces'
  | 'urban'
  | 'succession'
  | 'highestRank'
  | 'namingLanguage'
  | 'passport'
  | 'drivesOn';

export interface Fact {
  id: FactId;
  label: string;
  value: string;
  /** One of the six the card always tries to show. */
  key: boolean;
  /** A colour to show beside the value, which also names it in words. */
  swatch?: string;
}

/** The ids of the six key facts, in the card's order. */
export const KEY_FACTS: readonly FactId[] = ['capital', 'population', 'government', 'headOfState', 'gdp', 'currency'];

function same(a: string | undefined, b: string | undefined): boolean {
  return a !== undefined && b !== undefined && a.toLowerCase() === b.toLowerCase();
}

/** Every fact the card's data can state, most wanted first. */
export function facts(data: CardData): Fact[] {
  const out: Fact[] = [];
  const add = (id: FactId, label: string, value: string | undefined, swatch?: string): void => {
    if (!value) return;
    const fact: Fact = { id, label, value, key: KEY_FACTS.includes(id) };
    if (swatch) fact.swatch = swatch;
    out.push(fact);
  };
  const { population, areaKm2, gdpUsd } = data;

  add('capital', 'Capital', data.capital);
  add('population', 'Population', population === undefined ? undefined : format.count(population));
  add('government', 'Government', data.government);
  add('headOfState', 'Head of state', data.headOfState);
  add('gdp', 'GDP', gdpUsd === undefined ? undefined : format.money(gdpUsd));
  add(
    'currency',
    'Currency',
    data.currency && data.currencyCode ? `${data.currency} (${data.currencyCode})` : (data.currency ?? data.currencyCode),
  );

  // A president who is both is said once.
  add('headOfGovernment', 'Head of government', same(data.headOfGovernment, data.headOfState) ? undefined : data.headOfGovernment);
  // The seat chart names the chamber itself; say it here only when there is no chart.
  add('legislature', 'Legislature', data.seats ? undefined : data.legislature);
  add('area', 'Area', areaKm2 === undefined ? undefined : format.area(areaKm2));
  add(
    'density',
    'Density',
    population === undefined || areaKm2 === undefined ? undefined : format.density(population, areaKm2),
  );
  add(
    'gdpPerPerson',
    'GDP per person',
    gdpUsd === undefined || !population ? undefined : format.money(Math.round(gdpUsd / population)),
  );
  add('demonym', 'Demonym', data.demonym);
  add(
    'languages',
    (data.languages?.length ?? 0) > 1 ? 'Languages' : 'Language',
    data.languages ? format.joinList(data.languages) : undefined,
  );
  const city = data.largestCity;
  add(
    'largestCity',
    'Largest city',
    !city || same(city.name, data.capital)
      ? undefined
      : city.population === undefined
        ? city.name
        : `${city.name} (${format.count(city.population)})`,
  );
  add('house', 'Ruling house', data.house);
  add('heir', 'Heir', data.heir);
  add(
    'calendar',
    'Calendar',
    data.calendar && data.era && !data.calendar.includes(data.era)
      ? `${data.calendar} (${data.era})`
      : (data.calendar ?? data.era),
  );
  add('anthem', 'Anthem', data.anthem);
  add(
    'lifeExpectancy',
    'Life expectancy',
    data.lifeExpectancy === undefined ? undefined : `${format.group(data.lifeExpectancy, 1)} years`,
  );
  add('gdpGrowth', 'GDP growth', data.gdpGrowth === undefined ? undefined : `${format.percent(data.gdpGrowth)} a year`);
  const active = data.activeMilitary === undefined ? undefined : `${format.count(data.activeMilitary)} active`;
  const branches = data.branches ? format.joinList(data.branches) : undefined;
  add('forces', 'Armed forces', active && branches ? `${active}: ${branches}` : (active ?? branches));
  add('urban', 'Living in towns', data.urbanisation === undefined ? undefined : format.percent(data.urbanisation));
  add('succession', 'Succession', data.law);
  add('highestRank', 'Highest rank', data.highestRank);
  add(
    'namingLanguage',
    'Naming language',
    data.languages?.some((language) => same(language, data.namingLanguage)) ? undefined : data.namingLanguage,
  );
  add(
    'passport',
    'Passport',
    data.passportColour ? `${format.capitalise(format.colourWord(data.passportColour))} cover` : undefined,
    data.passportColour,
  );
  add('drivesOn', 'Drives on', data.drivesOn ? `The ${data.drivesOn}` : undefined);
  return out;
}
