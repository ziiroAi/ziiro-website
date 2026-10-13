import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import handler from "../../api/send-contact";

/** (C) /contact's body handling (server review L4). */
const post = (body: string) =>
  new Request("https://ziiroai.com/api/send-contact", {
    method: "POST",
    headers: { "content-type": "application/json", origin: "https://ziiroai.com", "x-forwarded-for": "203.0.113.9" },
    body,
  });

describe("POST /api/send-contact with a body that isn't an object (review L4)", () => {
  beforeEach(() => {
    vi.stubEnv("RESEND_API_KEY", "re_test");
    vi.stubEnv("TURNSTILE_SECRET_KEY", "secret");
    vi.spyOn(console, "log").mockImplementation(() => undefined);
    vi.spyOn(console, "error").mockImplementation(() => undefined);
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it.each(["null", "[]", "\"text\"", "7"])("answers 400 Invalid submission to %s, not a 500", async (body) => {
    const res = await handler(post(body));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ success: false, error: "Invalid submission" });
  });
});
