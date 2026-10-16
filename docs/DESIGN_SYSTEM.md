# Design system

Tokens live in `src/styles/tokens.css` (Tailwind v4 `@theme`). Components use the generated
utilities; they never hard-code hex values.

## Colour

Core palette (given):

| Token | Hex | Use |
| --- | --- | --- |
| `ink` | `#101110` | Default ground |
| `parchment` | `#E8E0D0` | Primary text on ink; paper ground |
| `cinnabar` | `#9F292D` | The one saturated accent: brand stamp, primary action |
| `jade` | `#52745B` | Reserved for graphics / large elements; not yet used as a fill |
| `silver` | `#A9AAA3` | Secondary text on ink |

Derived tints (added for contrast; ratios calculated, not tool-audited):

| Token | Hex | Why |
| --- | --- | --- |
| `cinnabar-bright` | `#CF5F5C` | Accent text on ink (~4.9:1). Raw cinnabar on ink is ~2.5:1 |
| `cinnabar-hover` | `#B33338` | Hover fill for the primary action |
| `cinnabar-deep` | `#6F1C20` | Pressed state of the primary action |
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
- Corners are square.

## The journey (home page)

The home page is one journey through a single landscape. The `World` layer is fixed to the
viewport and shows through every ink scene; paper scenes cover it like a scroll painting
unrolled in front of the view, so when ink returns the landscape has moved on.

| Scene | Section | Surface | World |
| --- | --- | --- | --- |
| The Arrival | Hero | Ink | Its own landscape (`Atmosphere`); ends in a parchment cloud bank |
| The Archive | Selected work | Its own realm (three.js) | Covered by the realm's stage |
| The Path | Engineering approach | Ink | Mist parts, ranges sink as the land opens, path winds further |
| The Disciplines | Technical capabilities | Ink | Mist gathers among the ranges; a first trace of the sun |
| The Record | Professional profile | Paper | Covered; the quietest scene |
| The Destination | Contact | Ink | Mist settles, ranges rise, the path reaches the sun on the horizon |

Hand-offs between surfaces: paper ripple rising out of the Path; the Archive's paper bowing
into the Disciplines; a paper ridge rising into the Record; the Record's paper bowing away
into the Destination. Every hand-off into a world scene is paper bending away, never an ink
fill, so no hard edge forms against the lit sky.

Travel: the three ranges slide sideways across the whole page at different rates (far 14%,
middle 30%, near 48% of their width) and rise or sink per scene. Scene values are keyed to the
live scroll position of each section and interpolated, so they reverse exactly.

### The Arrival

Nothing but the landscape for three seconds, then the name alone. Everything else waits for the
visitor to scroll.

| Time from load | Event |
| --- | --- |
| 0–2.4s | An ink veil lifts; dense, lit fog lies in banks over five ranges and thins, the near ranges emerging first and the far ones after. Clouds billow, mist drifts along the foot of each range, a sea of cloud moves between the far ranges |
| 2.4–4.6s | A gust crosses from left to right. The wind itself is never drawn: a wall of mist rolls across the ranges and tears into ribbons behind its front, the fog is carried off the valley, the clouds and the cloud sea are shoved downwind, and cloud streams off the lee of the peaks |
| 3s | The name, and only the name, condenses out of the mist as the front passes it: each letter clears from a blur and settles against the wind, 85ms apart, while the driven mist streams across in front of it |
| 4.6s | A hairline road draws down from below the name — the only hint to scroll |

| Scroll | Event |
| --- | --- |
| 0–45vh | The name rises and scales to 72%; role, statement and actions settle beneath it (10–45vh) |
| 30–60vh | The header slides in |
| 0–200vh | The camera lifts and moves forward: near ranges fall away fastest, far ones slowest; clouds close in and brighten |
| 120–170vh | The name and actions rise away into the cloud |
| 150–200vh | The view whitens into parchment, which is the Archive's paper below |

The landscape is a WebGL shader; the choreography is CSS (time-based, then scroll-driven). Under
reduced motion, or without scroll-driven animation support, the landing rests with every element
visible over a still frame.

## The motif — the Divergence

A straight path and a single stroke that leaves it. It changes form as the visitor moves on:

