// Build-time sitemap generator (pure Node, Vercel-safe).
//
// Writes dist/sitemap.xml from the shared route table so the sitemap can never
// drift from what actually ships. There is deliberately no sitemap.xml checked
// into public/: one source of truth, and it's routes.mjs.
//
// Also runs two guards that fail the build rather than shipping a quietly wrong
// file: every declared source must exist, and every indexable route must be
// linked from llms.txt.
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { routes } from "./routes.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const BASE_URL = "https://ziiro.work";

/**
 * Newest commit date across a route's source files, as YYYY-MM-DD.
 *
 * Returns null when git can't answer — no repo, or a shallow clone whose
 * history doesn't reach the last commit that touched these files. Callers fall
 * back to the pinned date instead of stamping today, because a lastmod that
 * changes on every deploy is a signal search engines learn to ignore.
 */
function gitLastModified(sources) {
  try {
    const out = execFileSync(
      "git",
      ["log", "-1", "--format=%cs", "--", ...sources],
      { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] },
    ).trim();
    return /^\d{4}-\d{2}-\d{2}$/.test(out) ? out : null;
  } catch {
    return null;
  }
}

// Guard 1: a renamed or deleted source would otherwise make git return nothing
// and silently freeze that route's lastmod on its fallback date forever.
const missing = routes.flatMap((r) =>
  r.sources.filter((s) => !existsSync(resolve(root, s))).map((s) => `${r.path} -> ${s}`),
);
if (missing.length) {
  console.error("  sitemap: source paths in routes.mjs no longer exist:");
  for (const m of missing) console.error(`    ${m}`);
  process.exit(1);
}

// Guard 2: llms.txt is prose, so it stays hand-written, but it must at least
// link every indexable page. AI crawlers read it as the site's table of
// contents; a page absent from it is a page they may never look at.
const llms = readFileSync(resolve(root, "public/llms.txt"), "utf8");
const unlisted = routes
  .map((r) => `${BASE_URL}${r.path === "/" ? "" : r.path}`)
  .filter((url) => !llms.includes(`(${url})`));
if (unlisted.length) {
  console.error("  sitemap: routes missing from public/llms.txt:");
  for (const u of unlisted) console.error(`    ${u}`);
  process.exit(1);
}

/** XML text escaping. Titles and player URLs carry & and ' routinely. */
const esc = (s) =>
  String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");

/**
 * <video:video> extension. Google uses it to discover a video without having
 * to infer one from the page, which matters most for players it can't parse.
 * Required by the spec: thumbnail_loc, title, description, and one of
 * content_loc / player_loc.
 */
const videoBlock = (v) =>
  [
    "    <video:video>",
    `      <video:thumbnail_loc>${esc(v.thumbnail)}</video:thumbnail_loc>`,
    `      <video:title>${esc(v.title)}</video:title>`,
    `      <video:description>${esc(v.description)}</video:description>`,
    `      <video:player_loc>${esc(v.playerLoc)}</video:player_loc>`,
    `      <video:duration>${v.durationSeconds}</video:duration>`,
    `      <video:publication_date>${v.publicationDate}</video:publication_date>`,
    "      <video:family_friendly>yes</video:family_friendly>",
    "      <video:requires_subscription>no</video:requires_subscription>",
    "      <video:live>no</video:live>",
    "    </video:video>",
  ].join("\n");

let gitHits = 0;
const urls = routes.map((route) => {
  const fromGit = gitLastModified(route.sources);
  if (fromGit) gitHits++;
  const lastmod = fromGit ?? route.fallback;
  // Trailing slash on the origin only; every other path stays bare, matching
  // the canonical URLs emitted by SEO.tsx.
  const loc = `${BASE_URL}${route.path === "/" ? "/" : route.path}`;
  return [
    "  <url>",
    `    <loc>${loc}</loc>`,
    `    <lastmod>${lastmod}</lastmod>`,
    `    <changefreq>${route.changefreq}</changefreq>`,
    `    <priority>${route.priority}</priority>`,
    ...(route.video ? [videoBlock(route.video)] : []),
    "  </url>",
  ].join("\n");
});

const videoCount = routes.filter((r) => r.video).length;

const xml = [
  '<?xml version="1.0" encoding="UTF-8"?>',
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"',
  '        xmlns:video="http://www.google.com/schemas/sitemap-video/1.1">',
  ...urls,
  "</urlset>",
  "",
].join("\n");

writeFileSync(resolve(root, "dist/sitemap.xml"), xml);
console.log(
  `Generated sitemap.xml with ${routes.length} URLs (${gitHits} dated from git history, ${videoCount} with video metadata).`,
);
