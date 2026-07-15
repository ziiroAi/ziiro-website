#!/usr/bin/env python3
"""
LOCKED SCORER — ziiro.work SEO composite. Do NOT edit during a loop.

Emits ONE number on the last stdout line (higher = better, 0-100). A per-component
breakdown goes to stderr for the log/report.

The connection to the claude-seo skill: this wraps that plugin's deterministic
scripts as the measuring stick —
  ~/.claude/skills/seo/scripts/parse_html.py      (on-page extraction)
  ~/.claude/skills/seo/scripts/content_quality.py (content 0-100)
and validates JSON-LD inline. Weights mirror claude-seo's Health-Score
methodology (Technical/On-Page, Content, Schema, AI/GEO). Core Web Vitals are a
GUARDRAIL, not part of this number, to keep it zero-variance for keep/revert.

Run:  .auto-research/.venv/bin/python .auto-research/score.py
"""
import json
import os
import re
import subprocess
import sys
from glob import glob

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DIST = os.path.join(ROOT, "dist")
SEO = os.path.expanduser("~/.claude/skills/seo")
PARSE = os.path.join(SEO, "scripts", "parse_html.py")
CQ = os.path.join(SEO, "scripts", "content_quality.py")
PY = sys.executable  # the venv python (has bs4 + lxml)

# Indexable routes only (skip 404, which is noindex by design).
ROUTES = [
    "index.html", "mission/index.html", "products/index.html",
    "process/index.html", "pricing/index.html", "contact/index.html",
    "audit/index.html", "privacy/index.html", "terms/index.html",
]

MISSING = -1.0  # sentinel


def run_json(script, htmlfile, extra=None):
    cmd = [PY, script, htmlfile, "--json"] + (extra or [])
    try:
        out = subprocess.run(cmd, capture_output=True, text=True, timeout=60)
        return json.loads(out.stdout)
    except Exception:
        return None


def band(value, lo, hi, hard_lo, hard_hi):
    """100 inside [lo,hi]; linear falloff to 0 at hard_lo / hard_hi."""
    if value is None:
        return 0.0
    if lo <= value <= hi:
        return 100.0
    if value < lo:
        return max(0.0, 100.0 * (value - hard_lo) / (lo - hard_lo)) if lo > hard_lo else 0.0
    return max(0.0, 100.0 * (hard_hi - value) / (hard_hi - hi)) if hard_hi > hi else 0.0


def meta_tag_coverage(html):
    """Reward a complete social/robots meta surface (SEO.tsx can add these)."""
    checks = {
        "og:title": r'property="og:title"',
        "og:description": r'property="og:description"',
        "og:image": r'property="og:image"',
        "og:url": r'property="og:url"',
        "og:type": r'property="og:type"',
        "og:site_name": r'property="og:site_name"',
        "twitter:card": r'name="twitter:card"',
        "twitter:title": r'name="twitter:title"',
        "og:image:alt": r'property="og:image:alt"',
        "robots-preview": r'name="robots"[^>]*max-image-preview',
    }
    hit = sum(1 for pat in checks.values() if re.search(pat, html))
    return 100.0 * hit / len(checks)


def schema_score(html):
    """Richness of valid JSON-LD: count distinct valid @types; 0 on parse error."""
    blocks = re.findall(r'<script[^>]*application/ld\+json[^>]*>(.*?)</script>', html, re.S)
    if not blocks:
        return 0.0
    types = set()
    for b in blocks:
        try:
            data = json.loads(b)
        except Exception:
            return 10.0  # present but broken JSON — heavy penalty, not zero
        nodes = data.get("@graph", [data]) if isinstance(data, dict) else data
        for n in nodes if isinstance(nodes, list) else [nodes]:
            if isinstance(n, dict):
                t = n.get("@type")
                if isinstance(t, list):
                    types.update(t)
                elif t:
                    types.add(t)
    # 3 distinct valid entity types ~= a healthy page graph.
    return min(100.0, 100.0 * len(types) / 3.0)


def geo_score():
    """AI/GEO: llms.txt present, substantive, and structured."""
    p = os.path.join(ROOT, "public", "llms.txt")
    if not os.path.exists(p):
        return 0.0
    txt = open(p, encoding="utf-8").read()
    s = 0.0
    s += 40 if len(txt) >= 500 else 40 * len(txt) / 500
    s += 20 if txt.count("#") >= 3 else 20 * txt.count("#") / 3          # sections
    s += 20 if txt.count("http") >= 3 else 20 * min(txt.count("http"), 3) / 3  # links
    s += 20 if "ziiro" in txt.lower() else 0                             # on-brand
    return min(100.0, s)


def score_page(route):
    f = os.path.join(DIST, route)
    if not os.path.exists(f):
        return None
    html = open(f, encoding="utf-8").read()
    p = run_json(PARSE, f) or {}
    cq = run_json(CQ, f) or {}

    title = p.get("title") or ""
    meta = p.get("meta_description") or ""
    h1 = p.get("h1", [])
    h2 = p.get("h2", [])
    imgs = p.get("images", [])
    links = p.get("links", {}) or {}
    internal = links.get("internal", [])
    words = p.get("word_count") or 0

    alt_cov = 100.0 if not imgs else 100.0 * sum(1 for i in imgs if (i.get("alt") or "").strip()) / len(imgs)

    onpage_parts = [
        band(len(title), 30, 60, 0, 75),                 # title length
        band(len(meta), 120, 160, 40, 200),              # meta length
        100.0 if p.get("canonical") else 0.0,            # canonical present
        100.0 if len(h1) == 1 else (40.0 if h1 else 0.0),  # exactly one h1
        band(len(h2), 2, 12, 0, 24),                     # h2 structure
        meta_tag_coverage(html),                         # social/robots meta
        band(words, 250, 4000, 0, 6000),                 # content depth
        band(len(internal), 3, 60, 0, 120),              # internal links
        alt_cov,                                         # image alt coverage
    ]
    onpage = sum(onpage_parts) / len(onpage_parts)
    content = float(cq.get("overall_quality", 0))
    schema = schema_score(html)

    page = 0.50 * onpage + 0.27 * content + 0.23 * schema
    return {"route": route, "page": page, "onpage": onpage, "content": content,
            "schema": schema, "title_len": len(title), "meta_len": len(meta),
            "words": words, "int_links": len(internal), "h1": len(h1)}


def main():
    pages = [sp for r in ROUTES if (sp := score_page(r))]
    if not pages:
        print("ERROR: no built routes found — run `npm run build` first", file=sys.stderr)
        print("0.0")
        return
    mean_page = sum(p["page"] for p in pages) / len(pages)
    geo = geo_score()
    final = 0.88 * mean_page + 0.12 * geo

    # breakdown -> stderr (never the score line)
    print(f"routes scored: {len(pages)}", file=sys.stderr)
    for p in pages:
        print(f"  {p['route']:22s} page={p['page']:5.1f}  onpage={p['onpage']:5.1f} "
              f"content={p['content']:5.1f} schema={p['schema']:5.1f} "
              f"(title={p['title_len']} meta={p['meta_len']} words={p['words']} "
              f"h1={p['h1']} ilinks={p['int_links']})", file=sys.stderr)
    print(f"mean_page={mean_page:.2f}  geo={geo:.2f}", file=sys.stderr)

    print(f"{final:.2f}")  # <-- the number (last stdout line)


if __name__ == "__main__":
    main()
