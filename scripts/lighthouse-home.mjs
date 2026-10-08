// (C) Lighthouse mobile on `/`, three runs, gated on the median (spec §13.10). L-T1 step 3.
//   npm run perf:home -- https://<the dev Preview host>/
// A Preview behind Vercel's login needs VERCEL_AUTOMATION_BYPASS_SECRET for this one command. Div sends it
// privately (00-index §1.5, request 7); it never goes into a file or GitHub.
import { execFileSync } from "node:child_process";

const RUNS = 3;
const GATES = { lcpMs: 2_000, cls: 0.02, performance: 0.9 };
const url = process.argv[2] ?? "http://localhost:4173/";
const bypass = process.env.VERCEL_AUTOMATION_BYPASS_SECRET;

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
  return node?.snippet ?? "(no element reported)";
}

function run() {
  const args = ["--yes", "lighthouse@13.5.0", url, "--output=json", "--output-path=stdout", "--quiet",
    "--only-categories=performance", "--chrome-flags=--headless=new"];
  if (bypass) args.push(`--extra-headers=${JSON.stringify({ "x-vercel-protection-bypass": bypass })}`);
  const lhr = JSON.parse(execFileSync("npx", args, { maxBuffer: 64 * 1024 * 1024 }).toString());
  const lcp = lcpElement(lhr);
  return {
    lcpMs: lhr.audits["largest-contentful-paint"].numericValue,
    cls: lhr.audits["cumulative-layout-shift"].numericValue,
    tbtMs: lhr.audits["total-blocking-time"].numericValue,
    performance: lhr.categories.performance.score,
    lcpElement: lcp,
    lcpIsH1: lcp.startsWith("<h1"),
  };
}

const median = (xs) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)];
const runs = Array.from({ length: RUNS }, run);
const result = Object.fromEntries(["lcpMs", "cls", "tbtMs", "performance"].map((k) => [k, median(runs.map((r) => r[k]))]));
console.log(JSON.stringify({ url, median: result, runs }, null, 2));

const failures = [
  result.lcpMs > GATES.lcpMs && `LCP ${Math.round(result.lcpMs)} ms is over ${GATES.lcpMs} ms`,
  result.cls > GATES.cls && `CLS ${result.cls.toFixed(3)} is over ${GATES.cls}`,
  result.performance < GATES.performance && `performance ${result.performance} is under ${GATES.performance}`,
  !runs.every((r) => r.lcpIsH1) && `the LCP element isn't the greeting's <h1> in every run (§13.10): ${runs.map((r) => r.lcpElement).join(", ")}`,
].filter(Boolean);
if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}
console.log("Lighthouse gates pass (§13.10)");
