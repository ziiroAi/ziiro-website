// Build-time llms-full.txt generator (pure Node, Vercel-safe).
//
// WHAT IT IS. llms.txt is the link index: it tells an agent which pages exist
// and what each one is for. llms-full.txt is its companion carrying the actual
// CONTENT, so an agent that wants the whole site can take it in one fetch
// instead of crawling thirteen pages and reassembling them.
//
// WHY IT IS GENERATED FROM dist/ RATHER THAN FROM SOURCE. It is built from the
// same prerendered HTML a crawler receives, so it cannot drift from the site.
// A hand-written copy of the site's content is a second source of truth that
// goes stale the first time someone edits a page and forgets this file, which
// is exactly the duplication this codebase has spent several jobs removing.
// Writing it from the shipped HTML means the only way to change it is to
// change the page.
//
// WHAT IS STRIPPED, and why each is noise rather than content:
//   - <nav> and <footer>, which are identical on all thirteen routes. Kept,
//     they would be about a fifth of the file and would teach an agent that
//     every page is mostly a menu.
//   - <script>, <style> and <svg>.
//   - sr-only text, which on this site is duplicate ("Ziiro orb: Ready") or
//     interaction guidance ("opens in a new tab"), neither of which means
//     anything to a reader ingesting prose.
//   - aria-hidden elements, which are decorative by definition.
//   - React's <!-- --> text-node separators.
//
// The heading hierarchy is preserved as markdown levels, because that is how
// an agent learns a page's shape rather than reading it as one flat blob.
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { routes } from "./routes.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const dist = resolve(root, "dist");
const BASE_URL = "https://ziiro.work";

/** Below this a page is almost certainly an empty shell rather than content,
 *  and shipping that would tell an agent the site says nothing. */
const MIN_WORDS = 40;

const decode = (s) =>
  s
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&");

/** Drops one element and everything inside it, matching nested opens so a
 *  <div> inside the element cannot end the match early. */
function dropElement(html, tag) {
  const open = new RegExp(`<${tag}\\b`, "i");
  let out = html;
  for (;;) {
    const start = out.search(open);
    if (start === -1) return out;
    // Walk forward counting opens and closes of this tag name.
    const re = new RegExp(`<(/?)${tag}\\b[^>]*>`, "gi");
    re.lastIndex = start;
    let depth = 0;
    let end = -1;
    let m;
    while ((m = re.exec(out))) {
      depth += m[1] ? -1 : 1;
      if (depth === 0) {
        end = m.index + m[0].length;
        break;
      }
    }
    if (end === -1) return out.slice(0, start); // unbalanced: drop the tail
    out = out.slice(0, start) + out.slice(end);
  }
}

/** Drops elements carrying a given attribute value, with their contents. */
function dropByAttr(html, attr) {
  let out = html;
  for (;;) {
    const i = out.indexOf(attr);
    if (i === -1) return out;
    // Find the tag this attribute belongs to.
    const start = out.lastIndexOf("<", i);
    const nameMatch = /^<([a-zA-Z0-9]+)/.exec(out.slice(start));
    if (!nameMatch) return out.slice(0, start) + out.slice(i + attr.length);
    const tag = nameMatch[1];
    const re = new RegExp(`<(/?)${tag}\\b[^>]*>`, "gi");
    re.lastIndex = start;
    let depth = 0;
    let end = -1;
    let m;
    while ((m = re.exec(out))) {
      depth += m[1] ? -1 : 1;
      if (depth === 0) {
        end = m.index + m[0].length;
        break;
      }
    }
    if (end === -1) return out.slice(0, start);
    out = out.slice(0, start) + out.slice(end);
  }
}

