import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const css = readFileSync("src/index.css", "utf8");
const OLD_HOME: RegExp[] = [
  /\.cb-[a-z]/, /\.zo-[a-z]/, /\.glass-brain/, /\.directory-[a-z]/, /\.hero-scroll-dot/, /\.map-focus/, /\.neo-inset/,
  /\[data-(?:live|dragging|map-node|map-reveal|dir-dark|hero-reveal|hero-stage-fade)\b/,
  /@keyframes\s+(?:cb-reveal-failsafe|directory-[a-z-]+|hero-scroll-dot)\b/,
];

describe("src/index.css after the old homepage (D26)", () => {
  it.each(OLD_HOME.map((re) => [re.source, re] as const))("has no rule for %s", (_name, re) => {
    expect(css).not.toMatch(re);
  });

  it("keeps hero-drift-a and hero-drift-b, which PageAtmosphere uses", () => {
    expect(css).toMatch(/@keyframes\s+hero-drift-a\b/);
    expect(css).toMatch(/@keyframes\s+hero-drift-b\b/);
  });
});
