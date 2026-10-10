// @vitest-environment jsdom
// (C) W15-M6: the funnel starts warming the plan's mesh as the visitor leaves S1, once, and never after they leave.
import { act, useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Screen } from "./state";
import { mount, type Mounted } from "./test/dom";
import { usePlanWarm } from "./usePlanWarm";

let view: Mounted | undefined;
let go: (screen: Screen) => void = () => undefined;
let idle: (() => void)[] = [];
const warmPlanMesh = vi.fn(async (_signal: AbortSignal) => true);
const load = vi.fn(async () => ({ warmPlanMesh }));

function Funnel({ from }: { from: Screen }): null {
  const [screen, setScreen] = useState<Screen>(from);
  go = (next) => act(() => setScreen(next));
  usePlanWarm(screen, load);
  return null;
}

/** Idle time comes: the queued idle callbacks run, then the chunk's import settles. */
async function idleTime(): Promise<void> {
  await act(async () => {
    idle.splice(0).forEach((run) => run());
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
}

beforeEach(() => {
  idle = [];
  vi.stubGlobal("requestIdleCallback", (run: () => void) => idle.push(run));
  vi.stubGlobal("cancelIdleCallback", () => undefined);
});
afterEach(() => {
  view?.unmount();
  view = undefined;
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe("usePlanWarm (W15-M6)", () => {
  it("asks for nothing while the visitor is on S1", async () => {
    view = mount(<Funnel from="s1" />);
    await idleTime();
    expect(load).not.toHaveBeenCalled();
    expect(warmPlanMesh).not.toHaveBeenCalled();
  });

  it("starts the warm in idle time once the visitor leaves S1", async () => {
    view = mount(<Funnel from="s1" />);
    go("s2");
    expect(warmPlanMesh).not.toHaveBeenCalled();
    await idleTime();
    expect(warmPlanMesh).toHaveBeenCalledTimes(1);
    expect(warmPlanMesh.mock.calls[0][0].aborted).toBe(false);
  });

  it("starts it once for the whole question flow, Back to S1 and on again included", async () => {
    view = mount(<Funnel from="s1" />);
    go("s2");
    go("s34");
    go("s1");
    go("s2");
    go("s8");
    await idleTime();
    expect(warmPlanMesh).toHaveBeenCalledTimes(1);
  });

  it("starts it by S8 at the latest, for a visit that reaches the questions without passing S1", async () => {
    view = mount(<Funnel from="s8" />);
    await idleTime();
    expect(warmPlanMesh).toHaveBeenCalledTimes(1);
  });

  it("leaves a plan already on screen (a resumed visit) to fetch its own mesh", async () => {
    view = mount(<Funnel from="plan" />);
    await idleTime();
    expect(warmPlanMesh).not.toHaveBeenCalled();
  });

  it("asks for nothing once the visitor has left the funnel before idle time came", async () => {
    view = mount(<Funnel from="s1" />);
    go("s2");
    view.unmount();
    view = undefined;
    await idleTime();
    expect(warmPlanMesh).not.toHaveBeenCalled();
  });

  it("tells a warm under way that the visitor left the funnel", async () => {
    view = mount(<Funnel from="s2" />);
    await idleTime();
    const signal = warmPlanMesh.mock.calls[0][0];
    view.unmount();
    view = undefined;
    expect(signal.aborted).toBe(true);
  });
});
