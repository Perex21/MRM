# Implementation roadmap

## Mission 001 — foundation and first experience (done)

- Scaffold, strict TypeScript, Tailwind v4 tokens, fonts.
- Shell, hero, selected work, further-chapters index, footer.
- Motion foundation (CSS entrances, `Reveal`, mobile menu).
- `npm run lint`, `npm run typecheck`, `npm run build` pass.
- Layout measured in a browser at 360 / 768 / 1024 / 1440. **Not yet reviewed by eye** —
  screenshots were unavailable in the session that built it. Do this first in mission 002.

## Mission 002 — real content and case studies (next)

Blocked on the owner filling the gaps in `CONTENT_INVENTORY.md`.

1. Visual review at the four widths; adjust hero composition as needed.
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
- Triage `npm audit` findings.
- Choose hosting; deploy only on the owner's instruction.

## Deferred until a feature needs them

- GSAP, 3D, page transitions, a CMS, analytics, light/dark toggle, tests.
