// (C) W15-B, re-choreographed by W16-A: the one plan stage's scroll path. The owner (wave16.md W16-A): the hero keeps
// the full spine on the right; scrolling into the departments it dives (zoom, a little turn, a crossfade) into his
// close-up model, which then alternates sides per department while the text takes the other side.
import { describe, expect, it } from "vitest";
import type { DiscId } from "../../data/contract";
import { baseFraming, type Framing } from "../camera";
import { CLOSEUP } from "../closeup";
import {
  ACROSS, CLOSEUP_AIM, CROSSFADE, closeupSide, HERO_WORDS_GONE_AT, heroWordsOpacity, LEGEND_BACK_FULL_AT, legendOpacity, NEED_WORDS_FROM,
  NEED_WORDS_FULL_AT, needWordsOpacity, stageAnchors, stageAt, stageKeys, stageShown, WORDS_LEFT_FROM, WORDS_LEFT_FULL_AT,
  wordsLeftOpacity, type StageAnchor,
} from "./stagePath";

const DESKTOP_VIEW = { width: 1440, height: 816 };
const PHONE_VIEW = { width: 390, height: 410 };
const DISCS: DiscId[] = ["G04", "G05", "G06", "G01"];

/** How big the model shows on screen with this framing: the lens is the same for every key, so it goes as 1 / distance. */
const scaleOf = (f: Framing): number => 1 / Math.hypot(...f.position.map((v, i) => v - f.target[i]));
const gap = (a: Framing, b: Framing): number =>
  Math.hypot(...a.position.map((v, i) => v - b.position[i])) + Math.hypot(a.shift[0] - b.shift[0], a.shift[1] - b.shift[1]);

describe("the stage's keyframes (W16-A)", () => {
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
    expect(hero.closeup).toBe(0);
    expect(hero.turn).toBe(0);
    expect(hero.hold).toBe(0);
  });

  it("dives into the close-up at block 2: zoomed in on it, turned a little, fully crossfaded", () => {
    expect(need.closeup).toBe(1);
    expect(need.turn).not.toBe(0);
    // The close-up's vertebrae are about twice the full spine's (W16-C), so framing all of it at about the hero's
    // distance doubles a vertebra on screen.
    expect(scaleOf(need.framing)).toBeGreaterThanOrEqual(scaleOf(hero.framing));
    need.framing.target.forEach((v, i) => expect(v).toBeCloseTo(CLOSEUP_AIM[i], 6));
    expect(Math.hypot(...CLOSEUP_AIM.map((v, i) => v - CLOSEUP.pivot[i]))).toBeLessThan(0.2); // on the close-up
    expect(need.hold).toBe(1);
  });

  it("alternates the close-up per department: left, right with a little turn, left...", () => {
    expect(DISCS.map((_, i) => closeupSide(i))).toEqual(["left", "right", "left", "right"]);
    stops.forEach((stop, i) => {
      expect(stop.closeup).toBe(1);
      expect(stop.hold).toBe(1);
      expect(stop.across).toBe(closeupSide(i) === "left" ? ACROSS.desktop.left : ACROSS.desktop.right);
    });
    expect(stops[0].across).toBeLessThan(0.4);
    expect(stops[1].across).toBeGreaterThan(0.6);
    expect(stops[1].turn).not.toBe(stops[0].turn);
    expect(stops[2].turn).toBe(stops[0].turn);
    expect(stops[3].turn).toBe(stops[1].turn);
  });

  it("pulls back out to the full spine on the left at the close, with the text on the right", () => {
    expect(close.closeup).toBe(0);
    expect(close.turn).toBe(0);
    expect(close.hold).toBe(0);
    expect(close.across).toBe(ACROSS.desktop.left);
    expect(scaleOf(close.framing)).toBeLessThan(scaleOf(need.framing));
  });

  it("keeps a phone's close-up inside the band, alternating its offset", () => {
    const phone = stageKeys(DISCS, "phone", "phone", PHONE_VIEW, 0);
    expect(phone[0].across).toBe(0.5);
    const across = phone.slice(2, 2 + DISCS.length).map((k) => k.across);
    expect(across).toEqual([ACROSS.phone.left, ACROSS.phone.right, ACROSS.phone.left, ACROSS.phone.right]);
    across.forEach((a) => expect(Math.abs(a - 0.5)).toBeLessThanOrEqual(0.15));
    expect(phone[2].turn).not.toBe(phone[3].turn);
  });

  it("shows the phone band the whole spine in the hero (W15-B2)", () => {
    const [phoneHero] = stageKeys(DISCS, "phone", "phone", PHONE_VIEW, 56);
    expect(scaleOf(phoneHero.framing)).toBeLessThan(scaleOf(baseFraming("phone")));
  });
});

