// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  applyFunnelAttributes, clearFunnelAttributes, computeBoot, dayPartFor, introOffsetMs, introStartMs, pickRow,
  readBoot, readGreetingMap, subFor, themeFor, type GreetingRow,
} from "./boot";

const EN: GreetingRow = { lang: "en", checked: true, lines: ["Hello, good morning.", "Hello, good afternoon.", "Hello, good evening."] };
const HI: GreetingRow = { lang: "hi", checked: false, lines: ["नमस्ते, सुप्रभात।", "नमस्ते, शुभ दोपहर।", "नमस्ते, शुभ संध्या।"] };
const HI_ON: GreetingRow = { ...HI, checked: true };

describe("day-parts (§4.2)", () => {
  it.each([[4, "evening"], [5, "morning"], [11, "morning"], [12, "afternoon"], [16, "afternoon"], [17, "evening"], [0, "evening"], [23, "evening"]])(
    "%i:xx is %s", (hour, part) => expect(dayPartFor(hour)).toBe(part),
  );
});

describe("the second line (§4.2)", () => {
  it.each([[4, "s0.sub.late"], [5, "s0.sub.early"], [7, "s0.sub.early"], [8, "s0.sub.day"], [21, "s0.sub.day"], [22, "s0.sub.late"]])(
    "%i:xx shows %s", (hour, id) => expect(subFor(hour)).toBe(id),
  );
});

describe("the theme (D9)", () => {
  it.each([[4, "dark"], [5, "light"], [16, "light"], [17, "dark"]])("%i:xx on a device with no setting is %s", (hour, theme) =>
    expect(themeFor(hour, false)).toBe(theme),
  );
  it("a device set to dark wins at 10:00", () => expect(themeFor(10, true)).toBe("dark"));
});

describe("the greeting's language (D4)", () => {
  it("takes the first browser language with a live row", () => {
    expect(pickRow([EN, HI_ON], ["hi-IN", "en-GB"])).toBe(HI_ON);
    expect(pickRow([EN, HI_ON], ["fr-FR", "hi"])).toBe(HI_ON);
  });
  it("shows English while Hindi's checked flag is off", () => expect(pickRow([EN, HI], ["hi-IN"])).toBe(EN));
  it("falls back to English for a language with no row, or no list", () => {
    expect(pickRow([EN, HI_ON], ["fr-FR"])).toBe(EN);
    expect(pickRow([EN], [])).toBe(EN);
  });
  it("returns null when the map has no live English row", () => expect(pickRow([HI], ["fr"])).toBeNull());
});

describe("computeBoot", () => {
  it("puts it together", () => {
    expect(computeBoot({ hour: 19, deviceDark: false, languages: ["hi-IN"], map: [EN, HI_ON], t0: 42 })).toEqual({
      hour: 19, t0: 42, dayPart: "evening", theme: "dark", sub: "s0.sub.day",
      lang: "hi", greeting: "नमस्ते, शुभ संध्या।", early: null, ready: false,
    });
  });
  it("keeps the static hello when the map is missing (§4.2)", () => {
    expect(computeBoot({ hour: 9, deviceDark: false, languages: ["en"], map: null, t0: 0 })).toMatchObject({ lang: "en", greeting: "Hello." });
  });
});

describe("the intro's clock", () => {
  const paintAt = (startTime?: number) =>
    ({ performance: { getEntriesByName: () => (startTime === undefined ? [] : [{ startTime }]) } }) as unknown as Window;

  it("starts at first paint on a full load of /", () => expect(introStartMs(paintAt(300), 120)).toBe(300));
  it("starts at t0 when the visitor came from another page, or the browser doesn't say", () => {
    expect(introStartMs(paintAt(300), 9_000)).toBe(9_000);
    expect(introStartMs(paintAt(), 120)).toBe(120);
  });
  it("is offset by minus the time since it started, never a positive delay", () => {
    expect(introOffsetMs(200, 950)).toBe(-750);
    expect(introOffsetMs(500, 400)).toBe(0);
  });
});

describe("on the client", () => {
  afterEach(() => {
    clearFunnelAttributes(window);
    document.head.innerHTML = "";
    vi.unstubAllGlobals();
  });

  it("reads the map from index.html's JSON block, or null when it's broken", () => {
    document.head.innerHTML = `<script id="funnel-greetings" type="application/json">${JSON.stringify([EN])}</script>`;
    expect(readGreetingMap(document)).toEqual([EN]);
    document.head.innerHTML = `<script id="funnel-greetings" type="application/json">{oops</script>`;
    expect(readGreetingMap(document)).toBeNull();
  });

  it("uses the head script's result when there is one", () => {
    const fromHead = computeBoot({ hour: 9, deviceDark: false, languages: ["en"], map: [EN], t0: 1 });
    (window as Window & { __funnelBoot?: unknown }).__funnelBoot = fromHead;
    expect(readBoot(window)).toBe(fromHead);
  });

  it("works one out when the visitor came from another page of the site", () => {
    vi.stubGlobal("matchMedia", () => ({ matches: true }));
    expect(readBoot(window)).toMatchObject({ theme: "dark", greeting: "Hello." });
  });

  it("sets data-theme and data-funnel, and clears both, with the boot, on the way out", () => {
    applyFunnelAttributes(document, "dark", "questions");
    expect(document.documentElement.dataset).toMatchObject({ theme: "dark", funnel: "questions" });
    clearFunnelAttributes(window);
    expect(document.documentElement.hasAttribute("data-theme")).toBe(false);
    expect(document.documentElement.hasAttribute("data-funnel")).toBe(false);
    expect((window as Window & { __funnelBoot?: unknown }).__funnelBoot).toBeUndefined();
  });
});
