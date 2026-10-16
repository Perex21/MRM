# Implementation roadmap

## Done

### Mission 001 — foundation
Scaffold, tokens, fonts, shell, hero, first archive, motion foundation.

### Mission 001.1 — quality gate
Reduced-motion menu, nav breakpoint moved to `lg`, audit triaged.

### Mission 002 — complete website
- Home page finished: hero with the seal, archive, approach, capabilities, profile, contact.
- Three case-study pages at `/work/[slug]`, written from the projects' own source and docs.
- Original illustration per project; HTML flow schematic per case study.
- Motion system: reveals (`rise`, `unveil`), headline masks, link and row feedback, pointer
  depth on artwork, one scroll-linked hand-off, the seal as the signature interaction.
- 404 page, metadata, Open Graph image, robots, sitemap.
- Content integrity tests (`npm test`).

Verification in that session:
- `npm run lint`, `npm run typecheck`, `npm test`, `npm run build` pass.
- All five routes measured at 360 / 390 / 768 / 1024 / 1440: no horizontal overflow, no text
  under 13px, no undersized targets.
- Seen by eye: home at ~1230px (every section), home at 390px (hero, open menu), one case
  study header at ~1230px.
- Exercised: seal press, mobile menu (open, Tab in, Escape with focus return, link click),
  scroll-spy, anchor navigation.

### Mission 003 — motion and interaction upgrade
- Hero opening sequence: staggered masked lines with a settling lean, the path walking the road
  and marking the point of divergence, pointer and scroll depth on ridges and seal, magnetic CTA.
- Archive rows: coordinated hover/focus choreography and a distinct story per illustration.
- Approach as sticky steps with a synchronised index and a scroll-filled rail.
- Bow and ripple section hand-offs; masked-word section titles; character-roll labels.
- Verified in the browser at 360, 390, 1024 and 1440 (seen) and 768 (measured); reduced motion
  checked by simulating the preference for scripts — the CSS media query was not toggled.

### Mission 004 — the journey
- The Arrival: a canvas gust that carries the name in, letter by letter, then dissipates.
- One fixed world layer travelled through by scrolling; scenes reordered into a journey.
- Archive discoveries: per-project pointer responses, "How it works" flow plates, artwork
  morphing into the case study. Disciplines as hanging scrolls. The Destination's sun.
- Verified: production gust played (`data-gust` went `playing` → `played`, no console errors);
  gust frames inspected frozen at 1440 and 390; resting hero at 1440, 390 and 360; every scene
  at 1440; scroll down to the Destination and back up returns the world exactly; reduced motion
  by script-level simulation; 20 route × width combinations measured.

### Mission 005 — the opening
- A still beat (400ms), then a stronger gust: pressure wall, pushed mist sheets, bundled wind-line
  streams, curling ink wisps, motes; the world's mist banks shoved downwind.
- The name, brand line and title uncovered by a wind-torn ink mask; letters settle as the front
  reaches each one. The canvas re-times every reveal to the front on the visitor's screen.
- Verified: frames frozen at 380, 600, 900 and 1450ms (1440px) and 640ms (390px); production
  run re-timed all 12 reveal animations with no console errors; resting state with all
  animations removed shows every element fully visible.

### Mission 006 — the landing
- Replaced the hero, canvas gust and seal with one landing scene: a WebGL landscape
  (`Atmosphere`), three seconds with no text or UI, then the name alone through the gust.
  Header, role, statement and actions arrive on scroll; scrolling travels into the clouds,
  which close into the Archive's paper. Archive now follows the landing directly.
- Verified: lint, typecheck, tests, build. Animation state sampled at 1.5s and 2.9s (letters,
  role, header all at opacity 0), 3.6s (letters arriving) and 6s (all in). Scroll timelines
  sampled at 50, 130, 160 and 185vh. Shader frames seen at 1024px at 1.2s and 7s; at 390px the
  canvas was confirmed drawing by pixel sampling (the test browser cannot screenshot a canvas
  under viewport emulation) and the page does not overflow. No console errors.

## Not yet verified — do these first

1. **Reduced motion in a real browser.** The test browser cannot emulate the preference.
   Turn on the OS setting and check: a still landscape, the name, role, actions and header
   visible at once, menu opens instantly.
2. **The landing at full frame rate**, on a real phone and a desktop. The test browser
   throttles animation frames, so frames were inspected held, not watched in motion. Check
   the shader's frame time on a mid-range phone and on integrated graphics.
3. **The landing in Safari and Firefox.** Scroll-driven animations are not in every engine;
   those browsers should show the resting landing with everything visible.
4. **Scroll performance on a mid-range phone** with the world layer and drift active.
5. **Case-study pages on a phone**, especially the flow schematic. Measured, not seen.
6. **768, 1440 and 360 by eye** for the new scenes (measured only).
7. **No-JavaScript rendering.** The server HTML contains no hidden content (checked), but the
   page was not loaded with scripts disabled.
8. **Screen reader pass** and an automated audit (axe, Lighthouse).
9. **Other browsers** — only one Chromium-based browser was used.
10. **HTTP status for unknown case-study slugs.** They render the 404 page with `noindex` but
   answer 200, in the production build too. Decide whether a true 404 status is worth making
   the route block instead of stream.

## Next — needs the owner

- Confirm name, LinkedIn URL and that the ECHOSS project may be shown.
- Add roles, real screenshots, measured results and dates where they exist.
- Decide on email and résumé.
- Choose a domain, set `NEXT_PUBLIC_SITE_URL`, then deploy on instruction.

## Deferred until a feature needs them

GSAP, three.js (the landing uses raw WebGL), page transitions, a CMS, analytics, a contact form with a backend,
light/dark toggle, interface tests.
