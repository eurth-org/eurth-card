You're building Card (card.eurth.org), which turns a nation profile into one shareable country fact card, the finale of Eurth's free worldbuilding tools. Eurth (eurth.org) is a worldbuilding and roleplay community since 2004. The attached repo is eurth-org/eurth-card.

Working order (start this session last, once most other tools are built):
1. Save this brief as CLAUDE.md.
2. If the repo named above doesn't exist on GitHub yet, create it as a public, empty repo in eurth-org with the gh CLI and connect this folder; if you can't, ask me.
3. Read github.com/eurth-org/eurth-style (HANDBOOK.md), github.com/eurth-org/eurth-profile and the other tools' repos. Write the plan and show it to me.
4. Build the card's logic (reading every profile section, the layouts, the formats) as plain TypeScript modules with thorough tests.
5. Once @eurth/style 1.0.0 is released, build the site from its starter template and carry on to the end of this brief.
6. Commit and push after every finished step, and keep roadmap.md up to date with exactly where to pick up, so a new session can continue if this one stops.

Background for every step: Read HANDBOOK.md in github.com/eurth-org/eurth-style and start from its starter template; read the whole profile schema in github.com/eurth-org/eurth-profile, because the card reads every section; look at github.com/eurth-org/eurth-flag, the reference build. The handbook wins over this brief on everything shared. Then write a plan and show it to me before you build.

Mock-up: the "card.eurth.org, country fact card" board on https://claude.ai/artifact/32RKDdVTtCfHsL6Qc6LxV6.

Pages: Card, Guide (how to fill a profile across the tools), Examples.

The card, v1
- Load a profile file (picker or drop). The card fills from whatever sections exist; each missing one shows a link to the tool that fills it.
- The card: flag, arms, name and motto; key facts (capital, population, government, head of state, GDP, currency); a small seat chart; a timeline strip if there is one. It's in-world material, so it carries no Eurth logo, only the line "card.eurth.org".
- Formats: link preview 1200 x 630, square 1080 x 1080, portrait 1080 x 1350, story 1080 x 1920, pin 1000 x 1500, and a wiki infobox (the same wikitext as wiki.eurth.org).
- Layout choices: three card layouts and the two themes.

Sharing without storage
- Nothing is stored anywhere. A card's link carries a compact, compressed copy of just the card's data; if the data is too big for a practical link, say so and offer the image and the profile file instead.
- Link previews of a specific card: only if it fits the Workers Free plan. A Worker may render the card image from the link alone and cache nothing personal. Measure the CPU time per render first: if it can exceed the Free plan's limit, ship v1 with the generic Open Graph image and put per-card previews on the roadmap. It must never cost money.

eurth.org and IIWiki (not in v1; write the plan in roadmap.md)
- eurth.org: a card link previews in forum posts through Open Graph. Later: "Save to my nation" into a factbook post, with eurth.org sign-in (DiscourseConnect or Discourse user API keys). Ask me before any of it.
- IIWiki: copy-paste the wikitext and upload the images. Deeper integration needs the IIWiki admins.

Exports: every format as PNG and WebP, the wiki infobox, the profile file, Copy link, Copy picture, Copy description.

Signature touch: the card deals itself onto the table and flips. Easter egg: a profile with every section filled earns a gold edge and the toast "A complete nation. The wurld salutes you."

Done when the handbook's checklist passes, the card renders well from a profile with only one section and from one with all of them, and every format exports at its exact size.
