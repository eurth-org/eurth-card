// The three things Card may change: the nation's name, its capital and its motto. They belong
// to the profile's "identity" section, the only one Card writes.

import * as clean from './clean.ts';
import type { CardData } from './model.ts';

/** What the visitor has typed over the profile's own values. A key that is absent is untouched. */
export interface Edits {
  name?: string;
  capital?: string;
  motto?: string;
}

/** The card's data with the edits laid over it. An edit emptied out removes the value. */
export function withEdits(data: CardData, edits: Edits): CardData {
  const out: CardData = { ...data };
  if (edits.name !== undefined) out.name = clean.text(edits.name, 80) ?? '';
  if (edits.capital !== undefined) {
    const capital = clean.text(edits.capital, 80);
    if (capital) out.capital = capital;
    else delete out.capital;
  }
  if (edits.motto !== undefined) {
    const motto = clean.text(edits.motto, 200);
    if (motto) out.motto = motto;
    else delete out.motto;
  }
  // A common name that now says the same as the name says nothing.
  if (out.commonName && out.commonName === out.name) delete out.commonName;
  const typed = [edits.name, edits.capital, edits.motto].some((value) => value !== undefined && clean.text(value, 200));
  if (typed && !out.filled.includes('identity')) out.filled = ['identity', ...out.filled];
  return out;
}

/** True when an edit changes anything. */
export function hasEdits(edits: Edits): boolean {
  return edits.name !== undefined || edits.capital !== undefined || edits.motto !== undefined;
}

/**
 * The "identity" section to save: the profile's own, with the edits written over it. Every
 * other key of the section, known or not, comes through untouched.
 */
export function identityWith(identity: Record<string, unknown> | undefined, edits: Edits): Record<string, unknown> {
  const out: Record<string, unknown> = { ...identity };
  const write = (key: string, value: string | undefined, max: number): void => {
    if (value === undefined) return;
    const cleaned = clean.text(value, max);
    if (cleaned) out[key] = cleaned;
    else delete out[key];
  };
  write('officialName', edits.name, 80);
  write('capital', edits.capital, 80);
  write('motto', edits.motto, 200);
  return out;
}
