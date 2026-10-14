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

## Not yet verified — do these first

1. **Reduced motion in a real browser.** The test browser cannot emulate the preference.
   Turn on the OS setting and check: no gust, the name visible at once, a still landscape,
   menu opens instantly, seal changes without animation.
2. **The live gust at full frame rate**, on a real phone and a desktop. The test browser
   throttles animation frames, so the gust was inspected frozen, not watched in motion.
3. **Scroll performance on a mid-range phone** with the world layer and drift active.
4. **Case-study pages on a phone**, especially the flow schematic. Measured, not seen.
5. **768 and 1024 by eye** for the new scenes (measured only).
6. **No-JavaScript rendering.** The server HTML contains no hidden content (checked), but the
   page was not loaded with scripts disabled.
7. **Screen reader pass** and an automated audit (axe, Lighthouse).
8. **Other browsers** — only one Chromium-based browser was used.
9. **HTTP status for unknown case-study slugs.** They render the 404 page with `noindex` but
   answer 200, in the production build too. Decide whether a true 404 status is worth making
   the route block instead of stream.

## Next — needs the owner

- Confirm name, LinkedIn URL and that the ECHOSS project may be shown.
- Add roles, real screenshots, measured results and dates where they exist.
- Decide on email and résumé.
- Choose a domain, set `NEXT_PUBLIC_SITE_URL`, then deploy on instruction.

## Deferred until a feature needs them

GSAP, three.js, page transitions, a CMS, analytics, a contact form with a backend,
light/dark toggle, interface tests.
