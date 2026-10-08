// (C) Lighthouse mobile on `/`, three runs, gated on the median (spec §13.10). L-T1 step 3.
//   npm run perf:home -- https://<the dev Preview host>/
//   npm run perf:home -- http://localhost:4176/ --throttling-method=devtools
// The gate that counts is the dev Preview, on Lighthouse's default (simulated) throttling.
// On localhost, use --throttling-method=devtools: the bundle lands before the first contentful frame there, so
// the simulation puts all of the JS ahead of FCP and its LCP can't pass by construction (worker-1, 8 Oct).
// Flags after the URL go to Lighthouse as they are.
// A Preview behind Vercel's login needs VERCEL_AUTOMATION_BYPASS_SECRET for this one command. Div sends it
// privately (00-index §1.5, request 7); it never goes into a file or GitHub.
import { execFileSync } from "node:child_process";

const RUNS = 3;
const GATES = { lcpMs: 2_000, cls: 0.02, performance: 0.9 };
const url = process.argv.slice(2).find((a) => !a.startsWith("--")) ?? "http://localhost:4173/";
const lighthouseFlags = process.argv.slice(2).filter((a) => a.startsWith("--"));
const bypass = process.env.VERCEL_AUTOMATION_BYPASS_SECRET;
/**
 * The LCP must be the greeting: the S0 <h1>, or the greeting line above it, <p class="f-intro-greet">
 * (manager ruling 12:36). The line is the greeting's own first words, so either one means it painted first.
 */
const GREETING_TAG = /^<(h1\b|p\b[^>]*\bclass="[^"]*\bf-intro-greet\b)/;

/**
 * The LCP element's opening tag. Lighthouse 13 dropped the largest-contentful-paint-element audit;
 * the element is now the node item in lcp-breakdown-insight's list.
 */
function lcpElement(lhr) {
  const insight = lhr.audits["lcp-breakdown-insight"];
  if (!insight) {
    console.error(`Lighthouse ${lhr.lighthouseVersion} has no lcp-breakdown-insight audit, so the gate can't tell which element is the LCP (§13.10)`);
    process.exit(1);
  }
  const node = (insight.details?.items ?? []).find((item) => item.type === "node");
  return node?.snippet;
}

/**
 * Lighthouse 13.5 names no LCP node under --throttling-method=devtools, and now and then not under the
 * simulation either (8 Oct: 3 of 3 devtools runs, 1 of 3 simulated). Then the browser names it: one load in
 * Playwright's Chromium with the run's own screen, network and CPU settings, reading the opening tag of the
 * last largest-contentful-paint entry's element. Same tag format as Lighthouse's snippet.
 */
async function lcpElementInBrowser(settings) {
  const { chromium } = await import("playwright");
  const browser = await chromium.launch();
  try {
    const { width, height, deviceScaleFactor, mobile } = settings.screenEmulation;
    const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor, isMobile: mobile });
    if (bypass) await page.setExtraHTTPHeaders({ "x-vercel-protection-bypass": bypass });
    const cdp = await page.context().newCDPSession(page);
    const t = settings.throttling;
    await cdp.send("Network.enable");
    await cdp.send("Network.emulateNetworkConditions", {
      offline: false,
      latency: t.requestLatencyMs,
      downloadThroughput: (t.downloadThroughputKbps * 1024) / 8,
      uploadThroughput: (t.uploadThroughputKbps * 1024) / 8,
    });
    await cdp.send("Emulation.setCPUThrottlingRate", { rate: t.cpuSlowdownMultiplier });
    await page.addInitScript(() => {
      new PerformanceObserver((list) => {
        const element = list.getEntries().at(-1)?.element;
        window.__lcpTag = element ? element.outerHTML.match(/^<[^>]*>/)[0] : undefined;
      }).observe({ type: "largest-contentful-paint", buffered: true });
    });
    await page.goto(url, { waitUntil: "networkidle" });
    return await page.evaluate(() => window.__lcpTag);
  } finally {
    await browser.close();
  }
}

async function run() {
  const args = ["--yes", "lighthouse@13.5.0", url, "--output=json", "--output-path=stdout", "--quiet",
    "--only-categories=performance", "--chrome-flags=--headless=new"];
  if (bypass) args.push(`--extra-headers=${JSON.stringify({ "x-vercel-protection-bypass": bypass })}`);
  args.push(...lighthouseFlags);
  const lhr = JSON.parse(execFileSync("npx", args, { maxBuffer: 64 * 1024 * 1024 }).toString());
  const fromLighthouse = lcpElement(lhr);
  const lcp = fromLighthouse ?? (await lcpElementInBrowser(lhr.configSettings)) ?? "(no element reported)";
  return {
    throttlingMethod: lhr.configSettings.throttlingMethod,
    lcpMs: lhr.audits["largest-contentful-paint"].numericValue,
    cls: lhr.audits["cumulative-layout-shift"].numericValue,
    tbtMs: lhr.audits["total-blocking-time"].numericValue,
    performance: lhr.categories.performance.score,
    lcpElement: lcp,
    lcpElementFrom: fromLighthouse ? "lighthouse" : "browser",
    lcpIsGreeting: GREETING_TAG.test(lcp),
  };
}

const median = (xs) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)];
const runs = [];
for (let i = 0; i < RUNS; i++) runs.push(await run());
const result = Object.fromEntries(["lcpMs", "cls", "tbtMs", "performance"].map((k) => [k, median(runs.map((r) => r[k]))]));
console.log(JSON.stringify({ url, median: result, runs }, null, 2));

const failures = [
  result.lcpMs > GATES.lcpMs && `LCP ${Math.round(result.lcpMs)} ms is over ${GATES.lcpMs} ms`,
  result.cls > GATES.cls && `CLS ${result.cls.toFixed(3)} is over ${GATES.cls}`,
  result.performance < GATES.performance && `performance ${result.performance} is under ${GATES.performance}`,
  !runs.every((r) => r.lcpIsGreeting) && `the LCP element isn't the greeting in every run (§13.10, ruling 12:36): ${runs.map((r) => r.lcpElement).join(", ")}`,
].filter(Boolean);
if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}
console.log("Lighthouse gates pass (§13.10)");
