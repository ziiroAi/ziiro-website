// Build-time static prerender (pure Node, Vercel-safe).
// Renders each route with React renderToString + Helmet server extraction,
// then writes real HTML + per-route meta into dist/<route>/index.html.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const distDir = resolve(root, "dist");

const { render } = await import(
  pathToFileURL(resolve(root, "dist-ssr/entry-server.js")).href
);

const template = readFileSync(resolve(distDir, "index.html"), "utf8");

// Per-route-varying tags the template ships as defaults — Helmet emits the
// correct per-route versions, so strip these to avoid duplicates.
const STRIP = [
  /<title>[\s\S]*?<\/title>\s*/i,
  /<meta name="description"[^>]*>\s*/i,
  /<meta property="og:title"[^>]*>\s*/i,
  /<meta property="og:description"[^>]*>\s*/i,
  /<meta property="og:url"[^>]*>\s*/i,
  /<meta name="twitter:title"[^>]*>\s*/i,
  /<meta name="twitter:description"[^>]*>\s*/i,
];

const routes = [
  "/",
  "/mission",
  "/products",
  "/process",
  "/audit",
  "/contact",
  "/pricing",
  "/privacy",
  "/terms",
];

let ok = 0;
for (const url of routes) {
  try {
    const { appHtml, head } = render(url);

    let html = template;
    for (const re of STRIP) html = html.replace(re, "");
    html = html.replace("</head>", `    ${head}\n  </head>`);
    html = html.replace(
      '<div id="root"></div>',
      `<div id="root">${appHtml}</div>`,
    );

    const outPath =
      url === "/"
        ? resolve(distDir, "index.html")
        : resolve(distDir, `.${url}/index.html`);
    mkdirSync(dirname(outPath), { recursive: true });
    writeFileSync(outPath, html);
    const kb = (appHtml.length / 1024).toFixed(1);
    console.log(`  prerendered ${url.padEnd(10)} (${kb} KB content)`);
    ok++;
  } catch (err) {
    console.error(`  FAILED ${url}:`, err.message);
  }
}
console.log(`Prerendered ${ok}/${routes.length} routes.`);
if (ok < routes.length) process.exit(1);
