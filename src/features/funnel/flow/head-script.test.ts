// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import html from "../../../../index.html?raw";
import type { Theme } from "@/features/funnel/data/light";
import { computeBoot, greetingSnippet, type Boot, type GreetingRow } from "./boot";
import { THEME_KEY } from "./theme";
import { stubLocalStorage } from "./test/memory-storage";

const mapText = html.match(/<script id="funnel-greetings" type="application\/json">([\s\S]*?)<\/script>/)?.[1] ?? "";
const bootText = html.match(/<script id="funnel-boot">([\s\S]*?)<\/script>/)?.[1] ?? "";
const MAP = JSON.parse(mapText || "[]") as GreetingRow[];
const HI_ON = MAP.map((row) => (row.lang === "hi" ? { ...row, checked: true } : row));
const SUBS = { "s0.sub.early": "You're up early.", "s0.sub.day": "Glad you're here.", "s0.sub.late": "Late one? I'll keep it quick." };
const bytes = (text: string) => new TextEncoder().encode(text).length;

type BootWindow = Window & { __funnelBoot?: Boot };
const bootNow = () => (window as BootWindow).__funnelBoot;

function runHead(o: { hour: number; saved?: Theme | null; languages: string[]; map: readonly GreetingRow[] | string }): Boot | undefined {
  vi.setSystemTime(new Date(2026, 9, 9, o.hour, 30));
  // W15-A: a device set to dark no longer counts; only the visitor's saved choice and the clock do.
  vi.stubGlobal("matchMedia", () => ({ matches: true }));
  if (o.saved) window.localStorage.setItem(THEME_KEY, o.saved);
  else window.localStorage.removeItem(THEME_KEY);
  Object.defineProperty(window.navigator, "languages", { value: o.languages, configurable: true });
  const json = typeof o.map === "string" ? o.map : JSON.stringify(o.map);
  document.head.innerHTML = `<script id="funnel-greetings" type="application/json">${json}</script>`;
  new Function(bootText)();
  return bootNow();
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  stubLocalStorage();
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  delete (window as BootWindow).__funnelBoot;
  document.documentElement.removeAttribute("data-theme");
  document.documentElement.removeAttribute("data-funnel");
  document.body.innerHTML = "";
  window.history.replaceState(null, "", "/");
});

describe("index.html's head script (§4.2, §13.1)", () => {
  it("is small enough to inline: the script 2 KB, the map 3 KB (§13.10)", () => {
    expect(bytes(bootText)).toBeGreaterThan(0);
    expect(bytes(bootText)).toBeLessThanOrEqual(2_048);
    expect(bytes(mapText)).toBeLessThanOrEqual(3_072);
  });

  it("sits in the head, after the js class and before the app's module", () => {
    const at = (needle: string) => html.indexOf(needle);
    expect(at('id="funnel-greetings"')).toBeGreaterThan(at('classList.add("js")'));
    expect(at('id="funnel-boot"')).toBeGreaterThan(at('id="funnel-greetings"'));
    expect(at('id="funnel-boot"')).toBeLessThan(at('<script type="module"'));
  });

  it("ships English on, and Hindi in the map with its checked flag off (decision 21)", () => {
    expect(MAP.find((row) => row.lang === "en")).toEqual({
      lang: "en", checked: true, lines: ["Hello, good morning.", "Hello, good afternoon.", "Hello, good evening."],
    });
    expect(MAP.find((row) => row.lang === "hi")).toMatchObject({ checked: false, lines: ["नमस्ते, सुप्रभात।", "नमस्ते, शुभ दोपहर।", "नमस्ते, शुभ संध्या।"] });
  });

  it("agrees with computeBoot at every hour, no choice and both saved choices, three language lists and the Hindi flag", () => {
    for (let hour = 0; hour < 24; hour++) {
      for (const saved of [null, "light", "dark"] as const) {
        for (const languages of [["en-IN"], ["hi-IN", "en"], ["fr-FR"]]) {
          for (const map of [MAP, HI_ON]) {
            const got = runHead({ hour, saved, languages, map });
            expect({ ...got, t0: 0 }).toEqual(computeBoot({ hour, saved, languages, map, t0: 0 }));
          }
        }
      }
    }
  });

  it("is light at 10:16 on a device set to dark, and falls back to the clock when storage throws (W15-A)", () => {
    expect(runHead({ hour: 10, languages: ["en"], map: MAP })?.theme).toBe("light");
    delete (window as BootWindow).__funnelBoot;
    vi.spyOn(window.localStorage, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    expect(runHead({ hour: 20, languages: ["en"], map: MAP })?.theme).toBe("dark");
    vi.restoreAllMocks();
  });

  it("sets the theme and the questions mode on <html>", () => {
    runHead({ hour: 22, languages: ["en"], map: MAP });
    expect(document.documentElement.dataset).toMatchObject({ theme: "dark", funnel: "questions" });
  });

  it("keeps Hello. and still sets the theme when the map is broken (§10)", () => {
    expect(runHead({ hour: 10, languages: ["en"], map: "{oops" })).toMatchObject({ greeting: "Hello.", theme: "light" });
  });

  it("does nothing off /", () => {
    window.history.replaceState(null, "", "/privacy");
    expect(runHead({ hour: 10, languages: ["en"], map: MAP })).toBeUndefined();
    expect(document.documentElement.hasAttribute("data-theme")).toBe(false);
  });

  it("keeps the first S1 tap made before the app is ready, and none after (Review Focus 3)", () => {
    const boot = runHead({ hour: 10, languages: ["en"], map: MAP });
    document.body.innerHTML = '<button data-early="agency"><span>I run an agency</span></button><button data-early="business">x</button>';
    (document.querySelector("span") as HTMLElement).click();
    expect(boot?.early).toBe("agency");
    expect(document.querySelector('[data-early="agency"]')?.hasAttribute("data-pressed")).toBe(true);
    if (boot) boot.ready = true;
    (document.querySelector('[data-early="business"]') as HTMLElement).click();
    expect(boot?.early).toBe("agency");
  });
});

describe("greetingSnippet", () => {
  it("writes the visitor's greeting, its lang and the second line into the prerendered elements", () => {
    document.body.innerHTML = '<h1 data-greet>Hello.</h1><p data-greet>Hello.</p><p data-sub>Glad you\'re here.</p>';
    (window as BootWindow).__funnelBoot = computeBoot({ hour: 6, saved: null, languages: ["hi"], map: HI_ON, t0: 0 });
    new Function(greetingSnippet(SUBS))();
    const greets = [...document.querySelectorAll("[data-greet]")];
    expect(greets.map((el) => [el.textContent, el.getAttribute("lang")])).toEqual([["नमस्ते, सुप्रभात।", "hi"], ["नमस्ते, सुप्रभात।", "hi"]]);
    expect(document.querySelector("[data-sub]")?.textContent).toBe("You're up early.");
  });

  it("leaves the static lines alone when the head script didn't run", () => {
    document.body.innerHTML = "<h1 data-greet>Hello.</h1>";
    new Function(greetingSnippet(SUBS))();
    expect(document.querySelector("h1")?.textContent).toBe("Hello.");
  });

  it("can't be closed early by a line", () => {
    expect(greetingSnippet({ ...SUBS, "s0.sub.day": "</script><b>" })).not.toContain("</script>");
  });
});
