# Roadmap

Card turns a nation's profile file into one shareable country fact card, at card.eurth.org. It is door 15, the last door of Eurth's 2026 advent calendar, and opens on 24 December 2026 at 00:00 Europe/Brussels.

Three parts: what comes next, what each release added (newest first), and what's not planned.

## Where to pick up

**14 November 2026.** The brief is saved, the repository exists, and this plan is written. Nothing is built. The plan is waiting for Stijn's go-ahead; the next step is Phase 1, step 1.

Waiting on others:

- **@eurth/style 1.0.0** is not released. On GitHub the repository holds only its brief: no HANDBOOK.md, no starter template, no tag. Phase 2 can't start until it is: check `gh release list -R eurth-org/eurth-style`. This plan was written from the Foundations brief and the work in progress on disk; when the handbook is out, read it and correct the plan where they differ.
- **@eurth/profile 1.0.0** is not tagged, and only its README is on GitHub. The schema and three example profiles exist in the work in progress. Until the tag, Card's engine reads profiles with its own careful reader and tests against copies of the three examples (step 1); after it, the copies give way to `@eurth/profile/examples/*`.
- **Wiki (wiki.eurth.org)** has no repository yet. The brief wants Card's infobox to be the same wikitext as Wiki's, so the two must share one source (see the questions below).

Questions for Stijn (none blocks Phase 1, steps 1 to 6):

1. **The infobox, one source for two tools.** Card can write the `{{Infobox country}}` module first, as one file with fixed expected output for the three example profiles, and Wiki's chat copies the file and the fixtures. Or it goes into @eurth/profile so both import it. Which do you prefer? And is IIWiki's `Template:Infobox country` the one to write for (the mock-up's parameters are Wikipedia's)?
2. **A glossary page.** The brief lists Card, Guide and Examples; the Foundations brief asks every tool for a glossary too, and the mock-up's header shows one. The plan adds a short one. Say if Card should go without.
3. **Measuring a deployed Worker.** CPU time can be measured locally in workerd, which is what step 9 does. A real figure from Cloudflare's own machines needs a deployed Worker, and nothing of Card may be deployed before its door. If the local figure is anywhere near the limit, may I deploy a throwaway Worker under a neutral name (no Eurth or Card in it, deleted after) to measure? Otherwise the local figure decides.

## Next

### Phase 1: the engine (needs nothing from @eurth/style)

Plain TypeScript in `src/card/`, tests in `tests/`, as Flagwright keeps its engine in `src/flag/`. Only TypeScript and Vitest are installed. Commit and push after each step.

1. **Reading a profile** (`read.ts`): one pure function from anything profile-shaped to the card's data. It trusts nothing: every text is trimmed and capped, every number checked, every list cut to what a card can show, and unknown keys ignored. It reads all sixteen sections:
   - Name: `identity.officialName`, else `identity.commonName`, else `meta.nation`. Motto from `identity`.
   - Flag and arms: the SVG text, kept as text and only ever shown as a picture; the flag's ratio.
   - Key facts, in the brief's order: capital (`identity.capital`, else the city marked capital in `cities`), population, government form, head of state (`government.headOfState`, else `dynasty.monarch`), GDP, currency (`bank.currency` and `code`).
   - More facts, used where a format has room: head of government, legislature, area, people per km², GDP per person, demonym, languages, largest city, ruling house and heir, calendar and its era, anthem title, naming language, armed forces (branches and active personnel), passport colour, drives on.
   - Seats: chamber, total, parties with seats and colours. Timeline: title, span and events, with the calendar's era after each year when there is one.
   - Which sections are filled, for the "pulled from your other tools" list and the easter egg. A section counts as filled when it holds at least one fact of its own or a summary, not just a link and a date.
