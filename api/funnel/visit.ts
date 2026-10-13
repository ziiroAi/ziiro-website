// POST /api/funnel/visit: one anonymous row per visit, updated at every step (spec §9, §13.2).
import { clientIp, isJsonRequest, isRateLimited, jsonResponse, logEvent, readJson, requestId } from "../_lib.js";
import { jobIdsFor } from "../../src/features/funnel/data/index.js";
import {
  LIMITS, VISIT_FIELD_KEYS, isOneOf, type AgentId, type VisitResponse,
} from "../../src/features/funnel/data/contract.js";
import { createDb, toVisitRecord, type FunnelDb } from "./_db.js";
import { countryOf, isBot, parseVisit } from "./_validate.js";

export const config = { runtime: "nodejs", maxDuration: 15 };

/** Saves per connection per 10 minutes. A visit sends about 12; §13.2 sets no number for /visit. */
const VISIT_RATE_MAX = 120;

export interface VisitDeps {
  db(): FunnelDb;
  rateLimited(key: string, max: number): boolean;
  jobIdsFor(agentIds: readonly AgentId[]): string[];
}

const answer = (request: Request, body: VisitResponse, status = 200): Response => jsonResponse(request, body, status);

/** A refused key is logged by name only when it's one of ours (the logging policy in api/_lib.ts). */
const loggable = (field: string): string =>
  isOneOf(VISIT_FIELD_KEYS, field) || ["id", "step", "payload"].includes(field) ? field : "unknown_key";

export function createVisitHandler(deps: VisitDeps) {
  return async (request: Request): Promise<Response> => {
    if (!isJsonRequest(request)) return answer(request, { success: false }, 415);
    let body: unknown;
    try {
      body = await readJson(request, LIMITS.visitBodyBytes);
    } catch {
      return answer(request, { success: false, field: "payload" }, 400);
    }
    const parsed = parseVisit(body);
    if (!parsed.ok) {
      logEvent("info", "funnel.visit.refused", { field: loggable(parsed.field), requestId: requestId(request) });
      return answer(request, { success: false, field: parsed.field }, 400);
    }
    if (deps.rateLimited(`funnel-visit:${clientIp(request)}`, VISIT_RATE_MAX)) {
      return answer(request, { success: false }, 429);
    }
    const visit = parsed.value;
    const country = countryOf(request);
    // A bot gets the same answer and no row, so it can't grow the table or skew the numbers (review M3).
    if (isBot(request, visit.fields.webdriver)) return answer(request, { success: true, country });
    const record = toVisitRecord(visit, {
      country,
      bot: false,
      jobIds: visit.fields.agentIds ? deps.jobIdsFor(visit.fields.agentIds) : null,
    });
    try {
      await deps.db().upsertVisit(record);
    } catch (error) {
      logEvent("error", "funnel.visit.db", {
        name: error instanceof Error ? error.name : "unknown",
        requestId: requestId(request),
      });
      return answer(request, { success: false }, 502);
    }
    return answer(request, { success: true, country });
  };
}

const handle = createVisitHandler({ db: () => createDb(), rateLimited: isRateLimited, jobIdsFor });

export async function POST(request: Request): Promise<Response> {
  return handle(request);
}
