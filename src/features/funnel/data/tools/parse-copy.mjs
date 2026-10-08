// Reads the tables in .team/ziiro-fleet/funnel/copy.md into a Map from copy ID to text.
// A plain row gives its "Line" cell. A department row gives <id>.heading, .tag, .why and .words.
// An agent row gives <id>.name, <id>.line (without its trailing "●") and <id>.json, the agents-33.json id.
const cells = (row) => row.trim().replace(/^\|/, "").replace(/\|$/, "").split("|").map((c) => c.trim());
const unTick = (s) => s.replace(/^`|`$/g, "");
const COPY_ID = /^[a-z][a-z0-9-]*(\.[A-Za-z0-9_-]+)+$/;

export function parseCopy(md) {
  const lines = md.split("\n");
  const out = new Map();
  for (let i = 0; i + 1 < lines.length; i++) {
    if (!lines[i].startsWith("|") || !/^\|\s*-/.test(lines[i + 1])) continue;
    const head = cells(lines[i]).map((h) => h.toLowerCase());
    const col = (name) => head.indexOf(name);
    const idCol = col("id");
    if (idCol < 0) continue;
    const whyCol = head.findIndex((h) => h.startsWith("why you need this"));
    const wordsCol = head.findIndex((h) => h.startsWith("with their words"));
    const isAgent = head.includes("plain name");
    const lineCol = col("line");
    for (let r = i + 2; r < lines.length && lines[r].startsWith("|"); r++) {
      const c = cells(lines[r]);
      const id = unTick(c[idCol] ?? "");
      if (!COPY_ID.test(id)) continue;
      if (whyCol >= 0) {
        out.set(`${id}.heading`, c[col("heading")]);
        out.set(`${id}.tag`, c[col("tag")]);
        out.set(`${id}.why`, c[whyCol]);
        out.set(`${id}.words`, c[wordsCol]);
      } else if (isAgent) {
        out.set(`${id}.name`, c[col("plain name")]);
        out.set(`${id}.line`, c[lineCol].replace(/\s*●\s*$/, ""));
        out.set(`${id}.json`, c[col("json id")]);
      } else if (lineCol >= 0) {
        out.set(id, c[lineCol]);
      }
    }
  }
  return out;
}
