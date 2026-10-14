# Architecture

## Stack (installed versions)

| Piece | Version | Notes |
| --- | --- | --- |
| Next.js (App Router, Turbopack) | 16.4.0 | `cacheComponents` and `partialPrefetching` on (scaffold defaults) |
| React / React DOM | 19.3.0 | |
| TypeScript | 5.9.3 | `strict: true`; `allowImportingTsExtensions` for the test file |
| Tailwind CSS | 4.3.3 | Loaded through `@tailwindcss/turbopack`; no PostCSS config |
| ESLint | 9.39.5 | `eslint-config-next` core-web-vitals + typescript |
| Motion | 14.1.0 | `motion/react` — the only animation library |

No GSAP, no three.js, no database, no backend, no analytics. Node 24 / npm 11 were used.

## Routes

| Route | Rendering | Source |
| --- | --- | --- |
| `/` | Static | `src/app/page.tsx` |
| `/work/[slug]` | Static for the three known slugs (`generateStaticParams`) | `src/app/work/[slug]/page.tsx` |
| 404 | Static | `src/app/not-found.tsx` |
| `/robots.txt`, `/sitemap.xml` | Static | `robots.ts`, `sitemap.ts` |
| `/opengraph-image`, `/icon.svg` | Static | `opengraph-image.tsx`, `icon.svg` |

## Structure

```
src/
  app/            layout, page, not-found, robots, sitemap, opengraph-image, work/[slug]
  components/
    layout/       Container, SiteHeader, NavLinks (client), MobileNav (client), SiteFooter
    sections/     Hero, SelectedWork, Approach, StickySteps (client), Capabilities, ProfileContact
    projects/     ProjectEntry, ProjectArt, CaseStudy, Pipeline
    ui/           ActionLink, SectionHeading
    graphics/     DivergenceMark, Seal, HeroLandscape, BowDivider, RippleDivider (client); RidgeDivider
    motion/       Reveal, MaskedWords, Tilt, Magnetic (client); RollText (CSS only)
  content/        site.ts, sections.ts, projects.ts, profile.ts   ← all public copy and facts
  lib/            cn.ts, motion.ts
  styles/         tokens.css                                      ← design tokens
tests/            content.test.mts
docs/
```

## Boundaries

- **Content** (`src/content`) is typed data with no JSX. Components hold no facts.
  Adding a case study means appending one `Project`; the archive, route, sitemap and
  capability links follow. `ProjectSlug` is a union, so a capability or principle cannot
  reference a project that does not exist.
- **Tokens** (`src/styles/tokens.css`) define colour, type, layout and easing. `globals.css`
  holds base styles and the CSS animation utilities.
- **Sections** compose layout + ui + content. `page.tsx` only orders them.
- **Graphics** are inline SVG. Decorative ones are `aria-hidden`; `ProjectArt` is a labelled image.

## Client components (everything else renders on the server)

| Component | Why it needs the client |
| --- | --- |
| `MobileNav` | Toggle state, Escape and outside-press handling, focus return |
| `NavLinks` | Scroll-spy (`IntersectionObserver`) for `aria-current` |
| `Reveal` | Scroll-triggered reveal |
| `Tilt` | Pointer-driven depth on project artwork |
| `Seal` | The signature interaction; pointer lean and scroll depth |
| `HeroLandscape` | Scroll and pointer depth on the ridges and path layer |
| `MaskedWords` | Once-only word reveal (shares `useRevealPhase` with `Reveal`) |
| `Magnetic` | Pointer pull on primary actions |
| `StickySteps` | Active-step tracking (`IntersectionObserver`) and the scroll-filled rail |
| `BowDivider`, `RippleDivider` | Scroll-scrubbed section hand-offs |

## Decisions

- **Signature interaction is SVG + Motion, not WebGL.** The hero disc is a pressable seal
  that breaks along the Divergence. Three.js was considered and rejected for this build: the
  available test browser throttles animation frames and could not verify a WebGL scene, and
  the brief prefers a reliable SVG alternative over an unverified canvas. The seal server-renders
  intact, so the fallback is the first paint itself.
- **Pointer-through text layer in the hero.** The text container ignores pointer events and each
  text block opts back in at its own width, so the seal stays pressable around the title.
- **Stretched link on archive rows.** The title link's `::after` covers the row: one link for
  keyboards, a large target for pointers. `Tilt` listens on the row (`zone`) because that overlay
  covers the artwork.
- **Case-study diagrams are HTML** (`Pipeline`), not images: they reflow, scale with text and are
  read in order by assistive technology.
