# Design system

Tokens live in `src/styles/tokens.css` (Tailwind v4 `@theme`). Components use the generated
utilities; they never hard-code hex values.

## Colour

Core palette (given):

| Token | Hex | Use |
| --- | --- | --- |
| `ink` | `#101110` | Default ground |
| `parchment` | `#E8E0D0` | Primary text on ink; paper ground |
| `cinnabar` | `#9F292D` | The one saturated accent: seal, disc, primary action |
| `jade` | `#52745B` | Reserved for graphics / large elements; not yet used as a fill |
| `silver` | `#A9AAA3` | Secondary text on ink |

Derived tints (added for contrast; ratios calculated, not tool-audited):

| Token | Hex | Why |
| --- | --- | --- |
| `cinnabar-bright` | `#CF5F5C` | Accent text on ink (~4.9:1). Raw cinnabar on ink is ~2.5:1 |
| `cinnabar-hover` | `#B33338` | Hover fill for the primary action |
| `cinnabar-deep` | `#6F1C20` | Carved lines on the seal |
| `jade-bright` | `#8FB199` | Focus ring on ink (~8:1). Raw jade on ink is ~3.6:1 |
| `silver-dim` | `#7D7E78` | Tertiary text on ink (~4.6:1) |
| `ink-soft`, `ink-faint` | `#4B4D47`, `#5D5F58` | Secondary / tertiary text on parchment |
| `ink-raised`, `ink-mist` | `#191B19`, `#232623` | Ridge layers and plate ground |

### Surfaces

Two materials. A section opts in with a class and everything inside reads semantic tokens.

| Class | Ground | `fg` | `fg-muted` | `accent` | Focus ring |
| --- | --- | --- | --- | --- | --- |
| `.surface-ink` | ink | parchment | silver | cinnabar-bright | jade-bright |
| `.surface-paper` | parchment | ink | ink-soft | cinnabar | cinnabar |

Utilities: `text-fg`, `text-fg-muted`, `text-fg-faint`, `border-line`, `text-accent`.

## Typography

Loaded with `next/font/google` (self-hosted at build, no runtime request to Google).

| Role | Family | Utility | Notes |
| --- | --- | --- | --- |
| Display / headings | Cormorant Garamond 500, 600 | `font-display` | High-contrast serif with a brush-cut feel; two weights only |
| Body | Geist | `font-sans` | Neutral, legible at small sizes |
| Technical | Geist Mono | `font-mono`, `label` | Labels, chapter numbers, stack chips |

Scale (fluid): `text-display` 40–144px · `text-title` 36–68px · `text-heading` 26–40px ·
`text-lead` 18–22px · body 16px · `text-label` 13px (the minimum size anywhere).

`label` = mono, uppercase, 0.14em tracking.

## Layout

- Page width `max-w-page` (82rem); reading width `max-w-prose` (36rem).
- Gutter `px-gutter` = `clamp(1.25rem, 4vw, 3rem)`.
- Section rhythm `py-section` = `clamp(5rem, 11vw, 9.5rem)`.
- Header height `--spacing-header` (4.5rem); `scroll-padding-top` accounts for it.
- 12-column grid at `md`/`lg`; single column below. Spacing otherwise uses Tailwind's 4px scale.
- Breakpoints: Tailwind defaults. Disclosure menu below `lg` (1024px); inline nav from `lg`.

## Borders and structure

- 1px hairlines in `border-line` separate rows. No shadows, no rounded cards.
- Corners are square, except the seal (2px) and the disc.

## The motif — the Divergence

A straight path and a single stroke that leaves it. It changes form as the visitor moves on:

| Where | Form | Component |
| --- | --- | --- |
| Header, footer, favicon, section labels | Cinnabar stamp; bare glyph | `DivergenceMark` |
| Hero | The disc as a seal carved with the motif; pressing it breaks the shard away | `Seal` |
| Hero | A dashed road; the path walks it, a cinnabar node marks where it diverges, then it leaves for the seal | `HeroLandscape` |
| Archive → approach | The paper bows down into the ink; a dashed road follows the curve | `BowDivider` |
| Approach | A rail fills as the reader advances; the current step branches off it | `StickySteps` |
| Approach → capabilities, case studies | The next surface rising as a ridgeline | `RidgeDivider` |
| Capabilities → profile | Three ink ridges close ranks into one | `RippleDivider` |
| Archive and case-study headers | One composition per project, each with its own hover story | `ProjectArt` |
| Case studies | Stages on one straight path, parallel parts branching off | `Pipeline` |

Extend the motif before introducing any new symbol.

## Interaction states

