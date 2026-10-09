// (C) W15-B: the one plan stage's scroll path. The owner (wave15.md item 5): one spine that starts at the hero on the
// right and, as he scrolls into "Out of 137 jobs you need only N", travels to the left while zooming in.
import { describe, expect, it } from "vitest";
import type { DiscId } from "../../data/contract";
import { baseFraming, type Framing } from "../camera";
import { ACROSS, aimFraming, HERO_WORDS_GONE_AT, heroWordsOpacity, NEED_WORDS_FROM, NEED_WORDS_FULL_AT, needWordsOpacity, stageAims, stageAnchors, stageAt, stageKeys, type StageAnchor } from "./stagePath";
import { DISCS as ALL_DISCS } from "../../data/contract";
import { GAPS } from "../gaps";
import { tourFraming } from "./tour";

const DESKTOP_VIEW = { width: 1440, height: 816 };
const PHONE_VIEW = { width: 390, height: 410 };
const DISCS: DiscId[] = ["G04", "G05", "G06", "G01"];

/** How big the model shows on screen with this framing: the lens is the same for every key, so it goes as 1 / distance. */
const scaleOf = (f: Framing): number => 1 / Math.hypot(...f.position.map((v, i) => v - f.target[i]));
const gap = (a: Framing, b: Framing): number =>
  Math.hypot(...a.position.map((v, i) => v - b.position[i])) + Math.hypot(a.shift[0] - b.shift[0], a.shift[1] - b.shift[1]);

describe("the stage's keyframes (W15-B)", () => {
  it("puts the spine right in the hero, left from block 2 on, and zooms in from block 2 to each stop", () => {
    const aims = stageAims(DISCS, "desktop", "desktop");
    const [hero, need, ...rest] = aims;
    const stops = rest.slice(0, DISCS.length);
    const close = rest.at(-1)!;
    expect(hero.across).toBeGreaterThan(0.6);
    expect(need.across).toBeLessThan(0.4);
    stops.forEach((stop) => expect(stop.across).toBeLessThan(0.4));
    expect(need.height).toBeLessThan(hero.height);
    stops.forEach((stop) => expect(stop.height).toBeLessThan(need.height));
    expect(stops.map((stop) => stop.hold)).toEqual([1, 1, 1, 1]);
    expect([hero.hold, need.hold, close.hold]).toEqual([0, 0, 0]);
    expect(close.height).toBeGreaterThanOrEqual(need.height);
  });

  it("keeps the spine in the middle of a phone's band in the hero and in block 2", () => {
    const [hero, need] = stageAims(DISCS, "phone", "phone");
    expect(hero.across).toBe(0.5);
    expect(need.across).toBe(0.5);
  });

  it("frames a stop at the middle of a canvas exactly as the W14 tour did, so worker-4's callouts still fit", () => {
    const aim = { ...stageAims(DISCS, "desktop", "desktop")[2], across: 0.5 };
    const tour = tourFraming("G04", "desktop", DESKTOP_VIEW, 0);
    const framing = aimFraming(aim, "desktop", DESKTOP_VIEW, 0);
    expect(framing.position.map((v) => v.toFixed(6))).toEqual(tour.position.map((v) => v.toFixed(6)));
    expect(framing.target).toEqual(tour.target);
  });
});

describe("the hero keyframe is r17's own camera (W15-B)", () => {
  it("starts on desktop where the still and the viewer's first frame are, so the 3D arriving never jumps", () => {
    expect(stageKeys(DISCS, "desktop", "desktop", DESKTOP_VIEW, 84).keys[0].framing).toEqual(baseFraming("desktop"));
  });

  it("shows the phone band the whole spine in the hero, so block 2's zoom from it stays readable (W15-B2)", () => {
    // From r17's close crop, a 1.5 x zoom filled the 390 px band with two vertebrae and left no room for a callout.
    const { keys } = stageKeys(DISCS, "phone", "phone", PHONE_VIEW, 56);
    expect(scaleOf(keys[0].framing)).toBeLessThan(scaleOf(baseFraming("phone")));
    expect(keys[0].across).toBe(0.5);
  });

});


