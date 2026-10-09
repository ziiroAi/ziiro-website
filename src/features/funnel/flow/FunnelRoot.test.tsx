// @vitest-environment jsdom
import { act } from "react";
import { renderToString } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mountRoot } from "@/app/mount";
import type { Boot } from "./boot";
import { FunnelRoot } from "./FunnelRoot";
import { button, click, mount, stubBrowser, type Mounted } from "./test/dom";

vi.mock("@/features/funnel/data/light", async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  ...(await import("./test/fake-data")).FAKE_DATA,
}));

type BootWindow = Window & { __funnelBoot?: Boot };
const HEAD_BOOT: Boot = {
  hour: 6, t0: 0, dayPart: "morning", theme: "dark", sub: "s0.sub.early",
  lang: "hi", greeting: "नमस्ते, सुप्रभात।", early: null, ready: false,
};
let view: Mounted | undefined;
const screenOf = () => view?.container.querySelector(".f-root")?.getAttribute("data-screen");

beforeEach(() => stubBrowser());
afterEach(() => {
  view?.unmount();
  view = undefined;
  vi.unstubAllGlobals();
  delete (window as BootWindow).__funnelBoot;
});

describe("FunnelRoot on landing (S0 + S1)", () => {
  it("shows the greeting, S1's question, its five options as buttons, g.about and the footer note", () => {
    view = mount(<FunnelRoot />);
    const root = view.container;
    expect(root.querySelector("h1")?.textContent).toBe("Hello.");
    expect(root.querySelector("h2")?.textContent).toBe("What do you do?");
    expect([...root.querySelectorAll(".f-s1 .f-options button")].map((b) => b.textContent)).toEqual([
      "I run a business", "I run an agency", "I freelance", "I'm starting something", "Student, or just curious",
    ]);
    expect(root.textContent).toContain("ziiro AI is an AI consultancy based in India");
    expect(root.querySelector(".f-note")?.textContent).toBe("Your answers are saved to shape your plan. · Privacy");
  });

  it("opens Privacy in a new tab, so the questions stay put (Review Focus 5)", () => {
    view = mount(<FunnelRoot />);
    const link = view.container.querySelector(".f-note a");
    expect(link?.getAttribute("href")).toBe("/privacy");
    expect(link?.getAttribute("target")).toBe("_blank");
    expect(link?.getAttribute("rel")).toContain("noopener");
  });

  it("uses the head script's greeting, its lang and its theme", () => {
    (window as BootWindow).__funnelBoot = { ...HEAD_BOOT };
    view = mount(<FunnelRoot />);
    const h1 = view.container.querySelector("h1");
    expect([h1?.textContent, h1?.getAttribute("lang")]).toEqual(["नमस्ते, सुप्रभात।", "hi"]);
    expect(view.container.querySelector("header p")?.textContent).toBe("You're up early.");
    expect(document.documentElement.dataset).toMatchObject({ theme: "dark", funnel: "questions" });
  });

  it("takes data-theme and data-funnel off <html> when it unmounts", () => {
    view = mount(<FunnelRoot />);
    view.unmount();
    view = undefined;
    expect(document.documentElement.hasAttribute("data-funnel")).toBe(false);
    expect(document.documentElement.hasAttribute("data-theme")).toBe(false);
  });

  it("plays the S0 intro on landing and carries the greeting snippet", () => {
    view = mount(<FunnelRoot />);
    const landing = view.container.querySelector(".f-landing");
    expect(landing?.classList.contains("f-intro-on")).toBe(true);
    expect(landing?.querySelector(".f-intro")?.getAttribute("aria-hidden")).toBe("true");
    expect(landing?.querySelector("script")?.textContent).toContain("__funnelBoot");
  });

  it("moves on when an option is tapped, and announces the step", () => {
    view = mount(<FunnelRoot />);
    click(button(view.container, "I run a business"));
    expect(screenOf()).toBe("s2");
    expect(view.container.querySelector("[aria-live]")?.textContent).toBe("Step 2 of 6");
  });

  it("answers an S1 tap made before the app ran, once (Review Focus 3)", () => {
    const boot = { ...HEAD_BOOT, early: "agency" };
    (window as BootWindow).__funnelBoot = boot;
    view = mount(<FunnelRoot />);
    expect(screenOf()).toBe("s2");
    expect(boot).toMatchObject({ ready: true, early: null });
  });

  it("answers an early S1 tap when the first mount is a transition (W15-E)", async () => {
    const boot = { ...HEAD_BOOT, early: "agency" };
    (window as BootWindow).__funnelBoot = boot;
    const container = document.body.appendChild(document.createElement("div"));
    const root = await act(async () => mountRoot(container, <FunnelRoot />));
    expect(container.querySelector(".f-root")?.getAttribute("data-screen")).toBe("s2");
    expect(boot).toMatchObject({ ready: true, early: null });
    act(() => root.unmount());
    container.remove();
  });
});

describe("FunnelRoot's first render (W15-E)", () => {
  afterEach(() => vi.restoreAllMocks());

  it("looks up no time zone: ICU's zone data costs ~30 ms of the first task", async () => {
    vi.resetModules();
    const { FunnelRoot: Fresh } = await import("./FunnelRoot");
    const spy = vi.spyOn(Intl, "DateTimeFormat");
    renderToString(<Fresh />);
    expect(spy).not.toHaveBeenCalled();
  });
});
