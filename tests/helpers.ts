import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { readCard } from '../src/card/read.ts';
import { SECTIONS, type CardData, type SectionName } from '../src/card/model.ts';

/** One of the three example profiles, as the file holds it. */
export function example(name: 'hesperwick' | 'vantmoor' | 'calderwyn'): Record<string, unknown> {
  const path = fileURLToPath(new URL(`../node_modules/@eurth/profile/examples/${name}.eurth.json`, import.meta.url));
  return JSON.parse(readFileSync(path, 'utf8')) as Record<string, unknown>;
}

export const calderwyn = (): CardData => readCard(example('calderwyn'));
export const vantmoor = (): CardData => readCard(example('vantmoor'));
export const hesperwick = (): CardData => readCard(example('hesperwick'));

/** Calderwyn cut down to `meta` and one section: sixteen profiles with one section each. */
export function oneSection(name: SectionName): Record<string, unknown> {
  const full = example('calderwyn');
  return { meta: full.meta, [name]: full[name] };
}

export const singles = (): { name: SectionName; data: CardData }[] =>
  SECTIONS.map((name) => ({ name, data: readCard(oneSection(name)) }));

/** A profile with a name and nothing else. */
export const bare = (): CardData => readCard({ meta: { schema: 1, nation: 'Nowhere', updated: '2026-11-14T00:00:00Z' } });