describe("block 2 zooms in as it slides (W15-B2)", () => {
  // The owner: "it should have a transition and zoom-in effect to the left side when i scroll". At 0.8 of the whole
  // spine the hero and block 2 showed the spine at the same size (manager's eye, W15-B shots 0 and 25).
  for (const [variant, view, strip] of [["desktop", DESKTOP_VIEW, 84], ["phone", PHONE_VIEW, 56]] as const) {
    it(`shows the spine 1.4 to 1.6 times its hero size at block 2 on ${variant}, framed on the lit discs`, () => {
      const { keys } = stageKeys(DISCS, variant, variant, view, strip);
      const zoom = scaleOf(keys[1].framing) / scaleOf(keys[0].framing);
      expect(zoom).toBeGreaterThanOrEqual(1.4);
      expect(zoom).toBeLessThanOrEqual(1.6);
      const lit = DISCS.map((d) => GAPS[ALL_DISCS.indexOf(d)].centre);
      const centroid = [0, 1, 2].map((i) => lit.reduce((sum, c) => sum + c[i], 0) / lit.length);
      keys[1].framing.target.forEach((v, i) => expect(v).toBeCloseTo(centroid[i], 6));
    });

    it(`flies further in at each stop than block 2 on ${variant}, and pulls back at the close`, () => {
      const { keys } = stageKeys(DISCS, variant, variant, view, strip);
      const step = variant === "desktop" ? 1.2 : 1;
      keys.slice(2, 2 + DISCS.length).forEach((stop) =>
        expect(scaleOf(stop.framing) / scaleOf(keys[1].framing)).toBeGreaterThanOrEqual(step - 1e-9));
      expect(scaleOf(keys.at(-1)!.framing)).toBeLessThan(scaleOf(keys[1].framing));
    });
  }
});

describe("scrubbing between keyframes (W15-B)", () => {
  const { keys, pulled } = stageKeys(DISCS, "desktop", "desktop", DESKTOP_VIEW, 0);
  const anchors: StageAnchor[] = keys.map((key, i) => ({ at: i * 800, key }));

  it("sits on each keyframe as its section reaches the line, and holds the ends past them", () => {
    anchors.forEach(({ at, key }) => expect(stageAt(anchors, at, false, pulled).framing).toEqual(key.framing));
    expect(stageAt(anchors, -500, false, pulled).framing).toEqual(keys[0].framing);
    expect(stageAt(anchors, 1e6, false, pulled).framing).toEqual(keys.at(-1)!.framing);
  });

  it("moves continuously, with no pop, over every pixel of the scroll", () => {
    // A pop is a step that isn't small next to the moves between keyframes (with the pull-back between stops).
    const moves = keys.slice(1).flatMap((key, i) => [gap(keys[i].framing, key.framing), gap(key.framing, pulled.framing)]);
    const total = Math.max(...moves);
    let before = stageAt(anchors, 0, false, pulled);
    for (let y = 1; y <= anchors.at(-1)!.at; y += 1) {
      const now = stageAt(anchors, y, false, pulled);
      expect(gap(before.framing, now.framing)).toBeLessThan(total / 100);
      expect(Math.abs(now.hold - before.hold)).toBeLessThan(0.01);
      before = now;
    }
  });

  it("pulls back to the whole spine between two stops (D30)", () => {
    const halfway = stageAt(anchors, 2 * 800 + 400, false, pulled);
    expect(halfway.framing).toEqual(pulled.framing);
    expect(halfway.hold).toBe(1);
  });

  it("turns to the side view as it reaches a stop, and lets the spin back after the last one", () => {
    expect(stageAt(anchors, 800, false, pulled).hold).toBe(0);
    expect(stageAt(anchors, 1200, false, pulled).hold).toBeGreaterThan(0);
    expect(stageAt(anchors, 1600, false, pulled).hold).toBe(1);
    expect(stageAt(anchors, anchors.at(-1)!.at, false, pulled).hold).toBe(0);
  });

  it("cuts from one keyframe to the next under reduced motion (§11.8)", () => {
    expect(stageAt(anchors, 1599, true, pulled).framing).toEqual(keys[1].framing);
    expect(stageAt(anchors, 1600, true, pulled).framing).toEqual(keys[2].framing);
    expect(stageAt(anchors, 1600, true, pulled).hold).toBe(1);
  });

  it("knows which stop is in view: the last keyframe reached, or none outside the stops", () => {
    expect(stageAt(anchors, 100, false, pulled).stop).toBeNull();
    expect(stageAt(anchors, 1700, false, pulled).stop).toBe("G04");
    expect(stageAt(anchors, 2500, false, pulled).stop).toBe("G05");
    expect(stageAt(anchors, anchors.at(-1)!.at, false, pulled).stop).toBeNull();
  });

  it("frames a phone's band with its own lens window", () => {
    const phone = stageKeys(DISCS, "phone", "phone", PHONE_VIEW, 56);
    expect(phone.keys).toHaveLength(DISCS.length + 3);
    expect(phone.keys[2].framing.target).toEqual(tourFraming("G04", "phone", PHONE_VIEW, 56).target);
  });
});