- **`params` is read inside `<Suspense>`** on the case-study route, as Cache Components requires
  for instant navigation. `generateMetadata` calls `notFound()` for unknown slugs.
- **Navigation hrefs are root-relative hashes** (`/#work`), so the same header works from case
  studies and the 404. Breakpoint for the inline nav is `lg`.
- **`#top` has no element.** Per the HTML spec a `#top` fragment with no matching id scrolls to
  the top, so "Back to top" works on every page.
- **Canonical origin** comes from `NEXT_PUBLIC_SITE_URL`, falling back to `http://localhost:3000`.
  Until it is set, canonical, sitemap and Open Graph URLs point at localhost.
- **Open Graph image** is generated at build with system fonts and the palette inlined, because it
  renders outside the CSS pipeline.
- **No year in the footer**: reading the clock in a server component conflicts with
  `cacheComponents` prerendering.
- **Hero disc is positioned in CSS**, not inside the landscape SVG, so cropping can never put
  cinnabar behind body text. The landscape's road and path lines render from `md` up.

## Motion upgrade (2026-10-14)

Interaction patterns were taken from public component libraries as **references only**; every
implementation here is original code on the existing Motion + CSS stack. No third-party
component code was copied, so no third-party licence terms apply to the source. Patterns used:

| Reference | Adapted as |
| --- | --- |
| Tween UI — Card Hover Expand; Toggle Supply — Expand Image on Hover | Archive row choreography: art frame opens from an inset while the drawing settles from a slight zoom |
| Tween UI — Process Sticky Steps | `StickySteps` for the approach |
| Tween UI — Text Roll Button | `RollText` |
| DesignPass — Bow | `BowDivider` |
| DesignPass — AntLine | The dashed road on the bow and the approach rail, moved by scroll rather than looping |
| DesignPass — Ripple | `RippleDivider`, as ink ridges |
| DesignPass — Magnet | `Magnetic`, translation only (no tilt or glare) |

Considered and not used: WarpText (WebGL headline distortion competes with legibility), FanDeck
and ScrollCurl (3D card stacks read as a product showcase, not an editorial archive), Fluid Orb
(glowing gradient blob is off-brand), Cursor ImageTrail and custom cursors (no real images to
trail; rule against custom cursors), Tab Wipe and Shutter Slider (no image sets to switch
between), horizontal scroll and page transitions (fight native scrolling). GSAP and three.js
remain unnecessary: everything above runs on Motion and CSS.

Implementation notes:
- The hero road and path sit in their own layer to the right of the text column, sized near
  1:1 with its box. Chrome applies `pathLength`-normalised dashes in screen space for
  `vector-effect: non-scaling-stroke`, which broke the draw-on at other scales, so the drawn
  path uses a normal stroke.
- Every scroll or pointer effect reads `useReducedMotion` and collapses to its resting value;
  listeners are added in effects and removed on cleanup.

## Tests

`npm test` runs `tests/content.test.mts` with Node's built-in runner (Node executes the
TypeScript content modules directly). It checks unique slugs, complete case studies, https
links, unique section ids and the absence of filler text. There are no interface tests.

## Dependency advisories

`npm audit` (run 2026-10-13) reports 5 high-severity entries — one advisory seen through
its dependency chain:

- **Advisory:** GHSA-vfj7-8cjw-p6xm — `braces` ≤ 3.0.3, stack-exhaustion denial of service
  on deeply nested brace patterns (CVSS 7.5).
- **Path:** `eslint-config-next@16.4.0` → `@next/eslint-plugin-next@16.4.0` →
  `fast-glob@3.3.1` → `micromatch@4.0.8` → `braces@3.0.3`.
- **No compatible fix exists.** 3.0.3 is the latest published `braces`. The only fix npm
  offers is `--force`, which downgrades `eslint-config-next` to 14.2.35 — two majors behind
  the installed Next.js 16. Not applied.
- **Exposure:** development tooling only. `npm audit --omit=dev` reports 0 vulnerabilities.
- **Action:** accepted. Re-run when `braces` or `eslint-config-next` publishes a new version.

## Known uncertainties

- The project lives in a OneDrive-synced folder, which can slow or lock `node_modules` and `.next`.
- Git: branch `main`, remote `origin` → `Perex21/MRM`, two commits by the owner. The work
  described here is uncommitted in the working tree.
- Unknown case-study slugs (`/work/anything-else`) render the 404 page with a `noindex` tag
  but return HTTP 200, in development and in the production build. Other unknown URLs return
  a true 404. Cause: the route streams its content, so the status is sent before the slug is
  checked. Harmless for visitors and for indexing; not yet fixed.
- No deployment target is chosen. Nothing is deployed.
