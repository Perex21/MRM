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

A straight line and a single stroke that leaves it. It appears at three scales:

1. **Seal** (`DivergenceMark`): cinnabar stamp in header, footer, favicon; bare glyph on
   section labels.
2. **Landscape** (`HeroLandscape`): a dashed straight road and a drawn path that departs
   across the ridges. The nearest ridge is parchment, so the work section's paper rises
   into the hero — this is the hero → work transition.
3. **Plate** (`ProjectPlate`): one variation per project, standing in for screenshots.

Extend the motif before introducing any new symbol.

## Interaction states

| State | Treatment |
| --- | --- |
| Hover | Colour shift over 200ms; action arrow moves 4px. Never the only way to learn something |
| Focus | 2px outline in the surface's focus colour, 4px offset (`:focus-visible`) |
| Active | 1px downward press, 120ms |
| Disabled | Not used yet. Unavailable actions are omitted, not greyed out |
| Reduced motion | No animation, no hover/press movement; everything visible immediately. Colour changes remain |

Interactive targets are at least 48px tall.

## Project previews and technical details

- Entry = numeral, domain label, title, summary, facts (`dl`), plate. Rows, not cards.
- Facts use a `label` term with the value beside it; stack items are mono chips with a hairline.
- Until real screenshots exist the plate is abstract and captioned as such.

## Motion

See `CLAUDE.md` → Motion. Constants: `src/lib/motion.ts` and the `--duration-*` / `--ease-*`
tokens. Durations: press 120ms, hover 200ms, reveal 700ms, headline 900ms, path draw 2.4s.
