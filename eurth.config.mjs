// What this tool is called and where it lives. Read at build time only: astro.config.mjs, the
// frontmatter of .astro pages, tests and tools/. Never import this from a Svelte component or a
// <script>: it pulls in the list of every Eurth tool, and browser code must not carry that
// (HANDBOOK.md, Launch). Hand the component what it needs as props instead.
import { defineSite } from '@eurth/style/build';

export const site = defineSite({
  id: 'card',
  name: 'Card',
  url: 'https://card.eurth.org',
  title: 'Card: free online country fact card maker for worldbuilders',
  description:
    'A free online country fact card maker for worldbuilders: load your nation and get its flag, arms, key facts, parliament and history on one card to share. No account needed.',
  tagline: 'Everything about your nation, on one card',
  pages: [
    { href: '/', label: 'Card' },
    { href: '/guide/', label: 'Guide' },
    { href: '/glossary/', label: 'Glossary' },
    { href: '/examples/', label: 'Examples' },
  ],
  repo: 'https://github.com/eurth-org/eurth-card',
  ogAlt: 'Card, by Eurth, at card.eurth.org: the Eurth yurt beside a country fact card with a flag, a coat of arms, key facts and a seat chart.',
  // The card makes a small sound as it is dealt, once sound is switched on.
  sound: true,
});
