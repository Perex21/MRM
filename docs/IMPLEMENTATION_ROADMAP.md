# Implementation roadmap

## Mission 001 — foundation and first experience (done)

- Scaffold, strict TypeScript, Tailwind v4 tokens, fonts.
- Shell, hero, selected work, further-chapters index, footer.
- Motion foundation (CSS entrances, `Reveal`, mobile menu).
- `npm run lint`, `npm run typecheck`, `npm run build` pass.
- Layout measured in a browser at 360 / 768 / 1024 / 1440. Seen by eye at 1440 only.

## Mission 001.1 — quality gate (done)

- Reduced motion: mobile menu no longer animates at all; link hover/press movement gated.
- Found and fixed in the browser: header wordmark wrapping at 360px, desktop nav not
  fitting at 768px (breakpoint moved to `lg`), stray hero line crossing text on phones.
- `npm audit` triaged: one dev-only advisory with no compatible fix (see `ARCHITECTURE.md`).
- Seen by eye: 360 (hero, open menu), 375, 768 and 1440 (hero). 1024 was measured only.
- **Still unverified:** reduced-motion mode in a real browser (the test browser cannot
  emulate the preference), no-JavaScript rendering, screen readers, other browsers.

## Mission 002 — real content and case studies (next)

Blocked on the owner filling the gaps in `CONTENT_INVENTORY.md`.

1. Visual review at 1024px and of the lower page (work rows, chapters, footer) on phones;
   test with the OS reduced-motion setting switched on.
2. Set the real name and contact destination; add the hero contact action.
3. Fill project facts (role, stack, outcomes, links) and replace plates with screenshots.
4. Decide on `/work/[slug]` case-study routes; build one fully as the template.
5. Write and build the About & engineering approach section.

## Mission 003 — capabilities, résumé, contact

- Capabilities section tied to project evidence.
- Résumé download and professional links.
- Contact section (mailto first; a form only if there is a backend reason).

## Mission 004 — polish and launch readiness

- Metadata, Open Graph image, sitemap, robots.
- Accessibility audit with tooling (axe, screen reader pass) and Lighthouse.
- Re-check `npm audit` (one accepted dev-only advisory, see `ARCHITECTURE.md`).
- Choose hosting; deploy only on the owner's instruction.

## Deferred until a feature needs them

- GSAP, 3D, page transitions, a CMS, analytics, light/dark toggle, tests.
