// Makes the pictures that aren't drawn by hand, with the Chrome on this machine: the favicon,
// the home-screen icons and the sharing image. Run it after changing the card's look, and
// commit what it writes to public/:  npm run images
import { makeImages, sharingImage } from '@eurth/style/images';
import { createServer } from 'vite';
import { site } from '../eurth.config.mjs';

// The card on the sharing image comes from the same code as the site (Vite reads TypeScript).
const vite = await createServer({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'error' });
try {
  const { EXAMPLES } = await vite.ssrLoadModule('/src/card/examples.ts');
  const { layout } = await vite.ssrLoadModule('/src/card/layout.ts');
  const { readCard } = await vite.ssrLoadModule('/src/card/read.ts');
  const { dataAddress, render } = await vite.ssrLoadModule('/src/card/render.ts');
  const { cardThemes } = await vite.ssrLoadModule('/src/site/build.ts');

  // An invented nation with every section filled, as a portrait card: it fits the picture's right half.
  const data = readCard(EXAMPLES[0].profile);
  const card = render(layout(data, { format: 'portrait', layout: 'classic' }), data, cardThemes().night);
  const art = `<img src="${dataAddress(card)}" alt="" style="display:block;max-width:100%;max-height:100%">`;
  const made = await makeImages({ sharing: [{ file: 'og.png', html: sharingImage({ site, art }) }] });
  console.log(`Made ${made.map((file) => `public/${file}`).join(', ')}`);
} finally {
  await vite.close();
}