/** Prerendered HTML for one route, as markdown. */
function pageToMarkdown(html) {
  let s = (html.match(/<body[^>]*>([\s\S]*)<\/body>/i) || [, ""])[1];

  s = s.replace(/<!--[\s\S]*?-->/g, "");
  for (const tag of ["script", "style", "svg", "nav", "footer"]) s = dropElement(s, tag);
  s = dropByAttr(s, 'class="sr-only"');
  s = dropByAttr(s, 'aria-hidden="true"');

  // Headings first, so their level survives the general tag strip below.
  //
  // Demoted one level. The file's own outline is "# document" then "## page",
  // so a page's <h1> has to land at ### for the hierarchy to mean anything. At
  // its native level a section heading like "## Diagnose" would sit as a
  // sibling of the page titles, and an agent reading the outline would think
  // Diagnose was a page.
  s = s.replace(/<h([1-6])\b[^>]*>([\s\S]*?)<\/h\1>/gi, (_, level, inner) => {
    const text = decode(inner.replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
    const depth = Math.min(6, Number(level) + 2);
    return text ? `\n\n${"#".repeat(depth)} ${text}\n\n` : "\n";
  });

  // List items become bullets; definition pairs become "term: value".
  s = s.replace(/<li\b[^>]*>([\s\S]*?)<\/li>/gi, (_, inner) => {
    const text = decode(inner.replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
    return text ? `\n- ${text}` : "";
  });
  s = s.replace(/<dt\b[^>]*>([\s\S]*?)<\/dt>/gi, (_, i) => {
    const t = decode(i.replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
    return t ? `\n- ${t}: ` : "";
  });
  s = s.replace(/<dd\b[^>]*>([\s\S]*?)<\/dd>/gi, (_, i) => {
    const t = decode(i.replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
    return t ? `${t}` : "";
  });

  // Remaining block boundaries become line breaks so prose does not run on.
  s = s.replace(/<\/(p|div|section|article|header|tr|ol|ul|dl|blockquote)>/gi, "\n");
  s = s.replace(/<br\s*\/?>/gi, " ");
  s = s.replace(/<[^>]+>/g, " ");
  s = decode(s);

  return s
    .split("\n")
    .map((line) => line.replace(/[ \t ]+/g, " ").trim())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

const indexable = routes.filter((r) => r.noindex !== true);
const sections = [];
const problems = [];

for (const route of indexable) {
  const file = resolve(dist, route.path === "/" ? "index.html" : `.${route.path}/index.html`);
  if (!existsSync(file)) {
    problems.push(`${route.path}: no prerendered HTML at ${file}`);
    continue;
  }
  const html = readFileSync(file, "utf8");
  const title = decode((html.match(/<title[^>]*>([^<]*)<\/title>/i) || [, ""])[1]).trim();
  const description = decode(
    (html.match(/<meta[^>]*name="description"[^>]*content="([^"]*)"/i) || [, ""])[1],
  ).trim();
  const body = pageToMarkdown(html);
  const words = body.split(/\s+/).filter(Boolean).length;
  if (words < MIN_WORDS) {
    problems.push(`${route.path}: only ${words} words of content, looks like an empty shell`);
  }
  sections.push(
    [
      `## ${title || route.path}`,
      `URL: ${BASE_URL}${route.path}`,
      description ? `Description: ${description}` : null,
      "",
      body,
    ]
      .filter((l) => l !== null)
      .join("\n"),
  );
}

// Fail the build rather than shipping a file that misrepresents the site.
if (problems.length) {
  console.error("llms-full.txt: refusing to write.");
  for (const p of problems) console.error(`  ${p}`);
  process.exit(1);
}

const header = `# Ziiro AI, full site content

> Every page of ziiro.work as markdown, generated at build time from the same
> prerendered HTML a crawler receives, so this file cannot drift from the site.
> The link index is at ${BASE_URL}/llms.txt. Navigation and footer chrome is
> omitted because it repeats on every page; nothing else is removed.

Generated from ${indexable.length} routes.
`;

const out = `${header}\n${sections.join("\n\n---\n\n")}\n`;
writeFileSync(resolve(dist, "llms-full.txt"), out, "utf8");

const kb = (out.length / 1024).toFixed(1);
const totalWords = out.split(/\s+/).filter(Boolean).length;
console.log(
  `Generated llms-full.txt from ${indexable.length} prerendered routes (${kb} KB, ${totalWords} words).`,
);
