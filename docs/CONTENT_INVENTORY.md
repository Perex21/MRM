# Content inventory and evidence record

What the site says, where each fact came from, and what is still unknown.
**Rule:** nothing goes on the page unless it is listed here with a source.

Sources were read on 2026-10-13. External repositories were inspected read-only and
were not modified.

## Identity — `src/content/site.ts`

| Field | Value on site | Source | Confidence |
| --- | --- | --- | --- |
| Brand | The Unorthodox Path | Project brief | Confirmed |
| Name | Sathvik M | Display name on the GitHub account this repository pushes to (`git remote` → `Perex21/MRM`) | **Owner to confirm** — inferred from the account, never stated by the owner in this project |
| Role | AI/ML Engineer & Software Developer | Project brief | Confirmed |
| Statement | "I build agentic systems and AI-powered products for automation, cybersecurity and other real-world problems." | Adapted from the owner's GitHub bio | Owner to approve wording |
| Current focus | Five areas listed under "Currently exploring" | "Current Focus" list in the GitHub profile README | Presented as interests, not experience |
| GitHub | `https://github.com/Perex21` | `git remote` of this repository | Confirmed |
| LinkedIn | `https://www.linkedin.com/in/sathvik-madupoju/` | Linked from the GitHub profile README. The URL responds, but the page is behind a login wall and was not viewed | Owner to confirm |
| Email | not shown (`contact.email` is `null`) | An address is published in the GitHub profile README. It was deliberately **not** copied here: the brief says not to scrape an email for display. Set `contact.email` to show it | Owner's decision |
| Résumé | not shown (`resume` is `null`) | No résumé file exists in the repository | Missing |

Not used: other items in the GitHub profile README (a long technology badge list, a
"Stripe Agentic Payments" project). Only technologies evidenced in the three archive
projects appear under Capabilities.

## Project 1 — Hybrid Phishing Detection Platform

Source: public repository `Perex21/Phishing-Automation` (README, `main.py`, `config.py`,
`verdict.py`, `url_analyzer.py`, `url_ml_classifier.py`, `rf_classifier.py`,
`scam_detector.py`, `text_ml_classifier.py`, `ocr_handler.py`, `llm_explainer.py`,
`threat_intel.py`, `benchmark.py`, `evaluate_model.py`, `train_rf_model.py`,
`requirements.txt`, `scamshield-frontend/package.json`, `implementation_plan.md`).

| Claim on site | Evidence |
| --- | --- |
| FastAPI service with `/scan-url`, `/scan-text`, `/scan-image`, `/health` | `main.py` |
| Upload type whitelist, 10 MB limit, image verification, file deleted after OCR | `main.py`, `config.py` |
| Tesseract OCR via pytesseract | `ocr_handler.py`, `requirements.txt` |
| Heuristics with Cisco Umbrella top-1M reputation | `url_analyzer.py` docstring and loader |
| BERT-based URL classifier (`kmack/malicious-url-detection`) | `url_ml_classifier.py` |
| Random Forest over 18 URL features | `rf_classifier.py` `FEATURE_NAMES` |
| Heuristic base score; BERT adds ≤30% of confidence; RF gated on heuristics; reputable domains capped; clamp 0–100 | `main.py` `scan_url` |
| Four verdict bands | `verdict.py`, `config.py` `THRESHOLDS` |
| Text: rules primary, zero-shot secondary, TF-IDF RF when files exist | `scam_detector.py` docstring, `text_ml_classifier.py` |
| Explanations are templated, no LLM | `llm_explainer.py` docstring |
| Models preloaded at startup; LRU + TTL URL cache | `main.py` lifespan and cache helpers |
| React/Vite dashboard, history in localStorage, Recharts | `scamshield-frontend/`, `lib/history.js` |
| Hackathon context; local-only processing as a design goal | `implementation_plan.md`, `threat_intel.py` comment |
| Benchmark of four HF models on 100 URLs; evaluation script; RF training (150 trees, two datasets) | `benchmark.py`, `evaluate_model.py`, `train_rf_model.py` |
| Threat intel is a stub; models and datasets not committed; health reports OCR unconditionally | `threat_intel.py`, `.gitignore`, `main.py` |

Unknown: any measured accuracy (no results are recorded), the owner's individual role
(commits are by a different handle, `Stvk21`), which hackathon, team size, dates.
Screenshots referenced by the README are not in the repository.

