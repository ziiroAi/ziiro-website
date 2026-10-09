// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mount, settle, stubBrowser, type Mounted } from "@/features/funnel/flow/test/dom";
import PageAtmosphere from "./PageAtmosphere";

let view: Mounted | undefined;
const layer = () => view?.container.firstElementChild as HTMLElement | null;

beforeEach(() => {
  stubBrowser();
  document.documentElement.style.setProperty("--page-atmosphere", "0");
});
afterEach(() => {
  view?.unmount();
  view = undefined;
  document.documentElement.style.removeProperty("--page-atmosphere");
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("PageAtmosphere (W15-E)", () => {
  it("forces no style recalc while the page mounts: it reads the token later, once the page is idle", async () => {
    const spy = vi.spyOn(window, "getComputedStyle");
    view = mount(<PageAtmosphere />);
    expect(spy).not.toHaveBeenCalled();
    await settle(20);
    expect(spy).toHaveBeenCalled();
  });

  it("stays out of the box tree while the token is 0", async () => {
    view = mount(<PageAtmosphere />);
    expect(layer()?.style.display).toBe("none");
    await settle(20);
    expect(layer()?.style.display).toBe("none");
  });

  it("comes back when the token is raised", async () => {
    document.documentElement.style.setProperty("--page-atmosphere", "1");
    view = mount(<PageAtmosphere />);
    await settle(20);
    expect(layer()?.style.display).toBe("");
  });
});
