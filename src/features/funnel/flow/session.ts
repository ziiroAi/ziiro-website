/**
 * (C) funnelSession (00-index §1.3): what lane D's header and nav pill read from the funnel. This is the day-1
 * stub, and Task 13 completes it. Type imports only (00-index §1.5), so the header can load it on every page.
 */
import type { FunnelSession } from "@/features/funnel/data/contract";

export const funnelSession: FunnelSession = {
  leadContact: () => null,
  reportCta: () => undefined,
  stage: () => "questions",
  subscribe: () => () => undefined,
};