## Project 2 — AI-powered GST Audit & Compliance Platform

Source: public repository `Perex21/gst-compliance-agent` (README, `BACKEND_ARCHITECTURE.md`,
`project_report.md`, `gst-api/main.py`, `gst_brain/main.py`, `gst_brain/enterprise_modules.py`,
`gst_brain/gemini_client.py`, `frontend/package.json`, `generate_demo_data.py`, `test_api.py`).

| Claim on site | Evidence |
| --- | --- |
| Reconciles purchase register against GSTR-2B from Excel uploads | `gst-api/main.py` `/reconcile`, `gst_brain/main.py` |
| Sanitising, outer merge, three-way classification, variance checks | `gst_brain/main.py`, `BACKEND_ARCHITECTURE.md` |
| Optional fuzzy matching with thefuzz | `gst_brain/main.py` |
| ITC eligibility, vendor risk and invoice compliance modules, with the specific rules named | `enterprise_modules.py` `rule_violated` strings |
| Gemini `gemini-2.5-flash`, one batched JSON request (up to 50 mismatches), chat with findings as context | `gemini_client.py`, `gst_brain/main.py` |
| Reconciliation survives a failed or missing AI call | `gemini_client.py` fallbacks |
| Uploads saved under a UUID and removed in `finally` | `gst-api/main.py` |
| React/Vite frontend replaced a Streamlit one | `project_report.md`, `frontend/package.json` |
| Demo data generator with intentional mismatches; script-based API checks | `generate_demo_data.py`, `test_api.py` |
| E-way bill endpoint is a hard-coded simulation; vendor matching by name | `gst-api/main.py`, `enterprise_modules.py` comment |
| README lists OpenAI but code uses Gemini | README vs `gemini_client.py` |
| Hackathon team project | Folder name `gst-hackathon-project`; `project_report.md` lists four members by function |
| Demo video link | README; the URL resolves to a YouTube video titled "DEMO - GST" (content not watched) |

Unknown: the owner's individual role in the team, which hackathon, dates, any measured results.

## Project 3 — ECHOSS STUDIO website

Source: local working copy at `Desktop/EchossStudio` (README, `package.json`, `src/content/site.ts`,
header comments of the hero, showreel, work, enquiry and motion modules, `.env.example`, git log).
Its remote `Perex21/Echoss` is not publicly reachable, so the site shows **no repository link**.

| Claim on site | Evidence |
| --- | --- |
| Marketing site for an animation studio; Next.js, React, TypeScript, Tailwind | README, `package.json` |
| Interactive three.js/R3F globe, lazy-loaded over a static poster; textures baked from Natural Earth data | README, `hero-globe.tsx`, `scripts/render-globe-maps.mjs` |
| Drag, arrow keys, pause control; stops off-screen; no load with data saver; poster stays without WebGL 2 | README "Motion and accessibility notes" |
| Motion for React plus GSAP ScrollTrigger for two scrubbed sequences, nothing pinned | README |
| Custom showreel player; generated film leader labelled as placeholder | README, `leader-reel.ts` |
| Disc-shelf and grid work views | README structure, `work-views.tsx` |
| Enquiry route: shared validation, honeypot, 5 per 10 minutes per address, Resend, honest "not configured" state | README, `api/enquiry/route.ts`, `.env.example` |
| Draft and placeholder labelling; no client, award or statistic claims | README, `site.ts`, `draft-tag.tsx` |
| In development, not launched, content pending | README "What still needs to come from the studio" |

Unknown: the owner's relationship to the studio (client work or own venture), launch plans,
whether the project may be shown publicly at all. **Owner to confirm it can be listed.**

## What is deliberately absent

- Metrics of any kind: no accuracy, speed, user or business figures exist in the sources.
- Roles: `Project.role` is unset for all three, because authorship is not established by the sources.
- Employers, education, dates, awards, testimonials.
- Screenshots: none were available. Each project has an original illustration, captioned as such.

## To make the site fully the owner's

1. Confirm the name and the LinkedIn URL in `src/content/site.ts`.
2. Decide whether to show an email (`contact.email`) and add a résumé (`resume`).
3. Add `role` to each project where it can be stated truthfully.
4. Supply real screenshots, measured results, and dates if they exist.
5. Confirm the ECHOSS project may be public.
6. Set `NEXT_PUBLIC_SITE_URL` when a domain is chosen.
