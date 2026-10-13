import { describe, expect, it, vi } from "vitest";
import type { DiscBox, SpineViewerApi } from "../api";
import { framingFor, visibleTan } from "../camera";
import { GAPS } from "../gaps";
import { LOOK } from "../look";
import { byFocus, calloutInputs, CALLOUT_RIGHT_MARGIN_PX, END_MARGIN, flightTargets, KEEP_OUT_PAD_PX, PROCESS_REACH, runFlights, screenDisc, spineBands, STOP_ACROSS, STOP_HEIGHT, stopForDepth, targetFor, tourFraming, CALLOUT_SIZE } from "./tour";
import { length, normalize, sub, type Vec3 } from "./vec";

const box = (over: Partial<DiscBox> = {}): DiscBox => ({
  disc: "G04", left: 100, top: 200, width: 80, height: 30, anchor: { x: 180, y: 206 }, onScreen: true, ...over,
});

describe("flightTargets: the camera moves between two stops (§6.2 block 3, D30)", () => {
  it("pulls back to the full spine between two close-ups", () => {
    expect(flightTargets("G04", "G05", false)).toEqual([{ kind: "overview" }, { kind: "disc", disc: "G05" }]);
  });

  it("cuts straight from close-up to close-up under reduced motion (§11.8)", () => {
    expect(flightTargets("G04", "G05", true)).toEqual([{ kind: "disc", disc: "G05" }]);
  });

  it("flies straight in from the overview, and straight out to it", () => {
    expect(flightTargets(null, "G04", false)).toEqual([{ kind: "disc", disc: "G04" }]);
    expect(flightTargets("G04", null, false)).toEqual([{ kind: "overview" }]);
  });

  it("does nothing when the stop hasn't changed", () => {
    expect(flightTargets("G04", "G04", false)).toEqual([]);
    expect(flightTargets(null, null, true)).toEqual([]);
  });

  it("aims the first flight with no previous stop at the stop itself", () => {
    expect(flightTargets(undefined, "G01", false)).toEqual([targetFor("G01")]);
    expect(targetFor(null)).toEqual({ kind: "overview" });
  });
});

describe("stopForDepth: plan_depth to the disc in view", () => {
  const discs = ["G04", "G05", "G06", "G01"] as const; // Ananya's stops in scroll order
  it("holds the overview for block 2 (depth 0), then one disc per stop", () => {
    expect(stopForDepth(0, discs)).toBeNull();
    expect(stopForDepth(1, discs)).toBe("G04");
    expect(stopForDepth(4, discs)).toBe("G01");
  });
  it("keeps the overview for depths it doesn't know", () => {
    expect(stopForDepth(5, discs)).toBeNull();
    expect(stopForDepth(-1, discs)).toBeNull();
  });
});

describe("runFlights: one flight sequence at a time", () => {
  const fakeApi = () => {
    const calls: unknown[] = [];
    const flyTo = vi.fn((target: unknown) => {
      calls.push(target);
      return Promise.resolve();
    });
    return { api: { flyTo } as unknown as SpineViewerApi, calls };
  };

  it("flies each stop in order, holding the side view at a stop and not in the overview (W14-X)", async () => {
    const { api } = fakeApi();
    await runFlights(api, [null, "G05"], targetFor, () => true);
    expect(vi.mocked(api.flyTo).mock.calls).toEqual([
      [{ kind: "overview" }, { animate: true, hold: false }],
      [{ kind: "disc", disc: "G05" }, { animate: true, hold: true }],
    ]);
  });

  it("stops when a newer sequence has replaced it", async () => {
    const { api, calls } = fakeApi();
    await runFlights(api, [null, "G05"], targetFor, () => calls.length < 1);
    expect(calls).toEqual([{ kind: "overview" }]);
  });

  it("cuts instead of flying when asked", async () => {
    const { api } = fakeApi();
    await runFlights(api, ["G01"], targetFor, () => true, false);
    expect(api.flyTo).toHaveBeenCalledWith({ kind: "disc", disc: "G01" }, { animate: false, hold: true });
  });
});

describe("screenDisc: the API's DiscBox as tap.ts's ScreenDisc", () => {
  it("turns left/top/width/height into corners", () => {
    expect(screenDisc(box())).toEqual({ disc: "G04", box: { x0: 100, y0: 200, x1: 180, y1: 230 }, inFront: true, behindCamera: false });
  });
  it("never offers a disc that is off screen or behind the camera", () => {
    expect(screenDisc(box({ onScreen: false })).behindCamera).toBe(true);
  });
});

