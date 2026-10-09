// (C) W15-B, re-choreographed by W16-A and W17-S: the one plan stage's scroll path. The owner (wave17.md): no close-up
// any more; the big spine alone zooms to each department's disc with a little turn, alternating sides, while the text
// takes the other side.
import { describe, expect, it } from "vitest";
import { DISCS as ALL_DISCS, type DiscId } from "../../data/contract";
import { baseFraming, type Framing } from "../camera";
import { GAPS } from "../gaps";
import {
  ACROSS, HERO_WORDS_GONE_AT, heroWordsOpacity, LEGEND_BACK_FULL_AT, legendOpacity, NEED_WORDS_FROM,
  NEED_WORDS_FULL_AT, needWordsOpacity, stageAnchors, stageAt, stageKeys, stageShown, STOP_VIEW_HEIGHT, stopSide,
  WORDS_LEFT_FROM, WORDS_LEFT_FULL_AT, wordsLeftOpacity, type StageAnchor,
} from "./stagePath";

const DESKTOP_VIEW = { width: 1440, height: 816 };
const PHONE_VIEW = { width: 390, height: 410 };
const DISCS: DiscId[] = ["G04", "G05", "G06", "G01"];

/** How big the model shows on screen with this framing: the lens is the same for every key, so it goes as 1 / distance. */
const scaleOf = (f: Framing): number => 1 / Math.hypot(...f.position.map((v, i) => v - f.target[i]));
const gap = (a: Framing, b: Framing): number =>
  Math.hypot(...a.position.map((v, i) => v - b.position[i])) + Math.hypot(a.shift[0] - b.shift[0], a.shift[1] - b.shift[1]);
const discCentre = (disc: DiscId) => GAPS[ALL_DISCS.indexOf(disc)].centre;
/** The full spine's mean distance between neighbouring discs: one vertebra. */
const VERTEBRA = Math.hypot(...GAPS[GAPS.length - 1].centre.map((v, i) => v - GAPS[0].centre[i])) / (GAPS.length - 1);

describe("the stage's keyframes (W17-S: the big spine only)", () => {
  const keys = stageKeys(DISCS, "desktop", "desktop", DESKTOP_VIEW, 84);
  const [hero, need, ...rest] = keys;
  const stops = rest.slice(0, DISCS.length);
  const close = rest.at(-1)!;

  it("has the hero, block 2, one key per department and the close", () => {
    expect(keys).toHaveLength(DISCS.length + 3);
    expect(stops.map((s) => s.stop)).toEqual(DISCS);
  });

  it("shows the full spine on the right in the hero, at r17's own camera, with no turn", () => {
    expect(hero.framing).toEqual(baseFraming("desktop"));
    expect(hero.across).toBe(ACROSS.desktop.hero);
    expect(hero.zoomed).toBe(0);
    expect(hero.turn).toBe(0);
    expect(hero.hold).toBe(0);
  });

  it("travels left at block 2 and zooms in a little, the full spine still whole enough for its legend", () => {
    expect(need.across).toBe(ACROSS.desktop.need);
    expect(need.zoomed).toBe(0);
    expect(scaleOf(need.framing)).toBeGreaterThan(scaleOf(hero.framing));
  });

  it("zooms each department in on its own disc on the big spine, 2-3 vertebrae around it", () => {
    stops.forEach((stop, i) => {
      stop.framing.target.forEach((v, k) => expect(v).toBeCloseTo(discCentre(DISCS[i])[k], 6));
      expect(scaleOf(stop.framing)).toBeGreaterThan(scaleOf(need.framing));
      expect(stop.zoomed).toBe(1);
      expect(stop.hold).toBe(1);
    });
    expect(STOP_VIEW_HEIGHT.desktop / VERTEBRA).toBeGreaterThanOrEqual(3);
    expect(STOP_VIEW_HEIGHT.desktop / VERTEBRA).toBeLessThanOrEqual(5);
  });

  it("alternates sides per department: left, then right, left..., with a little turn that differs per side", () => {
    expect(DISCS.map((_, i) => stopSide(i))).toEqual(["left", "right", "left", "right"]);
    stops.forEach((stop, i) => expect(stop.across).toBe(stopSide(i) === "left" ? ACROSS.desktop.left : ACROSS.desktop.right));
    expect(stops[0].across).toBeLessThan(0.4);
    expect(stops[1].across).toBeGreaterThan(0.6);
    expect(stops[0].turn).not.toBe(0);
    expect(stops[1].turn).not.toBe(stops[0].turn);
    expect(stops[2].turn).toBe(stops[0].turn);
    expect(stops[3].turn).toBe(stops[1].turn);
  });

  it("pulls back out to the whole spine on the left at the close, with the text on the right", () => {
    expect(close.zoomed).toBe(0);
    expect(close.turn).toBe(0);
    expect(close.hold).toBe(0);
    expect(close.across).toBe(ACROSS.desktop.close);
    expect(scaleOf(close.framing)).toBeLessThan(scaleOf(stops[0].framing));
  });

  it("keeps a phone's stops inside the band, alternating their offset and turn", () => {
    const phone = stageKeys(DISCS, "phone", "phone", PHONE_VIEW, 0);
    expect(phone[0].across).toBe(0.5);
    const across = phone.slice(2, 2 + DISCS.length).map((k) => k.across);
    expect(across).toEqual([ACROSS.phone.left, ACROSS.phone.right, ACROSS.phone.left, ACROSS.phone.right]);
    across.forEach((a) => expect(Math.abs(a - 0.5)).toBeLessThanOrEqual(0.15));
    expect(phone[2].turn).not.toBe(phone[3].turn);
    phone.slice(2, 2 + DISCS.length).forEach((k, i) =>
      k.framing.target.forEach((v, j) => expect(v).toBeCloseTo(discCentre(DISCS[i])[j], 6)));
  });

  it("shows the phone band the whole spine in the hero (W15-B2)", () => {
    const [phoneHero] = stageKeys(DISCS, "phone", "phone", PHONE_VIEW, 56);
    expect(scaleOf(phoneHero.framing)).toBeLessThan(scaleOf(baseFraming("phone")));
  });
});

