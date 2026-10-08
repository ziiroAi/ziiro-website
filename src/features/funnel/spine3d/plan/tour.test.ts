import { describe, expect, it, vi } from "vitest";
import type { DiscBox, SpineViewerApi } from "../api";
import { framingFor } from "../camera";
import { calloutInputs, centredTarget, flightTargets, runFlights, screenDisc, stopForDepth, targetFor, CALLOUT_SIZE } from "./tour";

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

  it("flies each target in order", async () => {
    const { api, calls } = fakeApi();
    await runFlights(api, flightTargets("G04", "G05", false), () => true);
    expect(calls).toEqual([{ kind: "overview" }, { kind: "disc", disc: "G05" }]);
  });

  it("stops when a newer sequence has replaced it", async () => {
    const { api, calls } = fakeApi();
    await runFlights(api, flightTargets("G04", "G05", false), () => calls.length < 1);
    expect(calls).toEqual([{ kind: "overview" }]);
  });

  it("cuts instead of flying when asked", async () => {
    const { api } = fakeApi();
    await runFlights(api, [targetFor("G01")], () => true, false);
    expect(api.flyTo).toHaveBeenCalledWith({ kind: "disc", disc: "G01" }, { animate: false });
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

  it("keeps plan order, anchors at the box's anchor, and keeps the label off its own disc", () => {
    const inputs = calloutInputs(boxes, callouts, "desktop");
    expect(inputs.map((i) => i.disc)).toEqual(["G04", "G05"]);
    expect(inputs[0].anchor).toEqual({ x: 180, y: 206 });
    expect(inputs[0].keepOut).toEqual({ x0: 100, y0: 200, x1: 180, y1: 230 });
  });

  it("sizes each callout by its lines, with the heading alone as its compact form", () => {
    const [deals, sales] = calloutInputs(boxes, callouts, "phone");
    const { width, pad, line } = CALLOUT_SIZE.phone;
    expect(deals).toMatchObject({ width, height: pad + line * 4, compactHeight: pad + line });
    expect(sales.height).toBe(pad + line * 2);
  });

  it("marks a callout whose disc is off screen not visible, and skips discs with no box yet", () => {
    const inputs = calloutInputs([box({ onScreen: false })], callouts, "desktop");
    expect(inputs).toHaveLength(1);
    expect(inputs[0].visible).toBe(false);
  });
});

describe("centredTarget: the tour's own framing (the column is narrower than the hero)", () => {
  it("keeps r17's pose for the overview and each close-up, but drops the hero's sideways lens shift", () => {
    for (const size of ["desktop", "phone"] as const) {
      for (const stop of [null, "G04"] as const) {
        const target = centredTarget(stop, size);
        if (target.kind !== "framing") throw new Error("expected a framing target");
        const hero = framingFor(targetFor(stop), size);
        expect(target.framing).toEqual({ ...hero, shift: [0, hero.shift[1]] });
      }
    }
  });
});