2. **Numbers and words** (`format.ts`): "12.5 million", "$512 billion", "148,300 km²", "84 per km²", in British English; years with an era; lists joined with "and".
3. **Seat chart** (`seats.ts`): a half-circle of dots from parties and seats, rows chosen by seat count, largest party first from the left, with a cap on dots for very large chambers (above it, each dot stands for several seats and the caption says so). Parties without a colour get greys that differ in lightness. The caption and the description carry the names and numbers, so nothing depends on colour alone.
4. **Layouts** (`layout.ts`, `formats.ts`): one function from card data, a format, a layout and a theme to a list of placed boxes: texts with their size and lines, picture slots, the seat chart, the timeline strip, and the line "card.eurth.org". No Eurth logo anywhere on the card.
   - Formats: link preview 1200 x 630, square 1080 x 1080, portrait 1080 x 1350, story 1080 x 1920, pin 1000 x 1500, and wide 1600 x 900 (the brief lists five; the shared size list has wide as a sixth, and the engine gives it for free).
   - Three layouts, working names: **Classic** (flag, arms, name and motto across the top, facts in a grid, the seat chart beside them: the mock-up), **Banner** (the flag large as the card's head, the name over the facts below) and **Ledger** (one column of label and value rows, like the data page of a passport).
   - Two themes, Night and light. Colours arrive as a palette, so the site passes @eurth/style's tokens and the engine holds no colours of its own.
   - Missing things leave no holes: without arms the flag centres, without seats the facts take the width, with one section the card is a name and what there is. Facts fill in priority order until the format is full.
   - Text is fitted with a width estimate (wrap, then shrink to a floor, then cut with an ellipsis), checked against real measurements in the browser in Phase 2.
   - Tests: every layout in every format and theme, for the three example profiles, for sixteen profiles with one section each, and for a profile with only `meta`. Each must have its exact size, every box inside the card, no two boxes overlapping, and no text under the smallest size.
5. **Drawing** (`render.ts`): the placed boxes as one SVG string with a title and a description. All text escaped; flag and arms go in as `<image>` data addresses, never as markup. Hostile profiles (markup in names, scripts in SVG, absurd lengths) are part of the tests.
6. **Description** (`describe.ts`): the card as plain text, for Copy description and screen readers: the name and motto, each fact as a sentence, the seats by party, the timeline's events.
7. **The link** (`link.ts`): just the card's data (not the whole profile), with short keys, compressed (deflate) and base64url, versioned, in the query string. A set limit for a practical link (8,000 characters, the suite's own ceiling, with a gentler warning from 2,000, where some apps start cutting). Over the limit the tool says so and offers the picture and the profile file; if leaving the arms or the flag out of the link is what makes it fit, it offers that too. Reading a link back is as distrustful as reading a file.
8. **Wiki infobox** (`infobox.ts`): `{{Infobox country}}` wikitext from the same card data, with the file names it expects for the flag and arms ("Flag of Calderwyn.svg"), so the downloads can be named to match. Waits for question 1; check IIWiki's template parameters before writing it.
9. **The Worker question, measured** (`tools/measure-preview/`, kept out of the site): render the 1200 x 630 card to PNG in workerd locally (an SVG rasteriser in WebAssembly, one bundled font since a Worker has no system fonts) and record CPU time per render for the three example profiles. The Free plan allows 10 ms of CPU per request. If any render can go over, v1 ships the generic Open Graph image and per-card previews go to "Later", with the numbers written down here. Expectation, to be proved or not: rasterising takes tens of milliseconds, so v1 is static files only.
10. **Examples** (`examples.ts`): cards for invented nations: Calderwyn (every section), Vantmoor (mid-sized), Hesperwick (a flag and nothing else) and the mock-up's Teland, each as a profile and as a link.
11. **Guide and glossary** (`src/content/`): how to fill a profile across the tools, one tool at a time in the order the doors opened, saying what each adds to the card; what the profile file is and why nothing is stored; how to post a card on the forum and put the infobox on IIWiki. A short glossary (infobox, link preview, Open Graph, demonym, head of state, GDP and the like). Sources and a last-updated date.
12. **A contact sheet** (`tools/contact-sheet.mjs`): every layout, format and theme for the example profiles on one page, to look over by eye before Phase 2.

### Phase 2: the site (only once @eurth/style 1.0.0 is released)

13. Read HANDBOOK.md first; where it differs from this plan, the handbook wins. Start from the starter template in eurth-style.
14. Pages: Card (the maker), Guide, Glossary, Examples, with titles ("Card: free online country fact card maker for worldbuilders"), descriptions, canonical links, JSON-LD, sitemap.xml, robots.txt, llms.txt and a generic Open Graph image each.
15. The tool, as a Svelte 5 island:
    - Load a profile (the picker, or a file dropped anywhere), with @eurth/profile doing the checking.
    - "Pulled from your other tools": each section with a tick and a word when it's there, and a link to the tool that fills it when it isn't. The list of tools comes in at build time as props; browser code never carries it.
    - Name, capital and motto can be edited here (Card may write `identity`, and nothing else).
    - Format, layout and theme choices, and the live preview at the chosen size.
    - The profile's pictures only ever through `<img>` or `<image>`; the content security policy allows `img-src 'self' data:`.
16. Exports: every format as PNG and WebP, each checked to come out at its exact size; the wiki infobox with the flag and arms as files named to match; the profile file; Copy link, Copy picture, Copy description; the Share dialog. Two ways to make the picture are tried in real browsers (the whole card as one SVG, or the card drawn in layers on a canvas with the flag and arms as their own pictures) and the one that is right in Safari, Firefox and Chrome is kept.
17. No SVG download of the card in v1: its fonts are the device's own, so the same file would look different elsewhere. PNG and WebP are exact.
18. Delight: the card deals itself onto the table and flips when a profile loads (under half a second, nothing for reduced motion, a card's flick if sound is on). A profile with all sixteen sections filled earns a gold edge, the count "16 of 16", and the toast "A complete nation. The wurld salutes you."
19. Offline, install, security headers, axe and Lighthouse checks, as the handbook asks.
20. CI, and the launch workflow: `LAUNCH_AT` is `2026-12-24T00:00:00+01:00`, the scheduled run starts at 22:30 UTC on 23 December, and it also runs by hand. No custom domain and no workers.dev deploy before then. Card is already in tools.json.
21. README (use, development, deployment), docs/feedback-log.md, and the handbook's checklist. Done when the checklist passes, the card renders well from a profile with one section and from one with all of them, and every format exports at its exact size.

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
