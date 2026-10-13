# Architecture

## Stack

| Piece | Version installed | Notes |
| --- | --- | --- |
| Next.js (App Router, Turbopack) | 16.4.0 | `cacheComponents` and `partialPrefetching` on (scaffold defaults) |
| React / React DOM | 19.3.0 | |
| TypeScript | 5.9.3 | `strict: true` |
| Tailwind CSS | 4.3.3 | Loaded through `@tailwindcss/turbopack` (see `next.config.ts`); no PostCSS config |
| ESLint | 9.39.5 | `eslint-config-next` core-web-vitals + typescript |
| Motion | 14.1.0 | `motion/react`; mobile menu and scroll reveals only |

Node 24 / npm 11 were used. The home page prerenders as static content.

## Structure

```
src/
  app/            layout.tsx, page.tsx, globals.css, icon.svg
  components/
    layout/       Container, SiteHeader, MobileNav (client), SiteFooter
    sections/     Hero, SelectedWork, FurtherChapters
    projects/     ProjectEntry, ProjectPlate
    ui/           ActionLink, SectionHeading
    graphics/     DivergenceMark, HeroLandscape
    motion/       Reveal (client)
  content/        site.ts, sections.ts, projects.ts   ← all public copy and facts
  lib/            cn.ts, motion.ts
  styles/         tokens.css                          ← design tokens
docs/             product, design, architecture, content, roadmap
```

## Boundaries

- **Content** (`src/content`) is typed data with no JSX. Components read it; they hold no facts.
- **Tokens** (`src/styles/tokens.css`) are the only place colours, type sizes, layout bounds
  and easings are defined. `globals.css` holds base styles and the CSS animation utilities.
- **Sections** compose layout + ui + content. `page.tsx` only orders sections.
- **Graphics** are decorative inline SVG (`aria-hidden`), except `ProjectPlate`, which is a
  labelled image.

## Server and client components

Everything is a server component except:

- `MobileNav` — toggle state, Escape handling, `AnimatePresence`.
- `Reveal` — `IntersectionObserver` + Motion.

## Decisions

- **Sections registry** (`content/sections.ts`) drives the header, footer and the "Further
  chapters" list, so navigation cannot drift from the page. A section with `status: "planned"`
  renders as a row carrying its anchor id; when written, it gets its own component in
  `components/sections/` and its status flips to `live`.
- **Same-page anchors** use plain `<a href="#…">`. There is one route.
- **Hero entrance is CSS**, not Motion, so it works without JavaScript.
- **`Reveal` never server-renders hidden content.** It hides only elements below the fold
  after hydration, then reveals them on intersect.
- **Navigation breakpoint is `lg` (1024px).** At 768px the five desktop links plus the
  wordmark do not fit; the wordmark was silently wrapping to two lines there. Below `lg`
  the disclosure menu is used.
- **The hero's road and path lines render from `md` up.** Below that the SVG crop leaves
  only a stray fragment that crossed the role statement.
- **Under reduced motion `MobileNav` renders a plain `<nav>`** with no `AnimatePresence`,
  so there is no fade, translation or exit animation to wait for.
- **Hero disc is a positioned element**, not part of the landscape SVG, so the SVG's
  `slice` cropping can never put cinnabar behind body text.
- **No year in the footer**: reading the current time in a server component conflicts with
  `cacheComponents` prerendering, and the value adds little.
- **Scaffold in a subfolder, then moved up**: `create-next-app` rejects the uppercase
  directory name `MURIM`. The package is named `unorthodox-path`.

## Dependency advisories

All five `npm audit` entries are one advisory seen through its dependency chain:

- **Advisory:** GHSA-vfj7-8cjw-p6xm — `braces` ≤ 3.0.3, stack-exhaustion denial of service
  on deeply nested brace patterns (CVSS 7.5).
- **Path:** `eslint-config-next@16.4.0` → `@next/eslint-plugin-next@16.4.0` →
  `fast-glob@3.3.1` → `micromatch@4.0.8` → `braces@3.0.3`.
- **No compatible fix exists.** 3.0.3 is the latest published `braces`, so an override
  cannot help. The only fix npm offers is `--force`, which downgrades `eslint-config-next`
  to 14.2.35 — two majors behind the installed Next.js 16. Not applied.
- **Exposure:** development tooling only. `npm audit --omit=dev` reports 0 vulnerabilities;
  nothing on this path ships in the built site. Triggering it needs a hostile glob pattern
  fed to the linter, which here only reads patterns from this repository's own config.
- **Action:** accepted for now. Re-run `npm audit` when `braces` or `eslint-config-next`
  publishes a new version.

## Known uncertainties

- The project lives in a OneDrive-synced folder. `node_modules` and `.next` there can be slow
  or lock files during sync; moving the project out of OneDrive is advisable.
- Git: the repository was initialised by the owner after mission 001 (one commit,
  `Foundation MRM`, on `main`) with a GitHub remote, `origin` → `Perex21/MRM`. The mission
  001.1 changes are uncommitted in the working tree.
- `npm audit` (run 2026-10-13) reports 5 high-severity entries. See "Dependency advisories".
- No tests exist yet; there is no logic complex enough to warrant them.
- No deployment target is chosen.
