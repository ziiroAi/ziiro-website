import { describe, expect, it, vi } from "vitest";
import type { VisitRequest } from "@/features/funnel/data/light";
import { VISIT_URL, postVisit } from "./visit";

const BODY: VisitRequest = { id: "v-1", step: "S0", fields: { noticeVersion: "2026-10-08" } };
const answer = (body: string, status = 200) => vi.fn(async () => new Response(body, { status }));

describe("postVisit (§13.2)", () => {
  it("posts JSON with keepalive and returns the answer", async () => {
    const fetchImpl = answer(JSON.stringify({ success: true, country: "IN" }));
    await expect(postVisit(BODY, fetchImpl)).resolves.toEqual({ success: true, country: "IN" });
    expect(fetchImpl).toHaveBeenCalledWith(VISIT_URL, expect.objectContaining({ method: "POST", keepalive: true, body: JSON.stringify(BODY) }));
  });

  it("drops a failure without throwing (§10)", async () => {
    const offline = vi.fn(async () => {
      throw new TypeError("offline");
    });
    await expect(postVisit(BODY, offline)).resolves.toBeNull();
    await expect(postVisit(BODY, answer("<html>", 502))).resolves.toBeNull();
  });

  it("ignores an answer it doesn't recognise", async () => {
    await expect(postVisit(BODY, answer(JSON.stringify({ country: 7 })))).resolves.toBeNull();
  });
});
