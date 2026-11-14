# Roadmap

Card turns a nation's profile file into one shareable country fact card, at card.eurth.org. It is door 15, the last door of Eurth's 2026 advent calendar, and opens on 24 December 2026 at 00:00 Europe/Brussels.

Three parts: what comes next, what each release added (newest first), and what's not planned.

## Where to pick up

**14 November 2026, late.** The engine is built and tested; the site is not started. A new session starts at "Next", step 1. Read `CLAUDE.md` (the brief) and `node_modules/@eurth/style/HANDBOOK.md` first; the handbook wins on everything shared.

Done so far (all in `src/card/`, plain TypeScript, 156 tests in `tests/`, `npm run check && npm test`):

- `read.ts`, `clean.ts`, `model.ts`: a profile, or anything at all, into a card's data. Reads all sixteen sections, trusts none of it, and says which sections are filled.
- `format.ts`, `facts.ts`: numbers and words in British English; the facts in the order they earn a place, the six key facts first.
- `seats.ts`: the half-circle seat chart. `text.ts`: fitting text into a width, estimated from Arial's real widths (the site can hand in the browser's own measure).
- `formats.ts`, `layout.ts`: six formats (the brief's five and wide), three layouts (Classic, Banner, Ledger), placed as plain boxes. A card shows as much as fits, tightens before it drops a key fact, and says less larger.
- `render.ts`: the boxes as one SVG; every text escaped; flag and arms only as image addresses. `describe.ts`: the card in words.
- `link.ts`: the card in its link (`?c=1.…`: short keys, deflate, base64url). Read back through the same reader as a file. Over 8,000 characters it says so and offers a lighter link without the arms or flag. The example nations take 63 to 1,356 characters.
- `examples.ts`: Calderwyn, Teland, Vantmoor and Hesperwick.
- `tools/contact-sheet.ts` (`npm run sheet`): every card on one page, in `out/`. `tools/palette.ts`: token values for the tools and tests only.
- `tools/measure-preview/`: **measured, and decided.** Drawing a card's link preview takes 58 to 105 ms of CPU at the median; the Workers Free plan allows 10. v1 ships with the generic Open Graph image. The numbers are in that folder's README.

What changed since the first plan:

- **@eurth/style 1.0.1 and @eurth/profile 1.0.0 are released**, with the handbook and the starter. The site can start.
- **The handbook settles two things.** Every tool has a glossary, so Card gets one. And no built file may hold the address of a tool that hasn't launched, which matters here: the example profiles carry links to every tool, so the site ships examples as card links (which hold no addresses), never as raw profiles; and the list of tools that fill each section, and the guide's tool-by-tool part, are made at build time from the tools that have launched.
- **The kit has no gold.** The gold edge needs a colour for each theme. Until @eurth/style has a `gold` token, `caution-text` stands in (`#ffc673` at Night, `#7a4100` in light). Ask Foundations for the token.

Waiting on Stijn:

1. **The wiki infobox.** IIWiki sits behind a bot check, so its `Template:Infobox country` couldn't be read from here. Paste the template's parameter list (or the "Eurth country setup" page, User:Orioni/Sandbox 7), and say where the shared code should live: in Card first, for Wiki's chat to copy with its expected output, or in @eurth/profile for both to import. Until then the infobox is the one export not built.
2. **A gold token** in @eurth/style (see above), or a word that `caution-text` will do.

## Next

### The site

1. **Start from the starter** in eurth-style: copy it over this repository, keeping `src/card/`, `tests/`, `tools/` and the documents. Rename in `eurth.config.mjs` (id `card`, "Card: free online country fact card maker for worldbuilders"), `package.json`, `wrangler.jsonc` (`eurth-card`, card.eurth.org), `LAUNCH_AT` (`2026-12-24T00:00:00+01:00`) and the launch workflow's cron (`30 22 23 12 *`). Replace `.github/workflows/ci.yml` with the starter's three thin workflows. Take the example profiles from `@eurth/profile/examples/*` and delete the copies in `src/data/examples/`.
2. **Pages**: Card (the maker), Guide, Glossary, Examples and the 404 page, with titles, descriptions, structured data and a generic Open Graph image each.
   - Guide: how to fill a profile across the tools, one tool at a time in the order the doors opened, saying what each adds to the card; what the profile file is and why nothing is stored; how to post a card on the forum and put it on IIWiki. Each tool's part is data keyed by the tool's id and shown only once that tool has launched. Sources and a last-updated date.
   - Glossary: about twenty terms (infobox, link preview, Open Graph, demonym, head of state, GDP and the like).
   - Examples: the four nations as cards, each a link into the maker.
3. **The tool**, as a Svelte 5 island:
   - Load a profile (the picker, or a file dropped anywhere), with @eurth/profile doing the checking; read a card from the link on arrival.
   - "Pulled from your other tools": each section with a tick and a word when it's there, and a link to the tool that fills it when it isn't and that tool has launched. The tools come in as props; browser code never imports `eurth.config.mjs`.
   - Name, capital and motto can be edited here (Card may write `identity`, and nothing else); Save profile writes them back with `setSection`.
   - Format, layout and theme choices, and the live preview. The card's colours come from `resolveColors(tokens, …)`, passed in as props.
   - The profile's pictures only ever through `<img>` or `<image>`.
4. **Exports**: every format as PNG and WebP, each checked to come out at its exact size; the profile file; Copy link, Copy picture, Copy description; the Share dialog. Two ways to make the picture are tried in real browsers (the whole card as one SVG through `svgToPicture`, or the card drawn in layers on a canvas with the flag and arms as their own pictures, using `render(…, { pictures: false })`), and the one that is right in Safari, Firefox and Chrome is kept. Hand `layout()` the browser's own text measure.
5. **No SVG download of the card** in v1: its fonts are the device's own, so the same file would look different elsewhere. PNG and WebP are exact.
6. **Delight**: the card deals itself onto the table and flips when a profile loads (under half a second, nothing for reduced motion, a card's flick if sound is on, so `site.sound`). A profile with all sixteen sections filled earns the gold edge, the count "16 of 16", and the toast "A complete nation. The wurld salutes you."
7. **The wiki infobox** (`infobox.ts`), once Stijn has answered: `{{Infobox country}}` wikitext from the card's data, with the flag and arms offered as files named as the infobox expects.
8. `npm run images`, then `npm run check && npm run build && npm test && npm run axe` until all pass; Lighthouse.
9. README (use, development, deployment), `docs/feedback-log.md`, and the handbook's "Done, for every tool". Done when that list is met, the card renders well from a profile with one section and from one with all of them, and every format exports at its exact size.
10. The launch: the scheduled run starts at 22:30 UTC on 23 December and deploys at the door, 24 December 00:00 Brussels. If it hasn't started by 22:45 UTC, start it by hand. Nothing is deployed before then.

### Later (not in v1; ask Stijn before any of it)

- **Per-card link previews.** A Worker that draws the card's picture from the link alone, keeps nothing personal, and stays inside the Workers Free plan. Only if step 9's numbers allow it; it must never cost money. A smaller step on the way: the Worker rewrites only the preview's title and description for a card (a millisecond or so), keeping the generic picture. That still makes every visit to the start page count against the account's 100,000 Worker requests a day, so it needs a decision of its own.
- **eurth.org.** In v1 a card link previews in forum posts through Open Graph, with the generic picture, and the Share dialog opens a pre-filled new topic. Later, "Save to my nation": the card and its infobox into the member's factbook post, signed in with eurth.org. Two ways in: DiscourseConnect (eurth.org as the identity provider, needs a setting and a secret on the forum, so a Worker to hold it) or Discourse user API keys (the member approves Card in the forum's own dialogue; the key stays in the page for the visit, and no server is needed). User API keys fit "nothing stored" better; either needs the forum's admins to allow it.
- **IIWiki.** In v1: copy the wikitext, upload the pictures by hand, with file names that already match. Deeper integration (a one-click upload, a gadget, a shared template for cards) needs the IIWiki admins.

## Releases

None yet.

## Not planned

- **Storing cards, accounts, or a gallery.** A card lives in its link, its picture or the profile file. Nothing is kept anywhere.
- **Editing other tools' sections.** Card reads everything and writes only `identity`. To change the flag, open Flagwright; the list on the page links to each tool.
- **The Eurth logo on the card.** The card is in-world material. It carries only the line "card.eurth.org".
- **Anything that could bill.** No paid Workers plan, no image service, no storage. If per-card previews don't fit the Free plan, they don't ship.
