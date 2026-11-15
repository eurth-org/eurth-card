# Roadmap

Card turns a nation's profile file into one shareable country fact card, at card.eurth.org. It is door 15, the last door of Eurth's 2026 advent calendar, and opens on 24 December 2026 at 00:00 Europe/Brussels.

Three parts: what comes next, what each release added (newest first), and what's not planned. Points from reviews are in the [feedback log](docs/feedback-log.md).

## Where to pick up

**15 November 2026.** The tool is built and its checks pass; it is not deployed, and won't be until its door. A new session starts at "Next". Read `CLAUDE.md` (the brief) and `node_modules/@eurth/style/HANDBOOK.md` first; the handbook wins on everything shared.

How it stands:

- `npm run check`, `npm run build`, `npm test` (249 tests, the suite's own checks among them) and `npm run axe` pass. CI is green on `main`, Lighthouse included.
- `npm run exports` opens the built site in Chrome and presses every button: 72 pictures (3 layouts, 6 formats, PNG and WebP, for a part-filled and a full profile), each read back at its exact size; a full profile loaded from its file; a card opened from its link.
- Astro needs Node 22.23 or later. On Stijn's Mac the default `node` is older: put `/opt/homebrew/bin` first on the `PATH` (Node 26).

Waiting on Stijn:

1. **The wiki infobox**, the one export in the brief that isn't built. IIWiki sits behind a bot check, so its `Template:Infobox country` couldn't be read from here. Paste the template's parameter list (or the "Eurth country setup" page, User:Orioni/Sandbox 7), and say where the shared code should live: in Card first, for Wiki's chat to copy with its expected output, or in @eurth/profile for both tools to import.
2. **A gold token.** The kit has no gold, so the gold edge uses `caution-text` (`#ffc673` at Night, `#7a4100` in light). Either that will do, or @eurth/style gets a `gold` token and `src/site/build.ts` takes it.
3. **A look by eye.** The card is dealt and flips when a profile loads; the checks can tell that it works, not that it looks right. Open `npm run preview`, load a profile, and say what to change.

## Next

- **The wiki infobox** (`src/card/infobox.ts`), once Stijn has answered: `{{Infobox country}}` wikitext from the card's data, the same as wiki.eurth.org writes, with the flag and arms offered as files named as the infobox expects. Then a "Wiki infobox" choice in the tool with Copy wikitext, and the guide's "On a wiki" paragraph rewritten to match.
- **Safari and Firefox.** The export check runs in Chrome. The picture is made in a way chosen to be safe in all three (the card from one SVG, the flag and arms laid over it as pictures of their own, each given a stated size), but it has only been seen working in Chrome. Try all six formats in Safari and Firefox before the door; older Safari can't write WebP, and the tool then says the file is a PNG.
- **Phones.** Check the tool at phone width with a story card: the preview is held to most of the window's height.
- **The door.** The launch workflow starts at 22:30 UTC on 23 December and deploys at 00:00 Brussels on the 24th. If it hasn't started by 22:45 UTC, start it by hand. Afterwards delete `.github/workflows/launch.yml`.
- **After the door:** submit the sitemap, and post the card of a real Eurth nation on the forum, once its player agrees.

### Later (not in v1; ask Stijn before any of it)

- **Per-card link previews.** A Worker that draws the card's picture from the link alone and keeps nothing personal. Measured on 14 November 2026: it needs 58 to 105 ms of CPU a picture, and the Workers Free plan allows 10 (`tools/measure-preview/`). So not as things are; it must never cost money. A smaller step that would fit: the Worker rewrites only the preview's title and description for a card (a millisecond or so), keeping the generic picture. That still makes every visit to the start page count against the account's 100,000 Worker requests a day, so it needs a decision of its own.
- **eurth.org.** In v1 a card link previews in forum posts through Open Graph, with the generic picture, and the Share dialog opens a pre-filled new topic. Later, "Save to my nation": the card and its infobox into the member's factbook post, signed in with eurth.org. Two ways in: DiscourseConnect (eurth.org as the identity provider; it needs a setting and a secret on the forum, so a Worker to hold it) or Discourse user API keys (the member approves Card in the forum's own dialogue; the key stays in the page for the visit, and no server is needed). User API keys fit "nothing stored" better; either needs the forum's admins to allow it.
- **IIWiki.** In v1: copy the wikitext, upload the pictures by hand, with file names that already match. Deeper integration (a one-click upload, a gadget, a shared template for cards) needs the IIWiki admins.
- **An SVG download of the card.** Left out because the card's fonts are the device's own, so the same file would look different elsewhere. It could come back with the text turned into outlines.

## 24 December 2026: 1.0.0, at the door

The first version, as it stands in the repository.

- **A card from a profile.** Load a profile file (the picker, or dropped anywhere on the page). The card fills from whatever the sixteen sections hold: flag, arms, name and motto; the six key facts (capital, population, government, head of state, GDP, currency) and up to eight more where there is room; a seat chart; a timeline. Nothing is left as an empty box: a name alone makes a card.
- **What's missing, and where to get it.** A list of the sixteen sections says which are on the card and, for each that isn't, links to the tool that fills it, once that tool has launched.
- **Six formats, three layouts, two themes.** Link preview 1200 x 630, square 1080 x 1080, portrait 1080 x 1350, story 1080 x 1920, pin 1000 x 1500 and wide 1600 x 900; Classic, Banner and Ledger; Night and Light. A card shows as much as fits, draws things closer before it drops a key fact, and says less larger.
- **In-world.** The card carries no Eurth logo, only the line "card.eurth.org".
- **Exports.** PNG and WebP at the format's exact size; Copy link, Copy picture, Copy description; the Share dialog, with a forum topic already written; the profile file, with the name, capital and motto typed here written to `identity` and nothing else touched.
- **Sharing without storage.** The link holds a compressed copy of just the card's data (`?c=1.…`), about 1,400 characters for a full nation. Past 2,000 the tool says the link is long; past 8,000 it says the card is too big for a link and offers one without the arms or the flag.
- **Someone else's input.** A profile and a link go through one reader that trusts neither. Text is always escaped; the flag and arms only ever go into an image.
- **The card in words.** A written description of every card, as the picture's alternative text and for copying.
- **Delight.** The card is dealt onto the table and flips, with a soft sound if sound is on and nothing for reduced motion. A profile with all sixteen sections filled earns a gold edge, the count "16 of 16", and "A complete nation. The wurld salutes you."
- **Pages.** The card maker, a guide to filling a profile tool by tool, a glossary of 25 terms and four example nations.
- **Link previews** use the site's generic picture: drawing one for each card costs ten times what the Workers Free plan allows.

Not in it: the wiki infobox (see "Next").

## Not planned

- **Storing cards, accounts, or a gallery.** A card lives in its link, its picture or the profile file. Nothing is kept anywhere.
- **Editing other tools' sections.** Card reads everything and writes only `identity`. To change the flag, open the tool that made it; the list on the page links to each tool.
- **The Eurth logo on the card.** The card is in-world material. It carries only the line "card.eurth.org".
- **Anything that could bill.** No paid Workers plan, no image service, no storage. If per-card previews don't fit the Free plan, they don't ship.
