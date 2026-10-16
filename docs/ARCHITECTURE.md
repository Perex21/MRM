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
| three.js | 0.186.1 | The Archive's realm only; dynamically imported when its section approaches |

No GSAP, no database, no backend, no analytics. Node 24 / npm 11 were used.

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
    layout/       Container, SiteFooter (no header navigation since 2026-10-16)
    sections/     Hero, SelectedWork, Approach, StickySteps (client), Capabilities, ProfileContact
    projects/     ProjectArt, CaseStudy, Pipeline
    realm/        RealmExplorer, InkName (client), Stop; scene.ts (three.js, loaded on demand)
    ui/           ActionLink, SectionHeading
    graphics/     DivergenceMark, BowDivider, RippleDivider (client); RidgeDivider
    motion/       Reveal, MaskedWords, Magnetic (client); RollText (CSS only)
    world/        World, Atmosphere (client) — the home page's landscape and the landing
  content/        site.ts, sections.ts, projects.ts, profile.ts   ← all public copy and facts
  lib/            cn.ts, motion.ts, realm.ts (the realm's land, places and camera path), brush.ts
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
| `Reveal` | Scroll-triggered reveal |
| `RealmExplorer` | The Archive's realm: loads the scene, scroll-driven descent, looking around, travel, markers, arrival panel |
| `InkName` | A project's name written by a brush on arrival (2D canvas) |
| `Atmosphere` | The landing's WebGL landscape: time- and scroll-driven, runs only while visible |
| `MaskedWords` | Once-only word reveal (shares `useRevealPhase` with `Reveal`) |
| `Magnetic` | Pointer pull on primary actions |
| `StickySteps` | Active-step tracking (`IntersectionObserver`) and the scroll-filled rail |
| `BowDivider`, `RippleDivider` | Scroll-scrubbed section hand-offs |

## Decisions

- **(Superseded 2026-10-16, see "The landing".) Signature interaction is SVG + Motion, not WebGL.** The hero disc is a pressable seal
  that breaks along the Divergence. Three.js was considered and rejected for this build: the
  available test browser throttles animation frames and could not verify a WebGL scene, and
  the brief prefers a reliable SVG alternative over an unverified canvas. The seal server-renders
  intact, so the fallback is the first paint itself.
- **Pointer-through text layer in the hero.** The text container ignores pointer events and each
  text block opts back in at its own width.
- **Stretched link on archive rows.** The title link's `::after` covers the row: one link for
  keyboards, a large target for pointers. `Tilt` listens on the row (`zone`) because that overlay
  covers the artwork.
- **Case-study diagrams are HTML** (`Pipeline`), not images: they reflow, scale with text and are
  read in order by assistive technology.
- **`params` is read inside `<Suspense>`** on the case-study route, as Cache Components requires
  for instant navigation. `generateMetadata` calls `notFound()` for unknown slugs.
- **Navigation hrefs are root-relative hashes** (`/#work`), so the same header works from case
  studies and the 404. Breakpoint for the inline nav is `lg`.
- **"Back to top" uses `#top`.** On the home page that is the landing section; elsewhere no
  element matches and, per the HTML spec, the fragment scrolls to the top.
- **Canonical origin** comes from `NEXT_PUBLIC_SITE_URL`, falling back to `http://localhost:3000`.
  Until it is set, canonical, sitemap and Open Graph URLs point at localhost.
- **Open Graph image** is generated at build with system fonts and the palette inlined, because it
  renders outside the CSS pipeline.
- **No year in the footer**: reading the clock in a server component conflicts with
  `cacheComponents` prerendering.

## The journey (2026-10-14)

- **Section order** follows the journey: hero, work, approach, capabilities, profile, contact
  (work moved first on 2026-10-16 so the landing's cloud bank hands straight into the Archive)
  (`content/sections.ts`, which also names each scene).
- **`World`** is a fixed layer rendered only on the home page. Three procedurally generated
  ranges (`lib/landscape.ts`, deterministic, so server and client agree), two mist banks, the
  path and the sun. Scene values are interpolated over the scroll position of each section's
  top, re-measured by a `ResizeObserver`. Stops live in a motion value, so transforms read the
  latest layout without re-rendering.
- **`WindGust`** (removed 2026-10-16) was the canvas gust over the old hero; see "The landing".
- **`Drift`** (removed 2026-10-16) drew motes that streaked into dashes in the wind. They read
  as generic particles, so the wind is now shown only through the landing's mist.
- **`ViewTransition`** pairs each archive artwork with its case-study header. React 19.3 and
  Next 16 support it without configuration; browsers without the View Transitions API simply
  navigate.
- **Client navigation**: the App Router keeps the home page in a hidden React Activity when a
  case study opens, so the world layer is `display: none` there and its effects are suspended.
- **Rendering choice**: canvas 2D for the wind (ribbons need per-frame gradient strokes; a few
  hundred primitives), SVG for the landscape (crisp at any size, transformable), CSS for the
  name reveal (works without JavaScript). WebGL was not needed.

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

## The landing (2026-10-16)

- **`Atmosphere`** is one fragment shader on raw WebGL (no library): value-noise fbm and ridged
  noise for five mountain ranges in aerial perspective, backlit by a glow behind the name; a sea
  of cloud between the far ranges; a mist band along each range's foot drifting at its own
  speed; domain-warped clouds; near wisps, grain and a vignette. Uniforms: resolution, time (navigation clock, the same origin as the CSS reveal) and
  scroll progress through the landing. Scrolling raises and zooms the camera through the ranges
  at depth-dependent rates until the view is inside a parchment cloud bank.
  WebGL was adopted here because the brief asked for clouds and mountains with real depth and
  movement; the SVG layers could not move mist through the ranges convincingly.
- **The gust (`gustAt`)** is a ragged front crossing left to right from 2.4s to 4.6s. For each
  point it gives how far the front has passed (`k`), how hard the wind blows there now (`w`)
  and how far the air has been carried (`D`). Every mist, cloud and fog layer is displaced by
  `D` (scaled by depth, with a slow height-dependent shear so layers slide past each other) and
  churned by `w`. The opening fog is torn and carried off as the front passes; cloud streams
  off the lee of the far peaks. Wind-stretched textures use `fbmx`, an fbm without octave
  rotation, because rotated octaves turn horizontal streaks into slanted and vertical ones; the
  churn is mostly vertical for the same reason (a strong sideways warp folds mist into
  vertical lines).
- **Front layer**: a second `Atmosphere` (`layer="front"`, compiled with `#define FRONT`) sits
  above the name with a transparent canvas and draws only the driven mist: a wall that rolls
  in at the front and tears into ribbons behind it, so the name comes through the mist rather
  than being masked. It draws nothing before 2.4s, clears itself and stops for good after
  6.2s, and is skipped under reduced motion or when hydration arrives after the gust.
- **Cost controls**: renders at 0.62× (desktop) / 0.5× (under 768px) of CSS pixels × min(DPR, 1.5),
  stepping down to no less than 0.36× if over a third of 90 frames exceed 24ms. The loop runs only
  while the section intersects the viewport and the tab is visible. On context loss the canvas
  hides; without WebGL it never appears and the `World` layer shows through.
- **Reduced motion**: one still frame (fog cleared, gust passed). Every `arrival-*` animation sits
  inside `prefers-reduced-motion: no-preference`, so name, role, statement, actions and header are
  visible at once.
- **Choreography is CSS.** The opening is time-based from page load (ink veil lifts 0.15–1.95s,
  name from 3s). Everything after it uses `animation-timeline: scroll(root)` inside
  `@supports (animation-timeline: scroll())`, so it reverses exactly and needs no JavaScript.
  Browsers without scroll-driven animations get the landing at rest with everything visible.
- **Layout**: `#top` is a 180svh section with a sticky 100svh viewport; the camera only rises
  (`reach` 0.45), then the section scrolls away into the realm. (The header it once hid was
  removed on 2026-10-16.)
- **Development aid**: `?arrival=<seconds>` holds the shader at that moment and preserves the drawing
  buffer for screenshots; while held, setting `window.__arrival` moves the frame without a
  reload. The branch is removed from production builds.

## The Archive as a realm (2026-10-16)

Replaces the brush passage and the three-column showcase. The projects are places in one
world the visitor can explore.

- **Rendering: three.js.** The brief asks for genuine spatial exploration — a camera that
  descends through clouds, looks around and flies between places. A heightfield, lathed stone
  pillars, instanced trees, transparent cloud layers and procedural buildings need a real
  scene graph and depth buffer, which the landing's single full-screen shader does not give.
  three.js is the smallest dependency that does; it is imported dynamically when the section
  comes within 1.5 screens, so the first screen does not pay for it. React Three Fiber was not
  added: one imperative scene inside one effect needs no reconciler.
- **One shading model** (`realm/scene.ts`): ink-wash tone from slope and height, vertical
  texture strokes (cun) on rock faces, moonlit rims, and height fog with low valley mist, tinted
  by the destination the camera is nearest (moon, jade, dusk). Colours come from the tokens via
  `palette-vars`; `ColorManagement` is off and output is linear, so tokens render as written.
- **The land is data** (`lib/realm.ts`): seeded noise for the heightfield, pillars placed with
  clear sightlines to each destination, the three destinations (anchor, arrival view, route
  waypoints, mood), and the camera's descent as keyframes. Nothing is random at runtime, so
  places stay where they are on every visit and device.
- **Destinations** are framed by the three distances of Chinese landscape painting: the Sentinel
  Spire (high distance — a watchtower on the tallest pillar, its beam sweeping the realm) for the
  phishing platform; the Ledger Bridge (deep distance — a stone arch joining two pillars, two
  ledgers reconciled) for the GST platform; the Echo Lake (level distance — a pale orb over its
  own ripples, after the ECHOSS site's hero) for ECHOSS.
- **Track and stage.** A tall track holds a sticky stage: 3 screens drive the descent (veil →
  overview above the clouds → through them → the terrace), then 1.2 screens hold the visitor on
  the terrace. `data-phase` on the stage shows each overlay only in its phases.
- **Travel** is a Catmull–Rom flight along the route's waypoints (2.6–4.6s, eased), with a small
  field-of-view swell; looking around is a yaw/pitch offset from drag, swipe, arrow keys or a
  mouse lean. On arrival `setViewOffset` shifts the picture so the place stays clear of the panel.
- **The guiding wind**: instanced ginkgo leaves (shape drawn in the fragment shader) stream
  along a focused route or around the camera in flight, then fade. A nod to the guiding wind
  that replaces a minimap in Ghost of Tsushima: the world itself points the way.
- **Readable and accessible**: the destination list (always reachable by keyboard), markers
  (pointer convenience, hidden from assistive technology), the live-region announcement and the
  arrival panel are HTML. The panel takes focus on arrival; Escape returns to the terrace.
- **Fallbacks**: without JavaScript or WebGL, or if the context is lost, the section renders
  the atlas — the same three destinations as a plain list. Under reduced motion the realm holds
  still, the descent is skipped and the camera cuts instead of flying; the brush name appears
  whole.
- **Cost**: terrain 320² (190² on small or low-core devices), DPR ≤ 1.5 (≤ 1.25 narrow), frames
  only while the stage intersects the viewport and the tab is visible.
- **Research behind it**: destination-map portfolios that open a panel on arrival, scroll-to-
  spline camera paths (Codrops), height-based ground fog in three.js, Google's guidance on
  accessible 3D markers, and Ghost of Tsushima's guiding wind. No layout or identity was copied.
