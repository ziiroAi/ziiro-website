// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";

const seen = vi.hoisted(() => ({ inTransition: false, renderedInTransition: [] as boolean[] }));

vi.mock("react", async (importOriginal) => {
  const react = await importOriginal<typeof import("react")>();
  return {
    ...react,
    startTransition: (scope: () => void) => {
      seen.inTransition = true;
      try {
        scope();
      } finally {
        seen.inTransition = false;
      }
    },
  };
});
vi.mock("react-dom/client", () => ({
  createRoot: () => ({
    render: () => seen.renderedInTransition.push(seen.inTransition),
    unmount: () => undefined,
  }),
}));

afterEach(() => {
  seen.renderedInTransition = [];
});

describe("the first mount (W15-E)", () => {
  it("renders inside a transition, so React slices it instead of running one long task", async () => {
    const { mountRoot } = await import("./mount");
    mountRoot(document.createElement("div"), null);
    expect(seen.renderedInTransition).toEqual([true]);
  });
});
