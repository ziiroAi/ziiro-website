import { readFileSync } from "node:fs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as lib from "../../api/_lib";
import * as checks from "../../src/shared/lib/contact-checks";

describe("isValidEmail in api/_lib.ts", () => {
  it("is the shared check, so /contact, S7 and /lead agree", () => {
    expect(lib.isValidEmail).toBe(checks.isValidEmail);
  });
});

describe("readJson", () => {
  const request = (body: string) => new Request("https://ziiroai.com/api/x", { method: "POST", body });

  it("keeps the 10 KB cap by default", async () => {
    await expect(lib.readJson(request(JSON.stringify({ a: "x".repeat(9_000) })))).resolves.toHaveProperty("a");
    await expect(lib.readJson(request("x".repeat(10_001)))).rejects.toThrow("Payload too large");
  });

  it("takes a smaller cap, as /api/funnel/visit does", async () => {
    await expect(lib.readJson(request("x".repeat(5_000)), 4_096)).rejects.toThrow("Payload too large");
  });
});

describe("isRateLimited", () => {
  it("allows max calls per key in 10 minutes, then refuses", () => {
    const key = `test-${Math.random()}`;
    expect([1, 2, 3].map(() => lib.isRateLimited(key, 2))).toEqual([false, false, true]);
  });

  it("still defaults to 5, the /contact setting", () => {
    const key = `test-${Math.random()}`;
    expect(Array.from({ length: 6 }, () => lib.isRateLimited(key))).toEqual([false, false, false, false, false, true]);
  });
});

describe("sendResendEmail", () => {
  const fetchMock = vi.fn();
  const call = () => fetchMock.mock.calls[0][1] as RequestInit & { headers: Record<string, string> };

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
    vi.spyOn(console, "error").mockImplementation(() => undefined);
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("sends text with an idempotency key and a timeout, and returns Resend's id", async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ id: "re_1" })));
    const out = await lib.sendResendEmail({
      apiKey: "k", from: "a@ziiroai.com", to: ["b@example.com"], subject: "s", text: "t",
      idempotencyKey: "plan-1", timeoutMs: 2_500,
    });
    expect(out).toEqual({ id: "re_1" });
    expect(JSON.parse(String(call().body))).toEqual({ from: "a@ziiroai.com", to: ["b@example.com"], subject: "s", text: "t" });
    expect(call().headers["Idempotency-Key"]).toBe("plan-1");
    expect(call().signal).toBeInstanceOf(AbortSignal);
  });

  it("sends /contact's html as before, with no key and no timeout", async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ id: "re_2" })));
    await lib.sendResendEmail({
      apiKey: "k", from: "a@ziiroai.com", to: ["b@example.com"], subject: "s", html: "<p>h</p>", replyTo: "v@example.com",
    });
    expect(JSON.parse(String(call().body))).toEqual({
      from: "a@ziiroai.com", to: ["b@example.com"], subject: "s", html: "<p>h</p>", reply_to: "v@example.com",
    });
    expect(call().headers).not.toHaveProperty("Idempotency-Key");
    expect(call().signal).toBeUndefined();
  });

  it("throws UpstreamError with Resend's status", async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ name: "validation_error" }), { status: 422 }));
    await expect(lib.sendResendEmail({ apiKey: "k", from: "a", to: ["b"], subject: "s", text: "t" }))
      .rejects.toMatchObject({ provider: "resend", status: 422 });
  });

  it("throws UpstreamError with status 0 when Resend can't be reached or times out", async () => {
    fetchMock.mockRejectedValue(new DOMException("timed out", "TimeoutError"));
    await expect(lib.sendResendEmail({ apiKey: "k", from: "a", to: ["b"], subject: "s", text: "t", timeoutMs: 1 }))
      .rejects.toMatchObject({ provider: "resend", status: 0 });
  });

  it("refuses an email with no body, without calling Resend", async () => {
    await expect(lib.sendResendEmail({ apiKey: "k", from: "a", to: ["b"], subject: "s" })).rejects.toThrow("needs html or text");
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("the header comment", () => {
  it("no longer says nothing is stored, and points at api/funnel/ (§13.3)", () => {
    const source = readFileSync(new URL("../../api/_lib.ts", import.meta.url), "utf8");
    expect(source).not.toContain("does NOT persist to a database");
    expect(source).toContain("api/funnel/");
  });
});
