// Example nations, to try the card with and to test it against. All four are invented.
// Calderwyn, Vantmoor and Hesperwick are @eurth/profile's own example profiles; Teland is the
// nation on Card's first mock-up.
//
// The profiles carry links to the tools that made each section. A page must never hold the
// address of a tool that hasn't launched, so the site shows the examples as cards and card
// links (which hold no addresses), never as these profiles themselves.

import calderwyn from '@eurth/profile/examples/calderwyn.eurth.json' with { type: 'json' };
import hesperwick from '@eurth/profile/examples/hesperwick.eurth.json' with { type: 'json' };
import vantmoor from '@eurth/profile/examples/vantmoor.eurth.json' with { type: 'json' };

const star = '0,-18 4.11,-5.66 17.12,-5.56 6.66,2.16 10.58,14.56 0,7 -10.58,14.56 -6.66,2.16 -17.12,-5.56 -4.11,-5.66';

const telandFlag =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 80" role="img" aria-label="Flag of Teland">' +
  '<rect width="120" height="80" fill="#fcf6e1"/><rect width="120" height="26" fill="#1b6fa0"/>' +
  '<rect y="54" width="120" height="26" fill="#1b6fa0"/>' +
  `<polygon transform="translate(60 40) scale(0.55)" points="${star}" fill="#f2c14e"/></svg>`;

const telandArms =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 240" role="img" aria-label="Coat of arms of Teland">' +
  '<defs><clipPath id="shield"><path d="M10 10H190V110C190 180 140 215 100 232C60 215 10 180 10 110Z"/></clipPath></defs>' +
  '<g clip-path="url(#shield)"><rect width="200" height="240" fill="#2698d4"/>' +
  '<polygon points="0,160 100,78 200,160 200,196 100,114 0,196" fill="#f2c14e"/>' +
  `<polygon transform="translate(55 58) scale(1.3)" points="${star}" fill="#fcf6e1"/>` +
  `<polygon transform="translate(145 58) scale(1.3)" points="${star}" fill="#fcf6e1"/>` +
  `<polygon transform="translate(100 178) scale(1.3)" points="${star}" fill="#fcf6e1"/></g>` +
  '<path d="M10 10H190V110C190 180 140 215 100 232C60 215 10 180 10 110Z" fill="none" stroke="#fcf6e1" stroke-width="5"/></svg>';

const teland = {
  meta: { schema: 1, nation: 'Teland', updated: '2026-11-14T12:00:00.000Z' },
  identity: {
    commonName: 'Teland',
    officialName: 'Republic of Teland',
    capital: 'Selunna',
    demonym: 'Telandic',
    motto: 'Steady against the tide',
    languages: ['Telandic'],
  },
  flag: { svg: telandFlag, ratio: '2:3', colours: ['#1b6fa0', '#fcf6e1', '#f2c14e'] },
  arms: { svg: telandArms, blazon: 'Azure, a chevron Or between three mullets argent' },
  government: {
    form: 'Parliamentary republic',
    headOfState: 'President Maelin Ostrevin',
    headOfGovernment: 'Prime Minister Aerin Kalluna',
    legislature: 'National Assembly',
  },
  seats: {
    chamber: 'National Assembly',
    total: 120,
    system: "D'Hondt",
    election: 'Election 2026',
    parties: [
      { name: 'Tidewater Alliance', seats: 42, colour: '#2698d4' },
      { name: 'Harvest Party', seats: 33, colour: '#f7941d' },
      { name: 'Civic Centre', seats: 21, colour: '#b3b5b4' },
      { name: 'Red Shore', seats: 14, colour: '#e45735' },
      { name: 'Independents', seats: 10, colour: '#fcf6e1' },
    ],
  },
  stats: { population: 48_200_000, areaKm2: 512_000, gdpUsd: 1_940_000_000_000 },
  bank: { currency: 'Selun', code: 'TLS', issuer: 'Bank of Teland' },
  wiki: { drivesOn: 'right' },
};

export interface Example {
  id: string;
  name: string;
  /** One line for the Examples page. */
  about: string;
  profile: unknown;
}

export const EXAMPLES: readonly Example[] = [
  {
    id: 'calderwyn',
    name: 'Calderwyn',
    about: 'A seafaring kingdom with every section filled: the card with a gold edge.',
    profile: calderwyn,
  },
  {
    id: 'teland',
    name: 'Teland',
    about: 'A republic with a flag, arms, a parliament and the key numbers.',
    profile: teland,
  },
  {
    id: 'vantmoor',
    name: 'Vantmoor',
    about: 'A mid-sized profile: names, a flag, a government, statistics and cities.',
    profile: vantmoor,
  },
  {
    id: 'hesperwick',
    name: 'Hesperwick',
    about: 'Where every nation starts: a name and one section.',
    profile: hesperwick,
  },
];
