import { describe, expect, it } from "vitest";
import * as lead from "../../../api/funnel/lead";
import * as visit from "../../../api/funnel/visit";
import vercel from "../../../vercel.json";

const post = (body: string, type = "application/json") =>
  new Request("https://ziiroai.com/api/funnel/x", {
    method: "POST",
    headers: { "content-type": type, origin: "https://ziiroai.com" },
    body,
  });

describe.each([
  ["visit", visit],
  ["lead", lead],
] as const)("/api/funnel/%s, phase 0", (_name, fn) => {
  it("runs on Node.js for at most 15 s", () => {
    expect(fn.config).toEqual({ runtime: "nodejs", maxDuration: 15 });
  });

  it("refuses a body that isn't JSON with 415 and no-store", async () => {
    const res = await fn.POST(post("a=1", "text/plain"));
    expect(res.status).toBe(415);
    expect(res.headers.get("cache-control")).toBe("no-store");
  });
});

describe("vercel.json", () => {
  it("pins the functions to Singapore (§13.2)", () => {
    expect(vercel.regions).toEqual(["sin1"]);
  });
});
