// POST /api/funnel/visit: phase 0 skeleton. Lane B, Task 6 builds it (spec §13.2).
import { isJsonRequest, jsonResponse } from "../_lib";

export const config = { runtime: "nodejs", maxDuration: 15 };

export async function POST(request: Request): Promise<Response> {
  if (!isJsonRequest(request)) return jsonResponse(request, { success: false }, 415);
  return jsonResponse(request, { success: false }, 501);
}
