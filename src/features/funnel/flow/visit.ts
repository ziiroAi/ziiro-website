/** (C) The background saves (spec §9, §13.2): one /visit post per step, never waited on, failures dropped (§10). */
import type { VisitRequest, VisitResponse } from "@/features/funnel/data/light";

export const VISIT_URL = "/api/funnel/visit";

function isVisitResponse(value: unknown): value is VisitResponse {
  const answer = value as { success?: unknown; country?: unknown } | null;
  return answer?.success === false || (answer?.success === true && (answer.country === null || typeof answer.country === "string"));
}

/** Sent with keepalive, so a save survives the page going away. Never throws. */
export async function postVisit(body: VisitRequest, fetchImpl: typeof fetch = fetch): Promise<VisitResponse | null> {
  try {
    const response = await fetchImpl(VISIT_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      keepalive: true,
    });
    const answer: unknown = await response.json();
    return isVisitResponse(answer) ? answer : null;
  } catch {
    return null;  // a dropped save: the next one carries every answer so far (§10)
  }
}
