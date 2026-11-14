// The card in words: for Copy description, for the picture's own description, and for anyone
// who can't see it. Plain text, one thought to a line.

import { facts } from './facts.ts';
import * as format from './format.ts';
import { displayName, type CardData } from './model.ts';

/** "Kingdom of Calderwyn: country fact card". */
export function title(data: CardData): string {
  return `${displayName(data)}: country fact card`;
}

/** One line for a link preview or a share: the name and its first few facts. */
export function summary(data: CardData): string {
  const first = facts(data)
    .slice(0, 4)
    .map((fact) => `${fact.label.toLowerCase()} ${fact.value}`);
  const name = displayName(data);
  return first.length ? `${name}: ${first.join(', ')}.` : `${name}, on one card.`;
}

function ending(text: string): string {
  return /[.!?…]$/.test(text) ? text : `${text}.`;
}

/** The whole card as text. */
export function describe(data: CardData): string {
  const lines: string[] = [];
  const name = displayName(data);
  lines.push(data.commonName && data.commonName !== name ? `${name} (${data.commonName}).` : ending(name));
  if (data.motto) lines.push(`Motto: “${data.motto}”.`);

  const shows = [data.flag ? 'its flag' : '', data.arms ? 'its coat of arms' : ''].filter(Boolean);
  if (shows.length) lines.push(`The card shows ${format.joinList(shows)}.`);

  for (const fact of facts(data)) lines.push(ending(`${fact.label}: ${fact.value}`));

  const seats = data.seats;
  if (seats) {
    const chamber = seats.chamber ?? 'The legislature';
    const count = `${format.group(seats.total)} ${seats.total === 1 ? 'seat' : 'seats'}`;
    const parties = seats.parties.map((party) => `${party.name} ${format.group(party.seats)}`);
    const held = seats.parties.reduce((sum, party) => sum + party.seats, 0);
    if (parties.length && seats.total > held) parties.push(`other seats ${format.group(seats.total - held)}`);
    const from = [seats.election, seats.system].filter(Boolean).join(', ');
    lines.push(
      `${chamber} has ${count}${parties.length ? `: ${parties.join(', ')}` : ''}.${from ? ` (${from}.)` : ''}`,
    );
  }

  const timeline = data.timeline;
  if (timeline) {
    lines.push(`${timeline.title ?? 'History'}:`);
    for (const event of timeline.events) lines.push(ending(`${format.year(event.year, data.era)}: ${event.title}`));
  }
  return lines.join('\n');
}
