// (C) W16-I: the owner, "the color should stay within a plain thin line. it should not come out". The emissive mask
// fill reached onto the vertebra bodies as orange patches (worker-3's W16-C2 diagnosis), so it is off in both themes.
import { describe, expect, it } from "vitest";
import { LOOK } from "./look";

describe("the look's mask fill (W16-I)", () => {
  it.each(["light", "dark"] as const)("is off in %s, so no colour spills off the discs onto the bodies", (theme) => {
    expect(LOOK.themes[theme].maskFill.intensity).toBe(0);
  });
});
