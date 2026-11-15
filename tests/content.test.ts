import tools from '@eurth/style/tools.json' with { type: 'json' };
import { describe, expect, it } from 'vitest';
import { EXAMPLES } from '../src/card/examples.ts';
import { FORMATS } from '../src/card/formats.ts';
import { layout } from '../src/card/layout.ts';
import { cardLink, pack } from '../src/card/link.ts';
import { SECTIONS, SECTION_LABEL, SECTION_TOOL, complete } from '../src/card/model.ts';
import { readCard } from '../src/card/read.ts';
import { TERMS } from '../src/content/glossary.ts';
import { FORMAT_USES, TOOL_PARTS } from '../src/content/guide.ts';

const toolIds = new Set(tools.tools.map((tool) => tool.id));
const state = (profile: unknown) => ({ data: readCard(profile), format: 'preview', layout: 'classic', theme: 'night' }) as const;

describe('the glossary', () => {
  it('has terms in alphabetical order, each with its own anchor', () => {
    const names = TERMS.map((entry) => entry.term);
    expect([...names].sort((a, b) => a.localeCompare(b, 'en'))).toEqual(names);
    expect(new Set(TERMS.map((entry) => entry.id)).size).toBe(TERMS.length);
    for (const entry of TERMS) expect(entry.id).toMatch(/^[a-z][a-z-]*$/);
  });

  it('defines each term in a sentence or two', () => {
    for (const entry of TERMS) {
      expect(entry.definition.length, entry.term).toBeGreaterThan(40);
      expect(entry.definition.length, entry.term).toBeLessThan(330);
      expect(entry.definition.endsWith('.'), entry.term).toBe(true);
    }
  });

  it('has the anchors the guide links to', () => {
    const ids = new Set(TERMS.map((entry) => entry.id));
    for (const id of ['profile-file', 'section', 'gdp', 'key-facts', 'seat-chart', 'timeline-strip', 'density', 'gold-edge', 'layout', 'infobox']) {
      expect(ids.has(id), id).toBe(true);
    }
  });
});

describe('the guide, tool by tool', () => {
  it('names only tools the suite has, each once', () => {
    for (const part of TOOL_PARTS) expect(toolIds.has(part.tool), part.tool).toBe(true);
    expect(new Set(TOOL_PARTS.map((part) => part.tool)).size).toBe(TOOL_PARTS.length);
  });

  it('covers every section of the profile, under the tool that fills it', () => {
    const covered = TOOL_PARTS.flatMap((part) => part.sections);
    expect([...covered].sort()).toEqual([...SECTIONS].sort());
    for (const part of TOOL_PARTS) for (const section of part.sections) expect(SECTION_TOOL[section], section).toBe(part.tool);
  });

  it('never writes a tool\'s address or name itself: those come from the list of launched tools', () => {
    const text = JSON.stringify(TOOL_PARTS) + JSON.stringify(TERMS);
    expect(text).not.toMatch(/eurth\.org/);
    for (const tool of tools.tools) {
      if (tool.kind !== 'tool' || tool.id === 'card') continue;
      // "Card" and words like "Seats" or "Time" are ordinary words; the distinctive names must not appear.
      if (['Flagwright', 'Governmint'].includes(tool.name)) expect(text).not.toContain(tool.name);
    }
  });

  it('says where each format fits', () => {
    for (const entry of FORMATS) expect(FORMAT_USES[entry.id], entry.id).toBeTruthy();
  });

  it('has a tool and a label for every section', () => {
    for (const section of SECTIONS) {
      expect(toolIds.has(SECTION_TOOL[section]), section).toBe(true);
      expect(SECTION_LABEL[section]).toBeTruthy();
    }
  });
});

describe('the examples', () => {
  it('are four nations, from a name and one section to every section', () => {
    expect(EXAMPLES.map((example) => example.id)).toEqual(['calderwyn', 'teland', 'vantmoor', 'hesperwick']);
    const filled = EXAMPLES.map((example) => readCard(example.profile).filled.length);
    expect(filled).toEqual([16, 8, 5, 1]);
    expect(complete(readCard(EXAMPLES[0]?.profile))).toBe(true);
  });

  it('fit every format', () => {
    for (const example of EXAMPLES) {
      for (const entry of FORMATS) expect(layout(readCard(example.profile), { format: entry.id }).fits, `${example.name} ${entry.id}`).toBe(true);
    }
  });

  it('go to the browser as cards, which hold no address of any tool', async () => {
    for (const example of EXAMPLES) {
      expect(JSON.stringify(pack(state(example.profile)))).not.toMatch(/https:|eurth\.org/);
      expect(JSON.stringify(readCard(example.profile))).not.toMatch(/https?:\/\/[a-z]+\.eurth\.org/);
      expect((await cardLink(state(example.profile))).verdict).toBe('fine');
    }
  });
});
