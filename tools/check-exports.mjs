// Does every format export at its exact size? This opens the built site in the Chrome on this
// machine, presses the PNG and WebP buttons for every layout and format, and reads each
// downloaded file's size from its own bytes. It also loads a full profile and opens a card
// from its link, to see the tool through from end to end.
//
//   npm run build && npm run exports
//
// Set CHROME to the browser's path if it isn't where Playwright looks.
import { createReadStream, existsSync, mkdtempSync, readFileSync, rmSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';
import { createServer as createVite } from 'vite';

const dist = 'dist';
if (!existsSync(join(dist, 'index.html'))) {
  console.error('No built site in dist/. Run "npm run build" first.');
  process.exit(2);
}

// The engine is TypeScript; Vite reads it for us, as it does for the site.
const vite = await createVite({ server: { middlewareMode: true, hmr: false, ws: false }, appType: 'custom', logLevel: 'error' });
const { FORMATS, LAYOUTS } = await vite.ssrLoadModule('/src/card/formats.ts');
const { pictureSize } = await vite.ssrLoadModule('/src/card/picture-size.ts');
await vite.close();

const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon', '.json': 'application/json', '.webmanifest': 'application/manifest+json' };
const server = createServer((request, response) => {
  let file = join(dist, decodeURIComponent(new URL(request.url ?? '/', 'http://localhost').pathname));
  if (existsSync(file) && statSync(file).isDirectory()) file = join(file, 'index.html');
  const found = file.startsWith(dist) && existsSync(file);
  response.writeHead(found ? 200 : 404, { 'Content-Type': TYPES[extname(file)] ?? 'application/octet-stream' });
  if (found) createReadStream(file).pipe(response);
  else response.end();
});
await new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve(undefined)));
const address = /** @type {import('node:net').AddressInfo} */ (server.address());
const home = `http://127.0.0.1:${address.port}`;

const folder = mkdtempSync(join(tmpdir(), 'card-exports-'));
const browser = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : { channel: 'chrome' });
let failures = 0;
const fail = (message) => {
  failures += 1;
  console.error(`  FAILED: ${message}`);
};