describe("holding a keyframe while its section is read (W15-B)", () => {
  const { keys, pulled } = stageKeys(DISCS, "desktop", "desktop", DESKTOP_VIEW, 0);

  it("sits still on a keyframe between its arrival and departure, with no pull-back", () => {
    const anchors: StageAnchor[] = [
      { at: 0, key: keys[2] },
      { at: 1000, key: keys[2] },
      { at: 1400, key: keys[3] },
    ];
    expect(stageAt(anchors, 500, false, pulled)).toBe(keys[2]);
    expect(stageAt(anchors, 1200, false, pulled).framing).toEqual(pulled.framing);
  });

  it("carries where the spine stands across the stage, blended with the camera, for the still to follow", () => {
    expect(keys[0].across).toBe(ACROSS.desktop.hero);
    expect(keys[1].across).toBe(ACROSS.desktop.left);
    const anchors: StageAnchor[] = [{ at: 0, key: keys[0] }, { at: 100, key: keys[1] }];
    const mid = stageAt(anchors, 50, false, pulled).across;
    expect(mid).toBeCloseTo((ACROSS.desktop.hero + ACROSS.desktop.left) / 2, 5);
  });
});

describe("anchoring the keyframes to the page (W15-B)", () => {
  const { keys } = stageKeys(DISCS, "desktop", "desktop", DESKTOP_VIEW, 0);
  /** Block 2 at 900, each stop 1000 tall after it, the close last. */
  const spans = [{ top: 900, bottom: 1900 }, ...DISCS.map((_, i) => ({ top: 1900 + 1000 * i, bottom: 2900 + 1000 * i })), { top: 5900, bottom: 6600 }];

  it("arrives at each keyframe as its section reaches the reading line, and leaves one travel before the next", () => {
    const anchors = stageAnchors(keys, spans, 400, 300);
    expect(anchors.map((a) => a.at)).toEqual([0, 200, 500, 1200, 1500, 2200, 2500, 3200, 3500, 4200, 4500, 5200, 5500]);
    expect(anchors.map((a) => keys.indexOf(a.key))).toEqual([0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6]);
  });

  it("never runs backwards when a section is shorter than the travel or starts above the line", () => {
    const anchors = stageAnchors(keys, [{ top: 100, bottom: 200 }, ...spans.slice(1)], 400, 300);
    anchors.slice(1).forEach((a, i) => expect(a.at).toBeGreaterThanOrEqual(anchors[i].at));
  });
});

describe("the hero's words make way for the spine (W15-B3)", () => {
  // Manager's eye on the W15-B2 strip at 8-16 %: the hero stats (137 / 33 / 7) were still on screen while the spine
  // swept left across them, and 33 vanished behind it. The spine must never cross text.
  it("shows the hero's left column fully while the spine stands in the hero", () => {
    expect(heroWordsOpacity(ACROSS.desktop.hero, "desktop")).toBe(1);
  });

  it("fades it out over the start of the travel, gone before the spine's left edge reaches the 55 % column", () => {
    const mid = (ACROSS.desktop.hero + HERO_WORDS_GONE_AT) / 2;
    expect(heroWordsOpacity(mid, "desktop")).toBeCloseTo(0.5, 5);
    expect(heroWordsOpacity(HERO_WORDS_GONE_AT, "desktop")).toBe(0);
    expect(heroWordsOpacity(ACROSS.desktop.left, "desktop")).toBe(0);
    // The spine is about a fifth of the stage wide: its left edge is still right of the column when the words are gone.
    expect(HERO_WORDS_GONE_AT - 0.1).toBeGreaterThanOrEqual(0.5);
  });

  it("leaves the phone's words alone: the band sits between them and the spine never crosses them", () => {
    expect(heroWordsOpacity(0.36, "phone")).toBe(1);
    expect(needWordsOpacity(0.74, "phone")).toBe(1);
  });

  it("shows block 2's words only once the spine's right edge has cleared the right column", () => {
    // The 46 % column's text starts at about 0.57 of the width; the spine reaches about 0.12 right of where it stands.
    expect(needWordsOpacity(ACROSS.desktop.hero, "desktop")).toBe(0);
    expect(needWordsOpacity(NEED_WORDS_FROM, "desktop")).toBe(0);
    expect(needWordsOpacity(NEED_WORDS_FULL_AT, "desktop")).toBe(1);
    expect(needWordsOpacity(ACROSS.desktop.left, "desktop")).toBe(1);
    expect(NEED_WORDS_FROM + 0.12).toBeLessThanOrEqual(0.57 + 1e-9);
  });
});
