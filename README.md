# The Unorthodox Path

Portfolio of an AI/ML engineer and software developer: a home page and three case studies.
Next.js 16 · React 19 · TypeScript · Tailwind CSS 4 · Motion.

```bash
npm install
npm run dev        # http://localhost:3000
npm run lint
npm run typecheck
npm test
npm run build
```

## Editing content

| To change | Edit |
| --- | --- |
| Name, statement, links, email, résumé | `src/content/site.ts` |
| Projects and case studies | `src/content/projects.ts` |
| Approach and capabilities | `src/content/profile.ts` |
| Section order and labels | `src/content/sections.ts` |

Set `NEXT_PUBLIC_SITE_URL` to the public origin before deploying; canonical URLs, the sitemap
and social previews use it.

Project rules are in `CLAUDE.md`. Design, architecture, the evidence behind every claim, and
what is still unverified are in `docs/`.