describe("calloutInputs: one pinned callout per lit disc (§6.7)", () => {
  const callouts = [
    { disc: "G04" as const, head: "Deals · 3 of 5", lines: ["1. Enquiry responder", "2. Reply sorter", "3. Call companion"] },
    { disc: "G05" as const, head: "Sales · 1 of 4", lines: ["9. Campaign runner"] },
  ];
  const boxes = [box(), box({ disc: "G05", top: 120, anchor: { x: 175, y: 126 } }), box({ disc: "G03" })];

  it("keeps plan order, anchors at the box's anchor, and keeps the label off its own disc and its glow", () => {
    const inputs = calloutInputs(boxes, callouts, "desktop");
    expect(inputs.map((i) => i.disc)).toEqual(["G04", "G05"]);
    expect(inputs[0].anchor).toEqual({ x: 180, y: 206 });
    const pad = KEEP_OUT_PAD_PX;
    expect(inputs[0].keepOut).toEqual({ x0: 100 - pad, y0: 200 - pad, x1: 180 + pad, y1: 230 + pad });
  });

  it("sizes each callout by its lines, with the heading alone as its compact form", () => {
    const [deals, sales] = calloutInputs(boxes, callouts, "phone");
    const { width, pad, line } = CALLOUT_SIZE.phone;
    expect(deals).toMatchObject({ width, height: pad + line * 4, compactHeight: pad + line });
    expect(sales.height).toBe(pad + line * 2);
  });

  it("fits a phone callout beside a centred overview spine (390 band, disc right end near x 218)", () => {
    expect(CALLOUT_SIZE.phone.width).toBeLessThanOrEqual(390 - 8 - 12 - 218);
  });

  it("marks a callout whose disc is off screen not visible, and skips discs with no box yet", () => {
    const inputs = calloutInputs([box({ onScreen: false })], callouts, "desktop");
    expect(inputs).toHaveLength(1);
    expect(inputs[0].visible).toBe(false);
  });
});

describe("tourFraming: the tour's own camera, measured on its real canvas (W14-M)", () => {
  const COLUMN = { width: 648, height: 816 };      // the sticky column at 1440 × 900
  const BAND = { width: 390, height: 410 };        // the phone band: the lens window's own aspect
  const dist = (f: { position: Vec3; target: Vec3 }) => length(sub(f.position, f.target));
  const tanLong = (size: "desktop" | "phone") => LOOK.camera[size].sensorMm / 2 / LOOK.camera[size].lensMm;
  /** The model height the canvas shows at a framing: desktop portrait uses the long-side angle, phone its window. */
  const shown = (f: { position: Vec3; target: Vec3 }, size: "desktop" | "phone") =>
    2 * dist(f) * (size === "desktop" ? tanLong("desktop") : visibleTan(LOOK.camera.phone));

  it("pulls each stop back about 2x from the close-ups worker-2 saw as melted blobs", () => {
    // What W14-F shipped: CLOSE_UP_HEIGHT through camera.ts, which on the portrait column showed 0.36 units.
    const before = (size: "desktop" | "phone") => shown(framingFor({ kind: "disc", disc: "G04" }, size), size);
    const desktop = shown(tourFraming("G04", "desktop", COLUMN, 84), "desktop") / before("desktop");
    const phone = shown(tourFraming("G04", "phone", BAND, 56), "phone") / before("phone");
    expect(desktop).toBeGreaterThan(1.9);
    expect(desktop).toBeLessThan(2.1);
    // W14-X: a phone stop pulls back a little further, so the column leaves a strip for the focus callout.
    expect(phone).toBeCloseTo(STOP_HEIGHT.phone / 0.2, 5);
    expect(phone).toBeGreaterThan(2);
  });

  it("puts a phone stop's column left of centre, leaving the right for its callout; desktop stays centred (W14-X)", () => {
    // applyCamera: the window's left column is view[0] + shift[0] * long; the frame's centre is where the target lands.
    const { full, view: win } = LOOK.camera.phone;
    const phone = tourFraming("G05", "phone", BAND, 56);
    const left = win[0] + phone.shift[0] * Math.max(...full);
    expect((full[0] / 2 - left) / win[2]).toBeCloseTo(STOP_ACROSS.phone, 9);
    expect(STOP_ACROSS.phone).toBeLessThan(0.5);
    expect(tourFraming(null, "phone", BAND, 56).shift[0]).toBe(0);
    expect(tourFraming("G05", "desktop", COLUMN, 84).shift[0]).toBe(0);
  });

  it("aims each stop at its own gap, with r17's view direction, roll and lens", () => {
    const f = tourFraming("G05", "desktop", COLUMN, 84);
    const base = framingFor({ kind: "overview" }, "desktop");
    expect(f.target).toEqual(GAPS[5].centre);
    expect(f.rollDeg).toBe(base.rollDeg);
    expect(f.lensMm).toBe(base.lensMm);
    const dir = (a: Vec3, b: Vec3) => normalize(sub(a, b));
    dir(f.position, f.target).forEach((v, i) => expect(v).toBeCloseTo(dir(base.position, base.target)[i], 9));
  });

  it("fits the whole spine, both end vertebrae included, above the legend strip in the overview", () => {
    for (const [size, view, strip] of [["desktop", COLUMN, 84], ["phone", BAND, 56]] as const) {
      const f = tourFraming(null, size, view, strip);
      const span = length(sub(GAPS[8].centre, GAPS[0].centre)) + 2 * END_MARGIN;
      expect(shown(f, size) * (1 - strip / view.height)).toBeCloseTo(span, 9);
    }
  });

  it("centres the target across, and in the part of the canvas above the legend strip", () => {
    // applyCamera: the window's top row is view[1] - shift[1] * long; the frame's centre row is where the target lands.
    const { full, view: win } = LOOK.camera.phone;
    const phone = tourFraming(null, "phone", BAND, 56);
    const top = win[1] - phone.shift[1] * Math.max(...full);
    expect((full[1] / 2 - top) / win[3]).toBeCloseTo((1 - 56 / BAND.height) / 2, 9);
    const desk = tourFraming("G04", "desktop", COLUMN, 84);
    expect(desk.shift[0]).toBe(0);
    expect(COLUMN.height / 2 + desk.shift[1] * COLUMN.height).toBeCloseTo((COLUMN.height - 84) / 2, 9);
  });

  it("works before the canvas has a size", () => {
    expect(() => tourFraming(null, "desktop", { width: 0, height: 0 }, 84)).not.toThrow();
    expect(Number.isFinite(dist(tourFraming("G01", "desktop", { width: 0, height: 0 }, 84)))).toBe(true);
  });
});

