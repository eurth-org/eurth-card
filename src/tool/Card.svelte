<script lang="ts">
  /*
   * The tool: load a nation's profile, get its card. One Svelte component, woken on the start
   * page. The engine in src/card does the thinking; this shows it and lets the visitor take it
   * away.
   *   - Nothing is stored. A card lives in its link (?c=…), its picture or the profile file.
   *   - A profile and a link are someone else's input: both go through the engine's reader.
   *   - The profile's flag and arms only ever appear through an image, never as markup.
   *   - Card writes one section of the profile, "identity", and only what was typed here.
   *   - Colours, tools and the example arrive as props: browser code never imports
   *     eurth.config.mjs or the list of tools.
   */
  import { faCheck, faCircleCheck, faCirclePlus, faDownload, faRotateLeft } from '@fortawesome/free-solid-svg-icons';
  import { createProfile, getSection, setSection, type EurthProfile } from '@eurth/profile';
  import ProfileButtons from '@eurth/profile/ProfileButtons.svelte';
  import { calm, download, fileSlug, markdownText, playTones, toast } from '@eurth/style';
  import Icon from '@eurth/style/components/Icon.svelte';
  import ShareButtons from '@eurth/style/components/ShareButtons.svelte';
  import { onMount } from 'svelte';
  import { describe, summary, title } from '../card/describe.ts';
  import { hasEdits, identityWith, withEdits, type Edits } from '../card/edit.ts';
  import { facts } from '../card/facts.ts';
  import { DEFAULT_FORMAT, DEFAULT_LAYOUT, DEFAULT_THEME, FORMATS, LAYOUTS, THEMES, type FormatId, type LayoutId, type ThemeId } from '../card/formats.ts';
  import { layout } from '../card/layout.ts';
  import { LINK_PARAM, cardLink, readLink, type CardLink } from '../card/link.ts';
  import { SECTIONS, SECTION_LABEL, complete, displayName, type CardData, type SectionName } from '../card/model.ts';
  import { readCard } from '../card/read.ts';
  import { dataAddress, render, type Theme } from '../card/render.ts';
  import type { Measure } from '../card/text.ts';
  import { browserMeasure } from './measure.ts';
  import { cardPicture, extension, type PictureType } from './picture.ts';

  let {
    siteName,
    siteUrl,
    themes,
    tools,
    sample,
  }: {
    siteName: string;
    siteUrl: string;
    /** The card's colours and fonts, from the suite's tokens. */
    themes: Record<ThemeId, Theme>;
    /** For each section, the tool that fills it, if it has launched. */
    tools: Partial<Record<SectionName, { name: string; href: string }>>;
    /** The card on the table before the visitor brings their own. */
    sample: CardData;
  } = $props();

  // Where the card on the table came from.
  let origin = $state<'sample' | 'link' | 'profile'>('sample');
  let profile = $state.raw<EurthProfile | null>(null);
  let source = $state.raw<CardData>(sample);
  let edits = $state<Edits>({});
  let format = $state<FormatId>(DEFAULT_FORMAT);
  let layoutId = $state<LayoutId>(DEFAULT_LAYOUT);
  let theme = $state<ThemeId>(DEFAULT_THEME);

  let ready = $state(false);
  let measure = $state.raw<Measure | undefined>(undefined);
  // Each new card is dealt: the key remakes the element, the flag says whether it may move.
  let dealt = $state(0);
  let moving = $state(false);

  const data = $derived(withEdits(source, edits));
  const size = $derived(FORMATS.find((entry) => entry.id === format) ?? FORMATS[0]);
  const placed = $derived(layout(data, { format, layout: layoutId, measure }));
  const svg = $derived(render(placed, data, themes[theme]));
  const picture = $derived(dataAddress(svg));
  const description = $derived(describe(data));
  const name = $derived(displayName(data));
  const gold = $derived(complete(data));
  const filled = $derived(SECTIONS.filter((section) => data.filled.includes(section)).length);
  // Nothing of the visitor's is on the table yet: the address stays plain.
  const pristine = $derived(origin === 'sample' && !hasEdits(edits) && format === DEFAULT_FORMAT && layoutId === DEFAULT_LAYOUT && theme === DEFAULT_THEME);

  // The link is made off to one side (compressing takes a moment) and the address bar follows.
  let link = $state.raw<CardLink>({ url: `${siteUrl}/`, length: siteUrl.length + 1, verdict: 'fine' });
  let turn = 0;
  $effect(() => {
    const state = { data, format, layout: layoutId, theme };
    const here = ready ? `${location.origin}${location.pathname}` : `${siteUrl}/`;
    const plain = pristine;
    const mine = ++turn;
    cardLink(state, here)
      .then((made) => {
        if (mine !== turn) return;
        link = made;
        if (!ready) return;
        const address = plain ? here : made.verdict === 'too-long' ? (made.lighter?.url ?? here) : made.url;
        history.replaceState(history.state, '', address);
      })
      .catch(() => {
        // A browser too old to compress: the picture and the profile file still work.
      });
  });
  const shareUrl = $derived(link.verdict === 'too-long' ? (link.lighter?.url ?? `${siteUrl}/`) : link.url);
  const leftOut = $derived(link.lighter?.without.map((which) => (which === 'arms' ? 'the coat of arms' : 'the flag')).join(' and '));

  onMount(async () => {
    measure = browserMeasure(themes.night.sans, themes.night.mono);
    if (new URLSearchParams(location.search).has(LINK_PARAM)) {
      // A link is someone else's input: readLink never throws, and cleans every value.
      const arrived = await readLink(location.search);
      if (arrived) {
        source = arrived.data;
        format = arrived.format;
        layoutId = arrived.layout;
        theme = arrived.theme;
        origin = 'link';
        deal(arrived.data);
      } else {
        toast("That link doesn't hold a card that can be read. Here is an example instead.");
      }
    }
    ready = true;
  });

  // The signature touch: the card is dealt onto the table and flips face up.
  function deal(card: CardData) {
    dealt++;
    moving = !calm();
    if (moving) playTones([[196, 0, 0.03], [294, 0.3, 0.035]], { length: 0.09 });
    // The easter egg: a nation with every section filled.
    toast(complete(card) ? 'A complete nation. The wurld salutes you.' : `${displayName(card)} is on the table.`);
  }

  function loaded(next: EurthProfile) {
    profile = next;
    source = readCard(next);
    edits = {};
    origin = 'profile';
    deal(source);
  }

  function startAgain() {
    profile = null;
    source = sample;
    edits = {};
    format = DEFAULT_FORMAT;
    layoutId = DEFAULT_LAYOUT;
    theme = DEFAULT_THEME;
    origin = 'sample';
    toast('A clear table.');
  }

  // What "Save profile" writes: the profile as it was loaded, with "identity" changed only by
  // what was typed here. Every other section is left exactly as it was.
  const saved = $derived.by(() => {
    if (!hasEdits(edits)) return profile;
    const base = profile ?? (data.name ? createProfile(data.name) : null);
    if (!base) return null;
    const identity = identityWith(getSection(base, 'identity') as Record<string, unknown> | undefined, edits);
    return setSection(base, 'identity', identity as never);
  });

  async function save(type: PictureType) {
    try {
      const blob = await cardPicture(placed, data, themes[theme], type);
      download(blob, `${fileSlug(name, 'nation')}-card-${format}.${extension(blob)}`);
      if (type === 'image/webp' && blob.type !== 'image/webp') toast("This browser can't write WebP, so that one is a PNG.");
    } catch {
      toast("The picture couldn't be made here. Another browser may manage it; the link and the profile file still work.");
    }
  }

  const forumBody = $derived(
    [
      `**${markdownText(name)}**${data.motto ? `\n*${markdownText(data.motto)}*` : ''}`,
      facts(data)
        .slice(0, 6)
        .map((fact) => `- ${fact.label}: ${markdownText(fact.value)}`)
        .join('\n'),
      shareUrl,
    ]
      .filter(Boolean)
      .join('\n\n'),
  );
