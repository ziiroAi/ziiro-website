import { describe, expect, it } from "vitest";
import { reachable } from "../helpers/imports";

/** Mounted in App.tsx and used by no page: about 44 KB gz on every first load (measured 8 Oct). */
const UNUSED_PROVIDERS = ["@tanstack/react-query", "@radix-ui/react-tooltip", "@radix-ui/react-toast", "sonner"];
/** §13.10: "No WebGL, Spline, framer-motion or Preloader on `/`". */
const NEVER_ON_HOME = ["ogl", "@splinetool/runtime", "framer-motion"];

describe("the app shell, which every page loads before it paints", () => {
  const shell = reachable(["src/main.tsx"]);
  it.each(UNUSED_PROVIDERS)("leaves out %s", (pkg) => {
    expect([...shell.packages]).not.toContain(pkg);
  });
});

describe("everything / can load, the plan included (§13.10)", () => {
  const home = reachable(
    ["src/main.tsx", "src/pages/Index.tsx"],
    ["src/pages/Index.tsx", "src/features/funnel/", "src/features/home/sections/"],
  );
  it.each(NEVER_ON_HOME)("never reaches %s", (pkg) => {
    expect([...home.packages]).not.toContain(pkg);
  });
  it("never reaches the Preloader", () => {
    expect([...home.files].filter((f) => f.includes("Preloader"))).toEqual([]);
  });
});
