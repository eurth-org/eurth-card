# Card

> A friendly note: Card is part of Eurth's advent calendar, and its door opens on 24 December 2026. The code is public, the site isn't yet. Please don't spoil the surprise before the door opens.

Card turns a nation's profile file into one shareable country fact card: flag, arms, name and motto, the key facts, a small seat chart and a strip of history. It is the last of the free worldbuilding tools by [Eurth](https://eurth.org), a worldbuilding and roleplay community since 2004, and will live at card.eurth.org.

What's planned, what each release added and exactly where work stands is in the [roadmap](roadmap.md). The rules every Eurth tool follows are in the handbook, [`node_modules/@eurth/style/HANDBOOK.md`](https://style.eurth.org/handbook/); on anything the tools share, the handbook wins.

## Use

1. Press **Load profile** and pick your nation's `.eurth.json` file, or drop it anywhere on the page. No profile yet? Type a name, a capital and a motto: that is a card already.
2. Choose a **format** (link preview 1200 x 630, square 1080 x 1080, portrait 1080 x 1350, story 1080 x 1920, pin 1000 x 1500 or wide 1600 x 900), one of three **layouts** (Classic, Banner, Ledger) and the card's colours (Night or Light).
3. Take it away: download the picture as **PNG** or **WebP**, or copy the link, the picture or the description. **Save profile** writes the name, capital and motto you typed back into your profile file.
4. For a wiki, choose the format **Wiki infobox**: the same facts as `{{Infobox country}}` wikitext for IIWiki, the same as wiki.eurth.org writes, with **Copy wikitext** and the flag and arms as files under the names the infobox asks for.

The card fills from whatever the profile holds. The list beside it shows which of the sixteen sections are there and, for each one that isn't, the tool that fills it. A profile with every section filled earns a gold edge.

Nothing is stored anywhere. A card lives in its link (which holds a compressed copy of just the card's data), in its picture and in your profile file. A card too big for a practical link says so, and offers a link without the larger picture.

The card is in-world material, so it carries no Eurth logo, only the line "card.eurth.org".

## Development

Node 22.23 or later (CI runs on Node 26).

```sh
npm install
npm run dev          # the site while you work
npm run check        # types, in pages and in components
npm run build        # the static site, into dist/
npm test             # the card's own tests and the suite's checks (they read dist/)
npm run axe          # accessibility: every page, both themes
npm run smoke        # the built site in real Chrome: headers, themes, nothing stored, offline
npm run exports      # every format in every layout, as PNG and WebP, at its exact size, and the wiki infobox (needs Chrome)
npm run preview      # the built site with its real headers (wrangler dev)
npm run images       # icons and the sharing image, after changing the card's look
npm run sheet        # every card for the example nations on one page, in out/
```

Where things are:

- `src/card/`: the engine, plain TypeScript with no page in it.
  - `read.ts`, `clean.ts`, `model.ts`: a profile, or anything at all, into a card's data. A file and a link are both someone else's input; everything goes through the cleaners.
  - `facts.ts`, `format.ts`: the facts in the order they earn a place, and numbers in words.
  - `seats.ts`, `text.ts`: the seat chart; fitting text into a width.
  - `formats.ts`, `layout.ts`: the six formats and three layouts, as placed boxes.
  - `render.ts`, `describe.ts`: the boxes as one SVG; the card in words.
  - `link.ts`: the card in its link (`?c=1.…`). `edit.ts`: the three fields Card may change.
  - `infobox.ts`: the card as a wiki infobox. `wiki/` holds Wiki's own writer, copied from eurth-wiki (see the third rule below).
  - `examples.ts`: four invented nations.
- `src/tool/`: the tool itself (`Card.svelte`), the browser's text measure, and the picture maker.
- `src/pages/`: the card maker, the guide, the glossary, the examples and the 404 page. `src/content/`: the guide's and the glossary's words, as data.
- `src/site/build.ts`: what the pages hand the tool at build time: the card's colours from the suite's tokens, and the tools that have launched.
- `tests/`: `shell.test.js` runs the checks every Eurth tool runs; the rest are Card's own.
- `tools/`: the contact sheet, the export check, the sharing image, and `measure-preview/` (below).
- `eurth.config.mjs`: the tool's name, address, title and pages. Build time only.
- `LAUNCH_AT`: the moment the door opens.

Three rules worth knowing before changing anything:

- **A profile's flag and arms are SVG from someone else.** They only ever go into an image (`<img>`, `<image>`, a canvas), never into the page as markup.
- **No built file may hold the address of a tool that hasn't launched.** The example profiles carry such addresses, so the site ships the examples as cards and card links, never as the profiles themselves; the tool links in the page and the guide's tool-by-tool part are made at build time from the tools that have launched.

- **`src/card/wiki/` is a copy.** The infobox must be the one Wiki writes, so its four modules are copied from eurth-wiki (`src/wiki/`), each marked with the commit it came from. Wiki's copy leads: change it there first, then here. `tests/fixtures/infobox/` holds what Wiki's own code writes for the example profiles, and the tests hold Card to it, to the character.

### Link previews of a card

A Worker that drew a card's picture for its link preview would need about 100 ms of CPU; the Workers Free plan allows 10. So Card is static files only, and a card's link previews with the site's generic picture. The measurement is in [`tools/measure-preview`](tools/measure-preview/README.md).

## Deployment

The site runs as a Cloudflare Worker serving static assets on its custom domain (`wrangler.jsonc`). Until the door opens it isn't deployed anywhere. The launch workflow opens the door at the time in `LAUNCH_AT`; after that, GitHub Actions deploys every push to `main` that passes, and a nightly run keeps `@eurth/style` and `@eurth/profile` up to date. Deploying uses the organisation secret `CLOUDFLARE_API_TOKEN`.

## Licence

Apache 2.0, see [LICENSE](LICENSE). Made by Orioni for Eurth.