describe("byFocus: the stop in view keeps its callout first (W14-M)", () => {
  const c = (disc: "G04" | "G05" | "G06" | "G01") => ({ disc, head: disc, lines: [] });
  it("moves the disc in close-up to the front, keeping plan order for the rest", () => {
    expect(byFocus([c("G04"), c("G05"), c("G06"), c("G01")], "G06").map((x) => x.disc)).toEqual(["G06", "G04", "G05", "G01"]);
  });
  it("keeps plan order in the overview or for a disc outside the plan", () => {
    const all = [c("G04"), c("G05")];
    expect(byFocus(all, null)).toEqual(all);
    expect(byFocus(all, "G07")).toEqual(all);
  });
});

describe("spineBands: the column the callouts keep off (W14-X)", () => {
  it("runs from each disc on screen to the next, as wide as the two overlap, and on over the processes to the left", () => {
    const bands = spineBands([
      box({ disc: "G05", left: 300, top: 100, width: 80, height: 20 }),
      box({ disc: "G04", left: 320, top: 200, width: 90, height: 20 }),
      box({ disc: "G03", left: 0, top: 0, onScreen: false }),
    ]);
    expect(bands).toEqual([{ x0: 320 - PROCESS_REACH * 60, y0: 100, x1: 380, y1: 220 }]);
  });
  it("covers a lone disc by itself, and nothing when no disc is on screen", () => {
    expect(spineBands([box({ left: 100, top: 20, width: 30, height: 5 })])).toEqual([{ x0: 100 - PROCESS_REACH * 30, y0: 20, x1: 130, y1: 25 }]);
    expect(spineBands([box({ onScreen: false })])).toEqual([]);
  });
  it("keeps 24 px from the right edge on desktop, with a callout narrow enough to fit right of a stop's disc", () => {
    expect(CALLOUT_RIGHT_MARGIN_PX.desktop).toBe(24);
    // Stop 1 on the 648 px column: the Marketing disc's anchor sat at x 403, leaving 209 px (W14-X shots).
    expect(CALLOUT_SIZE.desktop.width).toBeLessThanOrEqual(648 - 24 - 12 - 403);
  });
});
