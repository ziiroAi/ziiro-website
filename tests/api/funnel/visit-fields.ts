import type { VisitFields } from "../../../src/features/funnel/data/contract";

export const VISIT_ID = "6f1c2a7e-6c1d-4f5e-9a51-0a7c1e2d3b4f";

/** Every key /visit allows, each with an allowed value. Required<> breaks the build if the contract adds a key. */
export const FULL_VISIT_FIELDS: Required<VisitFields> = {
  noticeVersion: "2026-10-08", landingPath: "/", entryIntent: "ai-lead-generation", referrerHost: "l.instagram.com",
  utm: { source: "ig", medium: "social", campaign: "launch", term: "ai", content: "reel-1" },
  timezone: "Asia/Kolkata", locale: "en-IN", dayPart: "morning", theme: "light", deviceClass: "mobile",
  isReturning: false, segment: "business", nonOwnerReason: "learning", businessType: "interior", yearsBand: "5_10",
  teamBand: "6_20", revenueBand: "band_3", revenueCurrency: "INR", chips: ["followups"], inputMode: "mixed",
  bucketPrimary: "sales", bucketSecondary: null, bucketScores: { sales: 6, lead_gen: 2 }, template: "B",
  orderVariant: "B-convert", tier: "M", agentIds: ["deals-inbound", "deals-reply-handling"], classifierVersion: "kw-1",
  agentsVersion: "2026-10-04", secondsToResult: 48, contactErrors: ["bot", "bot"], planDepth: 2, filmPlayed: true,
  filmPct: 50, ctaFrom: "hero", ctaClicked: true, webdriver: false, planView: "still", stillReason: "reduced_motion",
  discsOpened: ["deals"],
};