try {
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, serviceWorkers: 'block', acceptDownloads: true });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(String(error)));
  page.on('console', (message) => message.type() === 'error' && errors.push(message.text()));

  const exportAll = async (label) => {
    let checked = 0;
    for (const layout of LAYOUTS) {
      await page.locator(`input[name="layout"][value="${layout.id}"]`).check({ force: true });
      for (const format of FORMATS) {
        await page.locator('select.eu-select').selectOption(format.id);
        for (const [button, type] of [['PNG', 'png'], ['WebP', 'webp']]) {
          const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: button, exact: true }).click()]);
          const file = join(folder, download.suggestedFilename());
          await download.saveAs(file);
          const size = pictureSize(new Uint8Array(readFileSync(file)));
          checked += 1;
          const right = size && size.type === type && size.width === format.width && size.height === format.height;
          if (!right) fail(`${label}, ${layout.name}, ${format.name} as ${button}: wanted ${type} ${format.width} x ${format.height}, got ${size ? `${size.type} ${size.width} x ${size.height}` : 'no picture'} (${download.suggestedFilename()})`);
          if (!download.suggestedFilename().endsWith(`-card-${format.id}.${type}`)) fail(`an odd file name: ${download.suggestedFilename()}`);
        }
      }
    }
    console.log(`${label}: ${checked} pictures, ${LAYOUTS.length} layouts x ${FORMATS.length} formats x PNG and WebP, each at its exact size.`);
  };

  // 1. The example on the table when the page opens.
  await page.goto(`${home}/`, { waitUntil: 'networkidle' });
  if (!(await page.locator('#sections-title').textContent())?.includes('8 of 16')) fail('the example should show 8 of 16 sections');
  await exportAll('The example');

  // 2. A full profile, loaded as a visitor would: every section, the gold edge, the toast.
  const profile = fileURLToPath(new URL('../node_modules/@eurth/profile/examples/calderwyn.eurth.json', import.meta.url));
  const [chooser] = await Promise.all([page.waitForEvent('filechooser'), page.getByRole('button', { name: 'Load profile' }).click()]);
  await chooser.setFiles(profile);
  await page.locator('.eu-toast').filter({ hasText: 'A complete nation. The wurld salutes you.' }).waitFor({ timeout: 5000 }).catch(() => fail('no toast for a complete nation'));
  if (!(await page.locator('#sections-title').textContent())?.includes('16 of 16')) fail('a full profile should show 16 of 16 sections');
  if (!(await page.locator('#result-title').textContent())?.includes('Kingdom of Calderwyn')) fail('the card should carry the loaded nation\'s name');
  if (!new URL(page.url()).searchParams.get('c')?.startsWith('1.')) fail('the address should hold the card once a profile is loaded');
  await exportAll('A full profile');

  // The flag is in the exported picture, not just in the preview: look at a pixel of it.
  await page.locator('input[name="layout"][value="banner"]').check({ force: true });
  await page.locator('select.eu-select').selectOption('preview');
  const [flagged] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'PNG', exact: true }).click()]);
  const flagFile = join(folder, 'flag-check.png');
  await flagged.saveAs(flagFile);
  // Calderwyn's flag is mostly one blue (#123a5a), and in the Banner layout it fills a good part
  // of a link preview: count how much of the picture is that blue.
  const share = await page.evaluate(async (base64) => {
    const bitmap = await createImageBitmap(await (await fetch(`data:image/png;base64,${base64}`)).blob());
    const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
    const context = canvas.getContext('2d');
    context.drawImage(bitmap, 0, 0);
    const { data } = context.getImageData(0, 0, bitmap.width, bitmap.height);
    let blue = 0;
    for (let at = 0; at < data.length; at += 4) {
      if (Math.abs(data[at] - 0x12) < 10 && Math.abs(data[at + 1] - 0x3a) < 10 && Math.abs(data[at + 2] - 0x5a) < 10) blue += 1;
    }
    return blue / (data.length / 4);
  }, readFileSync(flagFile).toString('base64'));
  if (share < 0.06) fail(`the flag is missing from the exported picture (only ${(share * 100).toFixed(1)}% of it is the flag's blue)`);
  else console.log(`The flag is in the exported picture (${(share * 100).toFixed(0)}% of it is the flag's blue).`);

  // The wiki infobox: the same wikitext Wiki writes, copied whole, with the pictures under the
  // names it asks for.
  const expected = readFileSync(fileURLToPath(new URL('../tests/fixtures/infobox/calderwyn.wiki', import.meta.url)), 'utf8').trimEnd();
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.locator('select.eu-select').selectOption('infobox');
  const shown = await page.locator('pre.wikitext').textContent();
  if (shown !== expected) fail('the wiki infobox on the page is not the one Wiki writes for the same profile');
  if (await page.locator('input[name="layout"]').count()) fail('the layouts should step aside for the wiki infobox');
  await page.getByRole('button', { name: 'Copy wikitext' }).click();
  await page.getByRole('button', { name: 'Copied' }).waitFor({ timeout: 5000 }).catch(() => fail('Copy wikitext should say it copied'));
  if ((await page.evaluate(() => navigator.clipboard.readText())) !== expected) fail('Copy wikitext should put the whole infobox on the clipboard');
  for (const [button, name] of [['Flag for the wiki', 'Flag of Calderwyn.svg'], ['Arms for the wiki', 'Coat of arms of Calderwyn.svg']]) {
    const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: button }).click()]);
    if (download.suggestedFilename() !== name) fail(`${button}: wanted the file "${name}", got "${download.suggestedFilename()}"`);
    if (!expected.includes(`= ${name}\n`)) fail(`the infobox should ask for "${name}"`);
    const file = join(folder, download.suggestedFilename());
    await download.saveAs(file);
    if (!readFileSync(file, 'utf8').includes('<svg')) fail(`${button}: the file should be the drawing itself`);
  }
  await page.locator('select.eu-select').selectOption('square');
  if (!(await page.locator('#result-title').textContent())?.includes('square')) fail('the card should come back after the wiki infobox');
  await page.locator('select.eu-select').selectOption('preview');
  console.log(`The wiki infobox is the one Wiki writes (${expected.split('\n').length - 2} lines), copies whole, and hands over the flag and the arms under its own names.`);

  // 3. A card opened from its link, as someone following a shared link would.
  const link = page.url();
  const second = await context.newPage();
  await second.goto(link, { waitUntil: 'networkidle' });
  await second.locator('#result-title').filter({ hasText: 'Kingdom of Calderwyn' }).waitFor({ timeout: 5000 }).catch(() => fail('a card link should open its card'));
  if (!(await second.locator('#sections-title').textContent())?.includes('16 of 16')) fail('a card from a link should know its sections');
  if (!(await second.locator('input[name="layout"][value="banner"]').isChecked())) fail('a card from a link should keep its layout');
  await second.locator('select.eu-select').selectOption('infobox');
  if ((await second.locator('pre.wikitext').textContent()) !== expected) fail('a card from a link should write the same wiki infobox as its profile');
  console.log(`A card opens from its link (${link.length} characters), and writes the same infobox.`);
  await second.close();

  // 4. A link that holds nothing readable falls back to the example, and says so.
  const third = await context.newPage();
  await third.goto(`${home}/?c=1.nonsense`, { waitUntil: 'networkidle' });
  await third.locator('.eu-toast').filter({ hasText: "doesn't hold a card" }).waitFor({ timeout: 5000 }).catch(() => fail('no word about an unreadable link'));
  await third.close();

  if (errors.length) fail(`the page reported errors:\n    ${errors.join('\n    ')}`);
} finally {
  await browser.close();
  server.close();
  rmSync(folder, { recursive: true, force: true });
}

if (failures) {
  console.error(`\n${failures} ${failures === 1 ? 'check' : 'checks'} failed.`);
  process.exit(1);
}
console.log('\nEvery export is its exact size, and the tool works from end to end.');