describe("the zoom into a department blends with the camera (W17-S)", () => {
  const keys = stageKeys(DISCS, "desktop", "desktop", DESKTOP_VIEW, 84);
  const anchors: StageAnchor[] = [{ at: 0, key: keys[1] }, { at: 1000, key: keys[2] }];
  const at = (y: number) => stageAt(anchors, y, false, keys[0]);

  it("rises once with the scroll, from 0 at block 2 to 1 at the stop", () => {
    const ws = Array.from({ length: 1001 }, (_, y) => at(y).zoomed);
    ws.slice(1).forEach((w, i) => expect(w).toBeGreaterThanOrEqual(ws[i]));
    expect(ws[0]).toBe(0);
    expect(ws[1000]).toBe(1);
  });

  it("blends the turn with the camera", () => {
    expect(at(500).turn).toBeCloseTo(keys[2].turn / 2, 5);
  });
});

describe("scrubbing between keyframes (W15-B)", () => {
  const keys = stageKeys(DISCS, "desktop", "desktop", DESKTOP_VIEW, 0);
  const anchors: StageAnchor[] = keys.map((key, i) => ({ at: i * 800, key }));
  const at = (y: number, reduced = false) => stageAt(anchors, y, reduced, keys[0]);

  it("sits on each keyframe as its section reaches the line, and holds the ends past them", () => {
    anchors.forEach(({ at: y, key }) => expect(at(y).framing).toEqual(key.framing));
    expect(at(-500).framing).toEqual(keys[0].framing);
    expect(at(1e6).framing).toEqual(keys.at(-1)!.framing);
  });

  it("returns the fallback before anything is measured", () => {
    expect(stageAt([], 300, false, keys[0])).toBe(keys[0]);
  });

  it("moves continuously, with no pop, over every pixel of the scroll", () => {
    const total = Math.max(...keys.slice(1).map((key, i) => gap(keys[i].framing, key.framing)));
    let before = at(0);
    for (let y = 1; y <= anchors.at(-1)!.at; y += 1) {
      const now = at(y);
      expect(gap(before.framing, now.framing)).toBeLessThan(total / 100);
      expect(Math.abs(now.hold - before.hold)).toBeLessThan(0.01);
      expect(Math.abs(now.zoomed - before.zoomed)).toBeLessThan(0.02);
      expect(Math.abs(now.turn - before.turn)).toBeLessThan(0.01);
      before = now;
    }
  });

  it("goes straight from one department to the next, with no pull-back to the whole spine between (D30 dropped)", () => {
    const between = at(2 * 800 + 400);
    expect(between.zoomed).toBe(1);
    expect(between.across).toBeCloseTo((keys[2].across + keys[3].across) / 2, 5);
  });

  it("knows which stop is in view: the last keyframe reached, or none outside the stops", () => {
    expect(at(100).stop).toBeNull();
    expect(at(1700).stop).toBe("G04");
    expect(at(2500).stop).toBe("G05");
    expect(at(anchors.at(-1)!.at).stop).toBeNull();
  });
});

