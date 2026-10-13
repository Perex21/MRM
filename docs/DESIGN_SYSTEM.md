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
| Hero | A dashed straight road and a drawn path that departs across the ridges | `HeroLandscape` |
| Between surfaces | The next surface rising as a ridgeline | `RidgeDivider` |
| Archive and case-study headers | One composition per project: merging signals, facing ledgers, an echoing globe | `ProjectArt` |
| Case studies | Stages on one straight path, parallel parts branching off | `Pipeline` |
| Approach | Each principle steps further from the left edge | `Approach` |

Extend the motif before introducing any new symbol.

## Interaction states

| State | Treatment |
| --- | --- |
| Hover | Colour shift over 200ms; underline draws in; action arrow moves 4px. Never the only way to learn something |
| Current | The nav link for the section in view gets `aria-current`, full-strength text and a drawn underline |
| Focus | 2px outline in the surface's focus colour, 4px offset (`:focus-visible`) |
| Active | 1px downward press, 120ms |
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
`--ease-*` tokens.

| Token | Value | Use |
| --- | --- | --- |
| `ease-entrance` | `cubic-bezier(0.22, 1, 0.36, 1)` | Standard entrances, UI feedback |
| `ease-settle` | `cubic-bezier(0.16, 1, 0.3, 1)` | Large reveals: headlines, artwork, the seal |
| `ease-ink` | `cubic-bezier(0.65, 0, 0.35, 1)` | Drawn strokes |
| press / hover | 120ms / 200ms | UI feedback |
| reveal | 650ms | Block reveals |
| headline | 900ms | Masked headlines, artwork unveil |
| draw | 2.4s | Hero path |

| Effect | Where | How |
| --- | --- | --- |
| Block reveal (`rise`) | Rows and section content | `Reveal`: fade + 16px settle, once |
| Artwork reveal (`unveil`) | Archive illustrations | `Reveal variant="unveil"`: clip from the top, once |
| Headline mask | Hero title, case-study titles | CSS `mask-line`, no JavaScript |
| Interaction feedback | Links, actions, rows | `link-draw` underline, colour shift, 4px arrow nudge, 1px press |
| Pointer depth | Archive illustrations | `Tilt`: up to 5° toward the cursor, mouse only |
| Section hand-off | Hero → work | Far and middle ridges lag the paper ridge by up to 64px over the first 900px of scroll |
| Signature | Hero seal | `Seal`: leans up to 10° toward the pointer; press to break and restore |

One primary motion per element. Scroll is never taken over; nothing is pinned.