| State | Treatment |
| --- | --- |
| Hover | Colour shift over 200ms; underline draws in; action arrow moves 4px. Never the only way to learn something |
| Current | The nav link for the section in view gets `aria-current`, full-strength text and a drawn underline |
| Focus | 2px outline in the surface's focus colour, 4px offset (`:focus-visible`) |
| Active | Action links dip to 97% scale and the cinnabar fill deepens, 120ms; the seal dips to 96% |
| Disabled | Not used yet. Unavailable actions are omitted, not greyed out |
| Reduced motion | No animation, no hover/press movement; everything visible immediately. Colour changes remain |

Interactive targets are at least 48px tall.

## Project artwork and technical details

- Archive row = numeral, category, title, summary, highlights, status, illustration. Rows, not cards.
- Illustrations are original SVG on ink, captioned "Illustration". They are never presented as
  screenshots. When real screenshots exist, they replace the illustration in the case-study header.
- Stack items are mono chips with a hairline. Facts use a `label` term beside the value.
- Case-study body sits on paper; the flow schematic is an ink panel inside it.

## Motion

Rules are in `CLAUDE.md` → Motion. Constants: `src/lib/motion.ts` and the `--duration-*` /
`--ease-*` tokens. Hover choreography lives in `globals.css` under
`@media (prefers-reduced-motion: no-preference)`.

| Token | Value | Use |
| --- | --- | --- |
| `ease-entrance` | `cubic-bezier(0.22, 1, 0.36, 1)` | Standard entrances, UI feedback, character roll |
| `ease-settle` | `cubic-bezier(0.16, 1, 0.3, 1)` | Large reveals: headlines, artwork, the seal, the archive frame |
| `ease-ink` | `cubic-bezier(0.65, 0, 0.35, 1)` | Drawn strokes |
| press / hover | 120ms / 200ms | UI feedback |
| roll | 420ms + 16ms per character | `RollText` |
| reveal | 650ms | Block reveals |
| headline | 900ms, 70ms between words | Masked headlines and words, artwork unveil |
| draw | 2.4s | Hero path |

### Hero opening sequence (CSS, plays without JavaScript)

| Time | Element |
| --- | --- |
| 0ms | "Portfolio of …" label settles |
| 0 / 140 / 280ms | THE / UNORTHODOX / PATH rise from their masks, each settling from a 2.5° lean |
| 320ms | Seal settles |
| 700ms → 3.1s | Path draws: up the road, then away toward the seal |
| ~1.75s | Divergence node lands; one ring spreads and fades |
| 820ms | Role, statement and actions settle |

### Effects

| Effect | Where | How | Reduced motion |
| --- | --- | --- | --- |
| Block reveal (`rise`) | Rows and section content | `Reveal`: fade + 16px settle, once | Static |
| Artwork reveal (`unveil`) | Archive illustrations | `Reveal variant="unveil"`: clip from the top, once | Static |
| Masked lines | Hero title, case-study titles | CSS `mask-line` | Static |
| Masked words | Home section titles, contact headline | `MaskedWords`: words rise in turn, once | Static |
| Character roll | Nav links, action links, archive numerals and "Read the case study" | `RollText` (CSS) | Off |
| Magnetic pull | "Explore the work", "Message me on LinkedIn" | `Magnetic`: up to 8px toward the pointer, mouse only | Off |
| Archive row | Each project row on hover or focus | Rule draws across; numeral rolls; title underlines; stack chips light in turn; art frame opens from a 5–6% inset while the drawing settles from 1.08×; per-project story | Colour only |
| Pointer depth | Archive art (≤5°), seal (≤10°), hero ridges (≤22px sideways) | Springs; mouse only | Off |
| Scroll depth | Hero ridges lag up to 64px; seal sinks up to 140px | Motion `useScroll` | Off |
| Bow hand-off | Archive → approach | Arc deepens from 30% to full as the seam rises; dashed line travels along it | Full depth, still |
| Sticky steps | Approach (from `lg`) | Heading and index stay; active step marked in the index, on the rail, and with a raised panel | Rail drawn full; marker still updates |
| Ripple hand-off | Capabilities → profile | Three ridges close from up to 36px apart | Closed |
| Seal | Hero | Press to break and restore | Instant change |

### Per-project hover stories (`ProjectArt`)

- **Phishing:** the three input strands brighten, the ring around the caught stroke widens, the catch grows.
- **GST:** the two ledgers close ranks toward the centre rule while the divergent row moves further away.
- **ECHOSS:** the globe's meridians narrow as if it turns; the echo rings spread; the breakaway stroke thickens.

One primary motion per element. Scroll is never taken over.