describe("anchoring the keyframes to the page (W15-B)", () => {
  const keys = stageKeys(DISCS, "desktop", "desktop", DESKTOP_VIEW, 0);
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

describe("reduced motion cuts at the start of each travel (W15-B4 M3)", () => {
  const keys = stageKeys(DISCS, "desktop", "desktop", DESKTOP_VIEW, 0);
  const spans = [{ top: 900, bottom: 1900 }, ...DISCS.map((_, i) => ({ top: 1900 + 1000 * i, bottom: 2900 + 1000 * i })), { top: 5900, bottom: 6600 }];
  const anchors = stageAnchors(keys, spans, 400, 300); // the hero leaves at 200, block 2 arrives at 500

  it("holds the hero until its travel starts, then shows block 2's keyframe at once", () => {
    expect(stageAt(anchors, 199, true, keys[0])).toBe(keys[0]);
    expect(stageAt(anchors, 200, true, keys[0])).toBe(keys[1]);
    expect(stageAt(anchors, 500, true, keys[0])).toBe(keys[1]);
  });

  it("cuts straight from one stop to the next", () => {
    expect(stageAt(anchors, 2199, true, keys[0])).toBe(keys[2]);
    expect(stageAt(anchors, 2200, true, keys[0])).toBe(keys[3]);
  });
});

describe("the legend keeps off the words (W15-B4 M1, W17-S)", () => {
  it("shows on the hero and once the full spine stands left, and is gone while it travels", () => {
    expect(legendOpacity(ACROSS.desktop.hero, "desktop", 0)).toBe(1);
    [0.6, 0.5, NEED_WORDS_FROM, NEED_WORDS_FULL_AT].forEach((a) => expect(legendOpacity(a, "desktop", 0)).toBe(0));
    expect(legendOpacity(ACROSS.desktop.left, "desktop", 0)).toBe(1);
  });

  it("is gone at a zoomed department stop: it names the whole spine's discs, and the spine may stand right", () => {
    expect(legendOpacity(ACROSS.desktop.left, "desktop", 1)).toBe(0);
    expect(legendOpacity(ACROSS.desktop.right, "desktop", 1)).toBe(0);
    expect(legendOpacity(ACROSS.desktop.left, "desktop", 0.5)).toBeCloseTo(0.5, 5);
  });

  it("comes back only after block 2's words are fully in", () => {
    expect(LEGEND_BACK_FULL_AT).toBeLessThan(NEED_WORDS_FULL_AT);
    expect(LEGEND_BACK_FULL_AT).toBeGreaterThan(ACROSS.desktop.left);
  });

  it("always shows on a phone", () => {
    expect(legendOpacity(0.5, "phone", 1)).toBe(1);
  });
});

describe("the legend leaves with the stage at the end of the plan (W15-B4, worker-4's W15-S LOW 3)", () => {
  it("shows fully while the stage is stuck, the plan's end at or below the screen's bottom", () => {
    expect(stageShown(900, 900)).toBe(1);
    expect(stageShown(1400, 900)).toBe(1);
  });

  it("is gone once the plan's end has risen a quarter of the screen", () => {
    expect(stageShown(900 * 0.75, 900)).toBe(0);
    expect(stageShown(100, 900)).toBe(0);
    expect(stageShown(900 * 0.875, 900)).toBeCloseTo(0.5, 5);
  });
});

describe("the words make way for the spine on either side (W15-B3, W16-A)", () => {
  it("shows the hero's left column fully while the spine stands in the hero, and fades it as it sets off", () => {
    expect(heroWordsOpacity(ACROSS.desktop.hero, "desktop")).toBe(1);
    expect(heroWordsOpacity((ACROSS.desktop.hero + HERO_WORDS_GONE_AT) / 2, "desktop")).toBeCloseTo(0.5, 5);
    expect(heroWordsOpacity(HERO_WORDS_GONE_AT, "desktop")).toBe(0);
    expect(heroWordsOpacity(ACROSS.desktop.left, "desktop")).toBe(0);
  });

  it("shows words on the right only once the spine has cleared the right column", () => {
    expect(needWordsOpacity(ACROSS.desktop.right, "desktop")).toBe(0);
    expect(needWordsOpacity(NEED_WORDS_FROM, "desktop")).toBe(0);
    expect(needWordsOpacity(NEED_WORDS_FULL_AT, "desktop")).toBe(1);
    expect(needWordsOpacity(ACROSS.desktop.left, "desktop")).toBe(1);
  });

  it("shows words on the left only once the spine stands right, clear of the left column", () => {
    expect(wordsLeftOpacity(ACROSS.desktop.left, "desktop")).toBe(0);
    expect(wordsLeftOpacity(0.5, "desktop")).toBe(0);
    expect(wordsLeftOpacity(WORDS_LEFT_FROM, "desktop")).toBe(0);
    expect(wordsLeftOpacity(WORDS_LEFT_FULL_AT, "desktop")).toBe(1);
    expect(wordsLeftOpacity(ACROSS.desktop.right, "desktop")).toBe(1);
    // Never both sides at once: the spine crossing the middle has words on neither side.
    expect(WORDS_LEFT_FROM).toBeGreaterThan(NEED_WORDS_FROM);
  });

  it("leaves the phone's words alone: the band sits between them", () => {
    expect(heroWordsOpacity(0.36, "phone")).toBe(1);
    expect(needWordsOpacity(0.74, "phone")).toBe(1);
    expect(wordsLeftOpacity(0.3, "phone")).toBe(1);
  });
});
