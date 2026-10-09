// @vitest-environment jsdom
import { useReducer } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PRERENDER_BOOT } from "../boot";
import { initialFlow, reduce, type FlowAction } from "../state";
import { button, click, mount, stubBrowser, typeInto, type Mounted } from "../test/dom";
import { ContactForm } from "./ContactForm";
import type { FlowEnv } from "./types";

vi.mock("@/features/funnel/data/light", async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  ...(await import("../test/fake-data")).FAKE_DATA,
}));
vi.mock("@/shared/lib/contact-checks", () => ({
  isValidName: (name: string) => /\p{L}/u.test(name),
  isValidEmail: (email: string) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email),
  toE164: (raw: string) => {
    const digits = raw.replace(/[\s()-]/g, "");
    return /^\+[1-9]\d{7,14}$/.test(digits) ? digits : null;
  },
}));

vi.mock("../region", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../region")>()),
  localTimeZone: () => "Asia/Kolkata",
}));

const STARTER = "Honestly, I'm struggling with ___ because ___.";
const TO_S7: FlowAction[] = [
  { type: "segment", value: "business" }, { type: "business", value: "interior" }, { type: "years", value: "5_10" },
  { type: "team", value: "6_20" }, { type: "revenue", value: "band_3", currency: "INR" }, { type: "problemDone", hasWords: true },
];
const AT_S7 = TO_S7.reduce(reduce, initialFlow(STARTER));

const send = vi.fn();
function Harness() {
  const [state, dispatch] = useReducer(reduce, AT_S7);
  const env: FlowEnv = { boot: PRERENDER_BOOT, introOffsetMs: null, country: null, starter: STARTER, send };
  return <ContactForm state={state} act={dispatch} edit={dispatch} env={env} />;
}

let view: Mounted;
const root = () => view.container;
const field = (id: string) => root().querySelector<HTMLInputElement>(`#${id}`);
const errorOf = (id: string) => root().querySelector(`#${id}-err`)?.textContent;

beforeEach(() => {
  stubBrowser();
  view = mount(<Harness />);
});
afterEach(() => {
  view.unmount();
  send.mockReset();
  vi.unstubAllGlobals();
});

describe("S7 (§4.3, §4.4, §11.6)", () => {
  it("labels its fields with autocomplete, leaves consent unticked and shows step 6 of 6", () => {
    const label = (id: string) => root().querySelector(`label[for="${id}"]`)?.textContent;
    expect([label("f-name"), label("f-email"), label("f-phone")]).toEqual(["Your name", "Email", "Phone (optional)"]);
    expect([field("f-name")?.autocomplete, field("f-email")?.autocomplete, field("f-phone")?.autocomplete]).toEqual(["name", "email", "tel"]);
    expect(root().querySelectorAll('input[type="checkbox"]')).toHaveLength(1);
    expect(field("f-consent")?.checked).toBe(false);
    expect(button(root(), "Show me my plan")?.type).toBe("submit");
    expect(root().querySelectorAll(".f-bar .is-on")).toHaveLength(6);
    expect(root().querySelector('a[href="/privacy"]')?.getAttribute("target")).toBe("_blank");
  });

  it("prefills the dial code for India's clock, and keeps it editable", () => {
    expect(field("f-phone")?.value).toBe("+91 ");
  });

  it("shows each failed field's line, focuses the first, and sends nothing", () => {
    click(button(root(), "Show me my plan"));
    expect(errorOf("f-name")).toBe("What should I call you?");
    expect(errorOf("f-email")).toBe("That email doesn't look right. Mind checking it?");
    expect(errorOf("f-consent")).toBe("Tick the box so I'm allowed to save this.");
    expect(errorOf("f-phone")).toBe("");
    expect(field("f-name")?.getAttribute("aria-invalid")).toBe("true");
    expect(document.activeElement?.id).toBe("f-name");
    expect(send).not.toHaveBeenCalled();
  });

  it("clears a field's line when that field is edited, and keeps the others", () => {
    click(button(root(), "Show me my plan"));
    typeInto(field("f-name"), "Ananya");
    expect(errorOf("f-name")).toBe("");
    expect(errorOf("f-email")).toBe("That email doesn't look right. Mind checking it?");
  });

  it("sends the checked contact, with no phone when the box holds only the code", () => {
    typeInto(field("f-name"), "Ananya");
    typeInto(field("f-email"), "ananya@example.com");
    click(field("f-consent"));
    click(button(root(), "Show me my plan"));
    expect(send).toHaveBeenCalledWith(expect.objectContaining({ waitForToken: expect.any(Function), reset: expect.any(Function) }), {
      name: "Ananya", email: "ananya@example.com",
    });
  });

  it("sends a typed phone in E.164, and flags one that doesn't look right", () => {
    typeInto(field("f-name"), "Ananya");
    typeInto(field("f-email"), "ananya@example.com");
    click(field("f-consent"));
    typeInto(field("f-phone"), "+91 12");
    click(button(root(), "Show me my plan"));
    expect(errorOf("f-phone")).toBe("That number doesn't look right. You can leave it blank.");
    typeInto(field("f-phone"), "+91 98765 43210");
    click(button(root(), "Show me my plan"));
    expect(send).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ phone: "+919876543210" }));
  });
});
