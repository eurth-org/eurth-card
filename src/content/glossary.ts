// The glossary's terms: the words Card uses, in a sentence or two each. The page shows them in
// this order (alphabetical) and gives the set to search engines as a DefinedTermSet.

export interface Term {
  /** The anchor on the page: /glossary/#demonym. */
  id: string;
  term: string;
  definition: string;
}

export const TERMS: readonly Term[] = [
  {
    id: 'capital',
    term: 'Capital',
    definition:
      'The city where a nation’s government sits. The card takes it from the profile’s names and basics, or failing that from the city marked as capital in the list of cities.',
  },
  {
    id: 'coat-of-arms',
    term: 'Coat of arms',
    definition: 'A nation’s heraldic emblem, drawn on a shield. On the card it stands beside the flag.',
  },
  {
    id: 'currency-code',
    term: 'Currency code',
    definition: 'The short code a currency goes by, usually three letters, as in “Calder mark (CWM)”.',
  },
  {
    id: 'demonym',
    term: 'Demonym',
    definition: 'The word for a nation’s people and things: “Calderwynian” for Calderwyn.',
  },
  {
    id: 'density',
    term: 'Density',
    definition: 'People per square kilometre: the population divided by the land area. The card works it out when the profile has both.',
  },
  {
    id: 'description',
    term: 'Description',
    definition:
      'The card written out in words: the name, the motto, every fact, the seats by party and the events in order. It is the picture’s text for screen readers, and “Copy description” puts it on the clipboard.',
  },
  {
    id: 'era',
    term: 'Era',
    definition: 'The label a calendar writes after a year, as “LR” in “1412 LR”. When the profile has a calendar, the card’s timeline uses its era.',
  },
  {
    id: 'fact-card',
    term: 'Fact card',
    definition: 'One picture that sums a nation up: its symbols, its name and motto, and its key facts. The country fact card is what this tool makes.',
  },
  {
    id: 'format',
    term: 'Format',
    definition:
      'The size and shape of the picture, chosen for where it will go: link preview (1200 by 630), square (1080 by 1080), portrait (1080 by 1350), story (1080 by 1920), pin (1000 by 1500) and wide (1600 by 900).',
  },
  {
    id: 'gdp',
    term: 'GDP',
    definition:
      'Gross domestic product: the value of everything a nation produces in a year, here in US dollars so that nations can be compared. GDP per person is GDP divided by the population.',
  },
  {
    id: 'gold-edge',
    term: 'Gold edge',
    definition: 'The double line round the card of a nation whose profile has every section filled.',
  },
  {
    id: 'head-of-government',
    term: 'Head of government',
    definition: 'The person who runs the government from day to day, such as a prime minister. In some systems the head of state does both jobs.',
  },
  {
    id: 'head-of-state',
    term: 'Head of state',
    definition:
      'The person who stands for the nation, such as a monarch or a president. If the profile’s government names none but its ruling house has a monarch, the card shows the monarch.',
  },
  {
    id: 'infobox',
    term: 'Infobox',
    definition: 'The box of key facts at the top right of a wiki article about a country. A fact card is an infobox that travels without its article.',
  },
  {
    id: 'key-facts',
    term: 'Key facts',
    definition: 'The six facts the card always tries to show: capital, population, government, head of state, GDP and currency. Other facts join them where a format has room.',
  },
  {
    id: 'layout',
    term: 'Layout',
    definition:
      'How the card is arranged. Classic puts the flag, arms and name across the top; Banner shows the flag as large as it goes; Ledger sets the facts one to a row, like the data page of a passport.',
  },
  {
    id: 'legislature',
    term: 'Legislature',
    definition: 'The body that makes a nation’s laws: a parliament, congress, assembly or moot.',
  },
  {
    id: 'link-preview',
    term: 'Link preview',
    definition: 'The picture and title that a forum, chat or social site shows when someone posts a link. Its usual size is 1200 by 630 pixels.',
  },
  {
    id: 'motto',
    term: 'Motto',
    definition: 'A short phrase that says what a nation stands for. On the card it sits under the name.',
  },
  {
    id: 'open-graph',
    term: 'Open Graph',
    definition: 'The set of tags in a web page that tell other sites which title, description and picture to show for a link to it. Link previews are built from them.',
  },
  {
    id: 'profile-file',
    term: 'Profile file',
    definition:
      'One small file, named after the nation and ending in .eurth.json, that carries a nation from one Eurth tool to the next. Each tool fills in its own section; the card reads them all.',
  },
  {
    id: 'seat-chart',
    term: 'Seat chart',
    definition: 'A half-circle of dots, one for each seat in the legislature, filled party by party from the left. In a very large chamber a dot stands for several seats, and the caption says so.',
  },
  {
    id: 'section',
    term: 'Section',
    definition: 'One part of the profile file, filled by one tool: the flag, the government, the statistics and so on. There are sixteen.',
  },
  {
    id: 'theme',
    term: 'Theme',
    definition: 'The card’s colours: Night, light text on a dark ground, or Light, dark text on white.',
  },
  {
    id: 'timeline-strip',
    term: 'Timeline strip',
    definition: 'A handful of dated events along a line, earliest first: a nation’s history at a glance.',
  },
];
