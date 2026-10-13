# THE UNORTHODOX PATH — project rules

Personal portfolio for an AI/ML engineer and software developer: a home page and one case
study per project at `/work/[slug]`. Audience: recruiters, hiring managers, engineering
teams, freelance clients. Details live in `docs/`.

@AGENTS.md

## Before changing anything

- Read the code you are about to change, and the components around it, first.
- Next.js here is 16.x and differs from older versions. Check `node_modules/next/dist/docs/`
  before using an API from memory.
- Keep `docs/` in step with the code when a material decision changes.

## Brand

- Murim/manhwa is the inspiration, never the subject. Express it through composition,
  negative space, material contrast (ink vs paper), and pacing.
- No swords, HUD overlays, cultivation/level metaphors, fantasy-game UI, or cyberpunk glow.
- Tone: quiet confidence, discipline, craft. A recruiter must understand the page in seconds
  without decoding the theme.
- The recurring motif is **the Divergence**: a straight line and one stroke that leaves it.
  Reuse it (`DivergenceMark`, `Seal`, `HeroLandscape`, `RidgeDivider`, `ProjectArt`, `Pipeline`)
  rather than adding new symbols.
- Do not turn every section into a card. Prefer hairlines, whitespace, and grid alignment.

## Truthful content (hard rule)

- Never invent metrics, clients, results, deployment status, features, tech stacks, bio
  details, or contact destinations.
- All public copy comes from `src/content/`. Unknown facts stay `undefined`/`null`; the UI
  omits them.
- Every claim needs a source recorded in `docs/CONTENT_INVENTORY.md` (source file or project
  document). When code and a README disagree, follow the code and say so.
- Illustrations and schematics are labelled as such; never present one as a screenshot.
- No "coming soon" or "in preparation" text in the public interface. `npm test` enforces this.
- Do not publish an email address unless the owner sets `site.contact.email`.

## Architecture and conventions

- Next.js App Router, React 19, TypeScript strict, Tailwind CSS v4, npm. Alias `@/*` → `src/*`.
- Server components by default. `"use client"` only for real interactivity (currently
  `MobileNav`, `NavLinks`, `Reveal`, `Tilt`, `Seal`, `HeroLandscape`).
- Layout: `src/app` (routes), `src/components/{layout,sections,projects,ui,graphics,motion}`,
  `src/content` (typed data), `src/lib` (helpers), `src/styles/tokens.css` (design tokens).
- Style with tokens only. No raw hex values in components; add a token if one is missing.
- Colours inside a section come from semantic tokens (`text-fg`, `text-fg-muted`,
  `border-line`, `text-accent`) resolved by `.surface-ink` / `.surface-paper`.
- Small, named components. No abstractions or config for hypothetical needs.
- No new dependency without a feature that needs it. Motion is the only animation library;
  GSAP and three.js were considered and not added (see `docs/ARCHITECTURE.md`).
- Internal links use `next/link` with root-relative hashes (`/#work`); external links go
  through `ActionLink` or carry `ExternalMark`, `target="_blank"` and `rel="noopener noreferrer"`.
- A new case study is one more `Project` in `src/content/projects.ts`, plus a composition in
  `ProjectArt`.

## Accessibility, responsiveness, performance

- Semantic HTML, one `h1`, ordered headings, descriptive link text, skip link.
- Every control is keyboard-operable with a visible `:focus-visible` ring and a target of
  at least 44×44px. Never hide information behind hover alone.
- Text contrast ≥ 4.5:1. Raw cinnabar and jade fail as small text on ink — use the
  `-bright` tints there (see `docs/DESIGN_SYSTEM.md`).
- Validate at 360, 390, 768, 1024 and 1440px: no horizontal overflow, no text below 13px.
- Artwork is inline SVG/CSS. Fonts load through `next/font` only.

## Motion

- Vocabulary: fade + upward settle, clip reveals for artwork, masked headline lines, drawn
  strokes, precise hover/press, small pointer-driven depth. One primary motion per element.
  No bounce, idle loops, pinning, scroll-jacking or custom cursor. Scroll-linked movement is
  limited to the hero hand-off.
- Durations and easings come from `src/styles/tokens.css` (CSS) and `src/lib/motion.ts`
  (Motion). They mirror each other — change both.
- Content must be visible without JavaScript. First-screen entrances are CSS; scroll
  reveals use `Reveal`, which renders visible and only hides below-fold content after
  hydration. Never server-render content at `opacity: 0`.
- `prefers-reduced-motion: reduce` shows everything immediately and stops nonessential motion.
  Remove the animation rather than zeroing its distance: no fade, translation or exit
  transition (see `MobileNav`). Gate decorative transforms with `motion-safe:`.

## Validation (run all four before calling work done)

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

- Fix anything your change broke. Never report a command as passing unless you ran it.
- Check visual changes in a browser at the five widths, or say plainly that you could not.
- Never deploy, buy services, or commit credentials without being asked.
