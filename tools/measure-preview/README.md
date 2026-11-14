# Measuring link previews

Could a Worker draw a card's picture for its link preview, from the link alone, inside Cloudflare's Workers Free plan? The plan allows 10 ms of CPU per request, and Card must never cost money. This folder holds the measurement that answers it. Nothing here is built into the site or deployed.

```sh
npm install
npm run measure            # on a Mac, with the system's Arial
npm run measure regular.ttf bold.ttf
```

The script does what such a Worker would do: read a card's link, lay the card out, draw it as SVG, and turn the SVG into a 1200 x 630 PNG with resvg compiled to WebAssembly. It times each part in CPU milliseconds, 40 runs each after a warm-up, and writes the pictures to `out/`.

## Result, 14 November 2026

Node 22.14 on an Apple M-series laptop, resvg-wasm 2.6.2. CPU milliseconds for the whole job:

| Card | Median | 95th percentile | Slowest |
| --- | --- | --- | --- |
| Calderwyn (every section) | 105 | 148 | 183 |
| Teland | 100 | 145 | 152 |
| Vantmoor (no arms, no seats) | 58 | 90 | 96 |

Reading the link takes about 1 ms and laying out and drawing the SVG 1 to 3 ms. Turning the SVG into a PNG takes 56 to 101 ms at the median: ten times the limit for a full card, and more than five times for the simplest one. Starting the rasteriser costs another 27 ms once per Worker start, and the Worker would have to carry 2.5 MB of WebAssembly and its own fonts (a Worker has none).

**So v1 ships with the generic Open Graph image**, and per-card previews are on the [roadmap](../../roadmap.md) under "Later".

The numbers come from Node, not from a Worker. Both run the same V8 and the same WebAssembly, and a laptop's core is faster than a shared one at the edge, so a Worker would not do better. With a result ten times over the limit, a closer measurement would not change the answer.
