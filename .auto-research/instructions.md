# Auto-Research Program — ziiro.work SEO (LOCKED)

Human-owned. The loop MUST NOT edit this file, `score.py`, prior rows of
`results.tsv`, or `.venv/`.

## Goal
Raise the site's deterministic SEO composite score (0–100, higher = better)
without touching design, layout, or the meaning of visible copy. The score is
built from the claude-seo plugin's own scripts (on-page + content) plus JSON-LD
richness and llms.txt — mirroring its Health-Score weights.

## Why it matters
The site is a strong-craft SPA that was invisible to crawlers until SSG was
added; the remaining wins are metadata-shaped (per-page schema, complete social
meta, right-sized titles/descriptions, internal linking, GEO). These are exactly
the fast, objective, non-gameable signals a loop can move.

## Editable asset — the ONLY files the loop may change
- `src/shared/components/SEO.tsx` — meta scaffold + JSON-LD injection
- `public/llms.txt` — GEO/AI-citation file
- `index.html` — ONLY the `<script type="application/ld+json">` @graph block (nothing else in this file)
- The `<SEO … />` JSX **props only** (title / description / canonical / schema) in:
  `src/pages/{Index,Mission,Products,Process,Pricing,Contact,Audit,Privacy,Terms}.tsx`
  (Index's `<SEO>` lives in `src/pages/Index.tsx`.) No other JSX, copy, layout, or component in these files.

## Scoring command (locked)
```
npm run build && .auto-research/.venv/bin/python .auto-research/score.py
```
Last stdout line is the number. Deterministic (verified: 82.54 ×3). Baseline = **82.54**.

## Guardrails — a change is REVERTED if any trip, even if the score rose
1. `npm run build` fails, or any route stops prerendering (must stay 9/9).
2. Visible page copy, headings, layout, styling, or any non-SEO component changes.
3. Business content removed or weakened (hero, CTA, pricing, services, audit).
4. **Fabricated structured data** — no `AggregateRating`, `Review`, ratings, or
   invented facts in JSON-LD. Schema must describe what is actually on the page.
5. Keyword stuffing — title/meta must read as natural human sentences; no keyword
   lists; brand "Ziiro" stays truthful and present in the title.
6. A locked file was edited (`instructions.md`, `score.py`, prior `results.tsv`, `.venv/`).
7. Content padded with filler to game `word_count`.

## Core Web Vitals — guardrail, not score
CWV/Lighthouse are intentionally OUT of the number (run-to-run variance would
poison keep/revert). If a change plausibly harms load (adds render-blocking
resources, heavy inline data), note it; do not trade real performance for SEO points.

## Loop
One focused change per round → build → score → keep if higher & guardrails pass,
else revert the asset change only → append one row to `results.tsv`.

## Stop condition
Safety mode: stop after 3 consecutive rounds with no improvement. Target ≥ 92.
Otherwise run until the user says stop.