describe("the dive's crossfade is timed to the zoom (W16-A)", () => {
  const keys = stageKeys(DISCS, "desktop", "desktop", DESKTOP_VIEW, 84);
  const anchors: StageAnchor[] = [{ at: 0, key: keys[0] }, { at: 1000, key: keys[1] }];
  const at = (y: number) => stageAt(anchors, y, false, keys[0]);

  it("keeps the full spine over the start of the zoom, the close-up over its end", () => {
    expect(CROSSFADE.from).toBeGreaterThan(0);
    expect(CROSSFADE.to).toBeLessThan(1);
    expect(at(100).closeup).toBe(0);
    expect(at(950).closeup).toBe(1);
  });

  it("crossfades once, rising with the scroll, while the camera is still moving in", () => {
    const ws = Array.from({ length: 1001 }, (_, y) => at(y).closeup);
    ws.slice(1).forEach((w, i) => expect(w).toBeGreaterThanOrEqual(ws[i]));
    const start = ws.findIndex((w) => w > 0);
    const end = ws.findIndex((w) => w === 1);
    expect(start).toBeGreaterThan(200);
    expect(end).toBeLessThan(1000);
    expect(gap(at(start).framing, keys[1].framing)).toBeGreaterThan(0);
  });

  it("pulls back the same way at the close: the full spine fades back in as the camera leaves the close-up", () => {
    const back: StageAnchor[] = [{ at: 0, key: keys.at(-2)! }, { at: 1000, key: keys.at(-1)! }];
    expect(stageAt(back, 100, false, keys[0]).closeup).toBe(1);
    expect(stageAt(back, 950, false, keys[0]).closeup).toBe(0);
  });

  it("blends the turn with the camera", () => {
    const mid = at(500);
    expect(mid.turn).toBeCloseTo(keys[1].turn / 2, 5);
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
      expect(Math.abs(now.closeup - before.closeup)).toBeLessThan(0.02);
      expect(Math.abs(now.turn - before.turn)).toBeLessThan(0.01);
      before = now;
    }
  });

  it("goes straight from one department to the next, with no pull-back to the whole spine between (D30 dropped)", () => {
    const between = at(2 * 800 + 400);
    expect(between.closeup).toBe(1);
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

describe("the legend keeps off the words (W15-B4 M1, W16-A)", () => {
  it("shows on the hero and once the full spine stands left, and is gone while it travels", () => {
    expect(legendOpacity(ACROSS.desktop.hero, "desktop", 0)).toBe(1);
    [0.6, 0.5, NEED_WORDS_FROM, NEED_WORDS_FULL_AT].forEach((a) => expect(legendOpacity(a, "desktop", 0)).toBe(0));
    expect(legendOpacity(ACROSS.desktop.left, "desktop", 0)).toBe(1);
  });

  it("is gone over the close-up: it names the full spine's discs", () => {
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

  it("shows words on the left only once the close-up stands right, clear of the left column", () => {
    expect(wordsLeftOpacity(ACROSS.desktop.left, "desktop")).toBe(0);
    expect(wordsLeftOpacity(0.5, "desktop")).toBe(0);
    expect(wordsLeftOpacity(WORDS_LEFT_FROM, "desktop")).toBe(0);
    expect(wordsLeftOpacity(WORDS_LEFT_FULL_AT, "desktop")).toBe(1);
    expect(wordsLeftOpacity(ACROSS.desktop.right, "desktop")).toBe(1);
    // Never both sides at once: the close-up crossing the middle has words on neither side.
    expect(WORDS_LEFT_FROM).toBeGreaterThan(NEED_WORDS_FROM);
  });

  it("leaves the phone's words alone: the band sits between them", () => {
    expect(heroWordsOpacity(0.36, "phone")).toBe(1);
    expect(needWordsOpacity(0.74, "phone")).toBe(1);
    expect(wordsLeftOpacity(0.3, "phone")).toBe(1);
  });
});
