// Numbers and words as the card prints them, in British English. Written out by hand so the
// same number reads the same on every device and in the tests.

/** 1234567.5 as "1,234,567.5". */
export function group(value: number, decimals = 0): string {
  const fixed = Math.abs(value).toFixed(decimals);
  const [whole = '0', fraction] = fixed.split('.');
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  const trimmed = fraction?.replace(/0+$/, '');
  const sign = value < 0 && Number(fixed) !== 0 ? '−' : '';
  return sign + grouped + (trimmed ? `.${trimmed}` : '');
}

const WORDS: readonly (readonly [number, string])[] = [
  [1e12, 'trillion'],
  [1e9, 'billion'],
  [1e6, 'million'],
];

/** Three significant figures, without the zeros that add nothing: 12.48 is "12.5", 512 is "512". */
function three(value: number): number {
  return Number(value.toPrecision(3));
}

/** A count of things: "613,000", "12.5 million", "1.94 trillion". */
export function count(value: number): string {
  if (value < 1e6) return group(Math.round(value));
  for (const [size, word] of WORDS) {
    // 999,950,000 rounds to "1,000 million": say "1 billion" instead.
    if (three(value / size) >= 1) {
      const shown = three(value / size);
      return `${shown >= 1000 ? group(shown) : String(shown)} ${word}`;
    }
  }
  return group(Math.round(value));
}

/** Money in US dollars: "$512 billion", "$41,026". */
export function money(usd: number): string {
  return `$${count(usd)}`;
}

/** "148,300 km²". */
export function area(km2: number): string {
  return `${group(km2, km2 < 100 ? 1 : 0)} km²`;
}

/** People per square kilometre: "84 per km²", "3.2 per km²". Nothing for a nation with no land. */
export function density(population: number, km2: number): string | undefined {
  if (!(km2 > 0)) return undefined;
  const each = population / km2;
  return `${group(each, each < 10 ? 1 : 0)} per km²`;
}

/** "71%", "1.8%". */
export function percent(value: number): string {
  return `${group(value, 1)}%`;
}

/** A year with the calendar's era after it, "1412 LR". Years before year 1 keep their minus. */
export function year(value: number, era?: string): string {
  const shown = value < 0 ? `−${Math.abs(value)}` : String(value);
  return era ? `${shown} ${era}` : shown;
}

/** "Army", "Army and Navy", "Army, Navy and Air Force". */
export function joinList(items: readonly string[]): string {
  if (items.length <= 1) return items[0] ?? '';
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;
}

/** "left" as "Left". */
export function capitalise(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

// Passport covers come in a handful of colours; a word beside the swatch means the colour is
// never told by colour alone.
/** A plain word for a colour: "navy blue", "burgundy", "dark green". */
export function colourWord(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const light = (max + min) / 2;
  const spread = max - min;
  const saturation = spread === 0 ? 0 : spread / (1 - Math.abs(2 * light - 1));
  if (saturation < 0.12 || spread < 0.06) {
    if (light < 0.2) return 'black';
    if (light > 0.85) return 'white';
    return light < 0.5 ? 'dark grey' : 'grey';
  }
  let hue = 0;
  if (max === r) hue = ((g - b) / spread) % 6;
  else if (max === g) hue = (b - r) / spread + 2;
  else hue = (r - g) / spread + 4;
  hue = (hue * 60 + 360) % 360;
  const dark = light < 0.33;
  const pale = light > 0.7;
  if (hue < 15 || hue >= 345) return dark ? 'burgundy' : pale ? 'pink' : 'red';
  if (hue < 40) return dark ? 'brown' : pale ? 'peach' : 'orange';
  if (hue < 65) return dark ? 'olive' : pale ? 'cream' : 'gold';
  if (hue < 165) return dark ? 'dark green' : pale ? 'pale green' : 'green';
  if (hue < 195) return dark ? 'dark teal' : pale ? 'pale blue' : 'teal';
  if (hue < 255) return dark ? 'navy blue' : pale ? 'pale blue' : 'blue';
  if (hue < 290) return dark ? 'dark purple' : pale ? 'lilac' : 'purple';
  return dark ? 'burgundy' : pale ? 'pink' : 'magenta';
}