</script>

<div class="card-tool">
  <form class="eu-card controls" onsubmit={(event) => event.preventDefault()}>
    <div class="eu-row">
      <ProfileButtons profile={saved} onload={loaded} onerror={(errors) => toast(errors[0]?.message ?? "That file isn't a nation profile. Pick one that ends in .eurth.json.")} />
      <button type="button" class="eu-btn" data-click="spin" onclick={startAgain}><Icon icon={faRotateLeft} /> Start again</button>
    </div>
    <p class="eu-help">
      {#if origin === 'sample'}
        This is {sample.name}, an example. Load your nation's profile, or drop the file anywhere on this page, to see your own card.
      {:else if origin === 'link'}
        This card came from its link. The link holds the card, not the whole profile, so load the profile file to change more than the three fields below.
      {:else}
        Your profile is loaded. Nothing is kept in this browser: the card lives in its link, its picture and your profile file.
      {/if}
    </p>

    <section aria-labelledby="sections-title" class="eu-stack sections-block">
      <h2 id="sections-title" class="eu-label">In the profile: <span class="eu-data">{filled} of {SECTIONS.length}</span> sections{gold ? ', the full set' : ''}</h2>
      <ul class="sections">
        {#each SECTIONS as section (section)}
          {@const there = data.filled.includes(section)}
          {@const tool = tools[section]}
          <li>
            <span class="mark" class:there><Icon icon={there ? faCircleCheck : faCirclePlus} /></span>
            <span class="what">{SECTION_LABEL[section]}</span>
            {#if there}
              <span class="eu-muted">on the card</span>
            {:else if section === 'identity'}
              <span class="eu-muted">type it in below</span>
            {:else if tool}
              <a href={tool.href} data-same-tab>Make it in {tool.name}</a>
            {:else}
              <span class="eu-muted">not yet</span>
            {/if}
          </li>
        {/each}
      </ul>
    </section>

    <label class="eu-field">
      <span class="eu-label">Country</span>
      <input class="eu-input" value={edits.name ?? source.name} oninput={(event) => (edits.name = event.currentTarget.value)} maxlength="80" autocomplete="off" placeholder="Your nation's name" />
    </label>
    <div class="pair">
      <label class="eu-field">
        <span class="eu-label">Capital</span>
        <input class="eu-input" value={edits.capital ?? source.capital ?? ''} oninput={(event) => (edits.capital = event.currentTarget.value)} maxlength="80" autocomplete="off" />
      </label>
      <label class="eu-field">
        <span class="eu-label">Motto</span>
        <input class="eu-input" value={edits.motto ?? source.motto ?? ''} oninput={(event) => (edits.motto = event.currentTarget.value)} maxlength="200" autocomplete="off" />
      </label>
    </div>

    <label class="eu-field">
      <span class="eu-label">Format</span>
      <select class="eu-select" bind:value={format}>
        {#each FORMATS as entry (entry.id)}
          <option value={entry.id}>{entry.name} · {entry.width} × {entry.height}</option>
        {/each}
      </select>
    </label>

    <fieldset class="options">
      <legend class="eu-label">Layout</legend>
      <div class="eu-row">
        {#each LAYOUTS as entry (entry.id)}
          <label class="eu-pill" data-tip={entry.about}>
            <input type="radio" name="layout" value={entry.id} bind:group={layoutId} />
            <span class="eu-check"><Icon icon={faCheck} /></span>
            {entry.name}
          </label>
        {/each}
      </div>
    </fieldset>

    <fieldset class="options">
      <legend class="eu-label">Card colours</legend>
      <div class="eu-row">
        {#each THEMES as entry (entry.id)}
          <label class="eu-pill">
            <input type="radio" name="theme" value={entry.id} bind:group={theme} />
            <span class="eu-check"><Icon icon={faCheck} /></span>
            {entry.name}
          </label>
        {/each}
      </div>
    </fieldset>
  </form>

  <section class="result" aria-labelledby="result-title">
    <div class="eu-row heading">
      <h2 id="result-title" class="eu-kicker">{name}: {size.name.toLowerCase()}</h2>
      <span class="eu-data eu-muted">{size.width} × {size.height}</span>
    </div>

    <div class="table">
      {#key dealt}
        <div class="dealt" class:deal={moving && dealt > 0} style:--ratio={size.width / size.height}>
          <img class="face" src={picture} alt={description} width={size.width} height={size.height} />
          <div class="back" aria-hidden="true"></div>
        </div>
      {/key}
    </div>

    <div class="eu-row">
      <button type="button" class="eu-btn eu-btn--primary" data-click="bounce" onclick={() => save('image/png')}><Icon icon={faDownload} /> PNG</button>
      <button type="button" class="eu-btn" data-click="bounce" onclick={() => save('image/webp')}><Icon icon={faDownload} /> WebP</button>
    </div>

    <ShareButtons
      url={shareUrl}
      title={title(data)}
      text={`${summary(data)} Made with ${siteName}.`}
      {forumBody}
      description={() => description}
      picture={() => cardPicture(placed, data, themes[theme])}
      heading={`Share ${name}`}
      said={{ link: 'Link copied: the whole card is in it.', picture: 'Picture copied, at its full size.' }}
    />

    {#if link.verdict === 'too-long'}
      <p class="eu-help note">
        This card is too big for a link ({link.length.toLocaleString('en-GB')} characters; the most that travels well is 8,000).
        {#if link.lighter}
          Copy link gives a link without {leftOut}; everything else is in it.
        {:else}
          Copy link gives the plain address.
        {/if}
        The picture and the profile file carry the whole card.
      </p>
    {:else if link.verdict === 'long'}
      <p class="eu-help note">This card's link is long ({link.length.toLocaleString('en-GB')} characters). It works, but some apps cut long links short; the picture always arrives whole.</p>
    {:else}
      <p class="eu-help note">The link holds the whole card. The profile file carries your nation from one Eurth tool to the next.</p>
    {/if}

    <details class="words">
      <summary>The card in words</summary>
      <p class="eu-muted description">{description}</p>
    </details>
  </section>
</div>

<style>
  .card-tool {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(0, 1.5fr);
    gap: var(--space-6);
    align-items: start;
  }

  .controls {
    gap: var(--space-4);
  }

  .sections-block {
    gap: var(--space-2);
  }

  .sections {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(15rem, 1fr));
    gap: 0 var(--space-4);
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .sections li {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    min-height: var(--size-target);
    border-top: 1px solid var(--line);
  }

  .sections .what {
    font-weight: 700;
    margin-inline-end: auto;
  }

  .sections a {
    display: inline-flex;
    align-items: center;
    min-height: var(--size-target);
  }

  /* Filled or not is told by the icon's shape and by the words beside it, not by colour. */
  .mark {
    display: inline-flex;
    color: var(--ink-muted);
  }

  .mark.there {
    color: var(--ink);
  }

  .pair {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(12rem, 1fr));
    gap: var(--space-4);
  }

  .options {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
    margin: 0;
    padding: 0;
    border: 0;
  }

  .result {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
    min-width: 0;
  }

  .heading {
    justify-content: space-between;
    align-items: baseline;
  }

  .heading h2 {
    margin: 0;
  }

  /* The table the card is dealt onto. */
  .table {
    display: flex;
    justify-content: center;
    padding: var(--space-4);
    border-radius: var(--radius-md);
    background: var(--surface-raised);
    perspective: 1600px;
    overflow: hidden;
  }

  /* As wide as the column, but never taller than most of the window: a story is a tall card. */
  .dealt {
    position: relative;
    width: min(100%, calc(min(72vh, 46rem) * var(--ratio)));
    aspect-ratio: var(--ratio);
    transform-style: preserve-3d;
  }

  .face,
  .back {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    backface-visibility: hidden;
  }

  .face {
    display: block;
    outline: 1px solid var(--line);
  }

  .back {
    transform: rotateY(180deg);
    background: var(--surface);
    border: 1px solid var(--line-strong);
    box-sizing: border-box;
  }

  .deal {
    animation: deal 460ms cubic-bezier(0.2, 0.7, 0.2, 1) both;
  }

  @keyframes deal {
    0% {
      transform: translate(-24%, -34%) rotate(-12deg) rotateY(180deg);
    }
    55% {
      transform: translate(0, 0) rotate(0deg) rotateY(180deg);
    }
    100% {
      transform: translate(0, 0) rotate(0deg) rotateY(0deg);
    }
  }

  .note {
    margin: 0;
  }

  .words summary {
    display: inline-flex;
    align-items: center;
    min-height: var(--size-target);
    cursor: pointer;
    font-weight: 700;
  }

  .description {
    margin: 0;
    white-space: pre-line;
  }

  @media (max-width: 860px) {
    .card-tool {
      grid-template-columns: minmax(0, 1fr);
    }

    /* On a phone the card comes first: it is what the visitor came for. */
    .result {
      order: -1;
    }
  }
</style>
