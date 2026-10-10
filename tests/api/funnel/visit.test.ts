import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { FunnelDb, VisitRecord } from "../../../api/funnel/_db";
import { createVisitHandler } from "../../../api/funnel/visit";
import { VISIT_ID } from "./visit-fields";

const IPHONE = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)";
const GOOGLEBOT = "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)";

function setup(options: { limited?: boolean; down?: boolean } = {}) {
  const saved: VisitRecord[] = [];
  const db: FunnelDb = {
    async upsertVisit(visit) {
      if (options.down) throw new Error("connection refused");
      saved.push(visit);
    },
    async findLead() { return null; },
    async saveLead() { throw new Error("not used by /visit"); },
    async savePlanEmail() { throw new Error("not used by /visit"); },
    async countRecentFlagged() { throw new Error("not used by /visit"); },
  };
  const rateLimited = vi.fn((_key: string, _max: number) => options.limited ?? false);
  const handle = createVisitHandler({
    db: () => db,
    rateLimited,
    jobIdsFor: (ids) => ids.map((id) => `${id}:job`),
  });
  return { handle, saved, rateLimited };
}

const send = (body: unknown, headers: Record<string, string> = {}) =>
  new Request("https://ziiroai.com/api/funnel/visit", {
    method: "POST",
    headers: {
      "content-type": "application/json", "user-agent": IPHONE, "x-vercel-ip-country": "IN",
      "x-forwarded-for": "203.0.113.7", ...headers,
    },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
const visit = (fields: Record<string, unknown>, step = "S3") =>
  ({ id: VISIT_ID, step, fields: { noticeVersion: "2026-10-08", ...fields } });

describe("POST /api/funnel/visit (§13.2)", () => {
  let logs: string[];
  beforeEach(() => {
    logs = [];
    vi.spyOn(console, "log").mockImplementation((line) => { logs.push(String(line)); });
    vi.spyOn(console, "error").mockImplementation((line) => { logs.push(String(line)); });
  });
  afterEach(() => { vi.restoreAllMocks(); });

  it("saves the step, derives the jobs, and answers with the country", async () => {
    const { handle, saved } = setup();
    const res = await handle(send(visit({ segment: "business", agentIds: ["deals-inbound"] }, "S8")));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ success: true, country: "IN" });
    expect(saved[0]).toMatchObject({
      id: VISIT_ID, last_step: "S8", segment: "business", job_ids: ["deals-inbound:job"], country: "IN", bot_flag: false,
    });
  });

  it("refuses typed words with 400 and the key, saves nothing, and logs no value (D13)", async () => {
    const { handle, saved } = setup();
    const res = await handle(send(visit({ problemText: "my words" })));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ success: false, field: "problemText" });
    expect(saved).toEqual([]);
    expect(logs.join("\n")).not.toContain("my words");
  });

  it("refuses a body over 4 KB with 400 payload", async () => {
    const { handle } = setup();
    const res = await handle(send(visit({ landingPath: `/${"a".repeat(5_000)}` })));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ success: false, field: "payload" });
  });

  it("refuses a body that isn't JSON with 415", async () => {
    const { handle } = setup();
    expect((await handle(send("a=1", { "content-type": "text/plain" }))).status).toBe(415);
  });

  it("answers 429 past 120 saves in 10 minutes from one connection", async () => {
    const { handle, saved, rateLimited } = setup({ limited: true });
    const res = await handle(send(visit({})));
    expect(res.status).toBe(429);
    expect(rateLimited).toHaveBeenCalledWith("funnel-visit:203.0.113.7", 120);
    expect(saved).toEqual([]);
  });

  it("answers a bot, known by navigator.webdriver or its user agent, without saving it (review M3)", async () => {
    const { handle, saved } = setup();
    const byDriver = await handle(send(visit({ webdriver: true })));
    const byAgent = await handle(send(visit({}), { "user-agent": GOOGLEBOT }));
    await handle(send(visit({})));
    expect([byDriver.status, byAgent.status]).toEqual([200, 200]);
    expect(await byAgent.json()).toEqual({ success: true, country: "IN" });
    expect(saved.map((row) => row.bot_flag)).toEqual([false]);
  });

  it("leaves the country out when the header isn't a country code", async () => {
    const { handle, saved } = setup();
    const res = await handle(send(visit({}), { "x-vercel-ip-country": "XX1" }));
    expect(await res.json()).toEqual({ success: true, country: null });
    expect(saved[0].country).toBeNull();
  });

  it("answers 502 when the database is down, and logs only the error's name", async () => {
    const { handle } = setup({ down: true });
    const res = await handle(send(visit({ segment: "business" })));
    expect(res.status).toBe(502);
    expect(logs.join("\n")).toContain("funnel.visit.db");
    expect(logs.join("\n")).not.toContain("business");
  });
});
