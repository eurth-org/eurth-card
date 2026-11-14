// The guide's tool-by-tool part, as data. Each entry is keyed by the tool's id in @eurth/style's
// tools.json, and the page shows it only once that tool has launched: no site mentions a tool
// before its door opens. The tool's name and address come from tools.json at build time, so
// neither is written here.

import type { SectionName } from '../card/model.ts';

export interface ToolPart {
  /** The tool's id in tools.json. */
  tool: string;
  /** The profile sections it fills. */
  sections: readonly SectionName[];
  /** What the tool is for, in a few words, after its name: "draws the flag". */
  does: string;
  /** What it adds to the card. */
  adds: string;
}

export const TOOL_PARTS: readonly ToolPart[] = [
  {
    tool: 'gov',
    sections: ['government'],
    does: 'works out how the nation is governed',
    adds: 'Three of the six key facts hang on it: the form of government and the head of state are always shown, and the head of government and the name of the legislature join them where there is room.',
  },
  {
    tool: 'flag',
    sections: ['flag'],
    does: 'draws the flag',
    adds: 'The flag leads every layout, and in the Banner layout it is as large as the card allows. It travels in the profile as a picture, so what you drew is exactly what the card shows.',
  },
  {
    tool: 'arms',
    sections: ['arms'],
    does: 'draws the coat of arms',
    adds: 'The arms stand beside the flag. A card with both looks like a state’s own paperwork; a card with only one still looks complete.',
  },
  {
    tool: 'seats',
    sections: ['seats'],
    does: 'turns votes into seats',
    adds: 'The seat chart: one dot for each seat, in the parties’ colours, with the chamber’s name and size beneath. Taller formats list the parties and their seats beside it.',
  },
  {
    tool: 'names',
    sections: ['names'],
    does: 'gives the nation a language to name things in',
    adds: 'The naming language gets a line of its own on the roomier formats. Its real gift to the card is earlier: a capital, a ruling house and a currency that sound as if they belong together.',
  },
  {
    tool: 'cities',
    sections: ['cities'],
    does: 'sizes the nation’s cities',
    adds: 'The largest city and the share of people who live in towns. If the profile names no capital elsewhere, the city marked as capital here becomes the card’s capital.',
  },
  {
    tool: 'stats',
    sections: ['stats'],
    does: 'checks the nation’s numbers against the real world',
    adds: 'Population and GDP, two of the key facts, and from them the card works out people per square kilometre and GDP per person. Area, life expectancy, growth and the size of the armed forces follow where there is room.',
  },
  {
    tool: 'dynasty',
    sections: ['dynasty'],
    does: 'keeps the family tree and works out who inherits',
    adds: 'The ruling house, the heir and the law of succession. If the government names no head of state, the reigning monarch takes that place on the card.',
  },
  {
    tool: 'cal',
    sections: ['calendar'],
    does: 'builds the calendar',
    adds: 'The calendar’s name, and its era: the letters after a year. With a calendar in the profile, every date on the card’s timeline is written the nation’s own way.',
  },
  {
    tool: 'time',
    sections: ['timeline'],
    does: 'lays the nation’s history on a line',
    adds: 'The timeline strip: up to five or six events, earliest first. From a long history the card picks an even spread and always keeps the first event and the last.',
  },
  {
    tool: 'bank',
    sections: ['bank'],
    does: 'designs the banknotes',
    adds: 'The currency and its code, the sixth key fact.',
  },
  {
    tool: 'passport',
    sections: ['passport'],
    does: 'makes the passport',
    adds: 'The colour of the passport’s cover, shown as a swatch with the colour’s name beside it.',
  },
  {
    tool: 'rank',
    sections: ['rank'],
    does: 'draws the armed forces’ rank insignia',
    adds: 'The branches of the armed forces and the highest rank.',
  },
  {
    tool: 'anthem',
    sections: ['anthem'],
    does: 'writes the anthem’s words',
    adds: 'The anthem’s title.',
  },
  {
    tool: 'wiki',
    sections: ['identity', 'wiki'],
    does: 'writes the nation’s wiki page',
    adds: 'The names and basics every other fact leans on: the official and the common name, the capital, the demonym, the motto and the languages, as well as the side of the road people drive on. Card can edit the name, the capital and the motto too.',
  },
];

/** The picture formats, and where each one fits. */
export const FORMAT_USES: Readonly<Record<string, string>> = {
  preview: 'The shape a forum, a chat or a social site gives a link. Use it in forum posts and anywhere a link would be previewed.',
  square: 'For feeds that crop to a square, and for avatars and thumbnails.',
  portrait: 'Four by five: the tallest shape most feeds show whole. Room for more facts and the parties’ names.',
  story: 'Nine by sixteen, for a phone held upright. The roomiest format: up to twelve facts, the seat chart with its parties, and the timeline as a list.',
  pin: 'Two by three, for pin boards and for printing.',
  wide: 'Sixteen by nine, for slides, video and the head of a wiki page.',
};
