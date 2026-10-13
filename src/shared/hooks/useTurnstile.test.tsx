// @vitest-environment jsdom
import { act } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { mount, settle, type Mounted } from "@/features/funnel/flow/test/dom";
import type { TurnstileRenderOptions } from "@/shared/lib/turnstile";
import { useTurnstile, type TurnstileHandle } from "./useTurnstile";

const api = vi.hoisted(() => ({
  render: vi.fn((_host: HTMLElement, _options: TurnstileRenderOptions) => "w1"),
  reset: vi.fn(),
  remove: vi.fn(),
}));
vi.mock("@/shared/lib/turnstile", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/shared/lib/turnstile")>()),
  loadTurnstile: vi.fn(async (siteKey?: string) => (siteKey ? api : null)),
}));

let handle: TurnstileHandle | undefined;
function Probe({ siteKey }: { siteKey?: string }) {
  handle = useTurnstile({ siteKey, action: "funnel_lead", appearance: "interaction-only", theme: "dark" });
  return <div ref={handle.hostRef} />;
}

let view: Mounted | undefined;
afterEach(() => {
  view?.unmount();
  view = undefined;
  vi.clearAllMocks();
});

describe("useTurnstile (§13.4)", () => {
  it("renders the widget once, with the action, appearance and theme it's given", async () => {
    view = mount(<Probe siteKey="key" />);
    await settle();
    expect(api.render).toHaveBeenCalledTimes(1);
    expect(api.render.mock.calls[0][1]).toMatchObject({
      sitekey: "key", action: "funnel_lead", appearance: "interaction-only", theme: "dark",
    });
  });

  it("hands over the widget's token; reset clears it and asks the widget for another", async () => {
    view = mount(<Probe siteKey="key" />);
    await settle();
    act(() => api.render.mock.calls[0][1].callback("tok"));
    expect(handle?.token).toBe("tok");
    await expect(handle?.waitForToken(1_000)).resolves.toBe("tok");
    act(() => handle?.reset());
    expect(handle?.token).toBe("");
    expect(api.reset).toHaveBeenCalledWith("w1");
  });

  it("without a site key, renders nothing and answers an empty token at once", async () => {
    view = mount(<Probe />);
    await settle();
    expect(api.render).not.toHaveBeenCalled();
    await expect(handle?.waitForToken(3_000)).resolves.toBe("");
  });

  it("removes the widget when the form unmounts", async () => {
    view = mount(<Probe siteKey="key" />);
    await settle();
    view.unmount();
    view = undefined;
    expect(api.remove).toHaveBeenCalledWith("w1");
  });
});