| Where | Form | Component |
| --- | --- | --- |
| Header, footer, favicon, section labels | Cinnabar stamp; bare glyph | `DivergenceMark` |
| Landing | A hairline road drawn down from the name | `Hero` |
| Whole home page | A dashed road; the path walks it, a cinnabar node marks where it diverges, and it winds further into the ranges with every scene until it reaches the sun | `World` |
| Archive → disciplines, record → destination | The paper bows away into the landscape; a dashed road follows the curve | `BowDivider` |
| Approach | A rail fills as the reader advances; the current step branches off it | `StickySteps` |
| Disciplines → record, case studies | The next surface rising as a ridgeline | `RidgeDivider` |
| Path → archive | Three paper ridges close ranks into one | `RippleDivider` |
| Disciplines | Each discipline a hanging scroll that unrolls from its rod | `Capabilities` |
| Archive and case-study headers | One composition per project, each with its own hover story | `ProjectArt` |
| Case studies | Stages on one straight path, parallel parts branching off | `Pipeline` |

Extend the motif before introducing any new symbol.

## Interaction states

| State | Treatment |
| --- | --- |
| Hover | Colour shift over 200ms; underline draws in; action arrow moves 4px. Never the only way to learn something |
| Current | The nav link for the section in view gets `aria-current`, full-strength text and a drawn underline |
| Focus | 2px outline in the surface's focus colour, 4px offset (`:focus-visible`) |
| Active | Action links dip to 97% scale and the cinnabar fill deepens, 120ms |
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
| `ease-settle` | `cubic-bezier(0.16, 1, 0.3, 1)` | Large reveals: headlines, the name, artwork, the archive frame |
| `ease-ink` | `cubic-bezier(0.65, 0, 0.35, 1)` | Drawn strokes |
| press / hover | 120ms / 200ms | UI feedback |
| roll | 420ms + 16ms per character | `RollText` |
| reveal | 650ms | Block reveals |
| headline | 900ms, 70ms between words | Masked headlines and words, artwork unveil |
| draw | 2.4s | Hero path |

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
| Pointer depth | Archive art (≤5°) | Springs; mouse only | Off |
| Landing travel | Name, actions, header, camera, cloud bank | CSS scroll timeline + shader | Still, all visible |
| Bow hand-off | Archive → approach | Arc deepens from 30% to full as the seam rises; dashed line travels along it | Full depth, still |
| Sticky steps | Approach (from `lg`) | Heading and index stay; active step marked in the index, on the rail, and with a raised panel | Rail drawn full; marker still updates |
| Ripple hand-off | Capabilities → profile | Three ridges close from up to 36px apart | Closed |

### Per-project hover stories (`ProjectArt`)

- **Phishing:** the three input strands brighten, the ring around the caught stroke widens, the catch grows.
  With a mouse, the scope (ring and catch) follows the pointer.
- **GST:** the two ledgers close ranks toward the centre rule while the divergent row moves further away.
  With a mouse, a cinnabar audit line runs down the ledgers with the pointer.
- **ECHOSS:** the globe's meridians narrow as if it turns; the echo rings spread; the breakaway stroke thickens.
  With a mouse, the echo drifts against the globe.

Under each row, "How it works" (a real button) unrolls an ink plate with the project's actual
processing stages. Following a project morphs its artwork into the case-study header (React
`ViewTransition`, class `morph`).

One primary motion per element. Scroll is never taken over.

## The realm (the Archive)

| Stage | What the visitor sees |
| --- | --- |
| Veil | The landing's dark mist continues; the realm fades up beneath it |
| See the world | Above a sea of clouds: stone pillars, ranges, a moon; the three places glow through clearings, joined by thin golden routes; markers name them |
| Enter | The camera dives through the clouds — moving wisps — and levels onto a terrace with a stone balustrade and two lanterns |
| Explore | From the terrace all three places are in view on desktop; look around by drag, swipe, arrow keys or a mouse lean |
| Travel | The camera follows the chosen golden route; ginkgo leaves stream with it |
| Arrive | The picture shifts aside, a parchment panel opens, the brush writes the name, the details unfold |

Accents: antique gold (`gold`, `gold-light`, `gold-deep`) for routes, markers, beacons and leaves
only; cinnabar for the Sentinel's beacon and the primary action; jade and silver in the land and
mist. Each place tints the air: the Spire moonlit, the Bridge jade, the Lake dusk-warm.
