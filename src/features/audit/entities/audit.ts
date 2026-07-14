/**
 * Audit entity: the self-audit's data model and business logic
 * (pain areas, sizing, scoring, and email validation) — free of any
 * UI or transport concern.
 */

export interface PainArea {
  key: string;
  label: string;
  sub: string;
  recommendation: string;
  hrsPerRating: number[];
}

export interface AuditForm {
  name: string;
  email: string;
  industry: string;
  size: string;
}

export interface EmailValidation {
  valid: boolean;
  message: string;
}

const DISPOSABLE_DOMAINS = new Set([
  "mailinator.com","guerrillamail.com","tempmail.com","throwaway.email","yopmail.com",
  "sharklasers.com","guerrillamailblock.com","grr.la","guerrillamail.info","spam4.me",
  "trashmail.com","trashmail.me","trashmail.net","dispostable.com","maildrop.cc",
  "10minutemail.com","10minutemail.net","10minutemail.org","minutemail.com","temp-mail.org",
  "fakeinbox.com","mailnull.com","spamgourmet.com","spamgourmet.net","discard.email",
  "mailnesia.com","mailnull.com","spamspot.com","spamthisplease.com","byom.de",
  "getnada.com","anonaddy.com","tempinbox.com","tempr.email","emailondeck.com",
  "getairmail.com","filzmail.com","zetmail.com","mohmal.com","owlpic.com",
  "cfl.fr","spamfree24.org","spamfree24.de","spamfree24.eu","spamfree24.info",
  "spaml.de","spaml.com","disigntime.com","no-spam.ws","antispam24.de",
  "wegwerfmail.de","wegwerfmail.net","wegwerfmail.org","abcmail.email","armyspy.com",
]);

export function validateEmail(email: string): EmailValidation {
  const trimmed = email.trim();
  if (!trimmed) return { valid: false, message: "" };

  const regex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  if (!regex.test(trimmed)) return { valid: false, message: "Enter a valid email address" };

  const domain = trimmed.split("@")[1]?.toLowerCase();
  if (!domain) return { valid: false, message: "Enter a valid email address" };
  if (DISPOSABLE_DOMAINS.has(domain)) return { valid: false, message: "Disposable emails are not allowed" };

  const parts = domain.split(".");
  if (parts.some((p) => p.length === 0)) return { valid: false, message: "Enter a valid email address" };
  if (parts[parts.length - 1].length < 2) return { valid: false, message: "Enter a valid email address" };

  return { valid: true, message: "Looks good" };
}

export const painAreas: PainArea[] = [
  {
    key: "outreach",
    label: "Self-Optimizing Systems",
    sub: "Marketing, outreach, website, ops",
    recommendation: "A self-optimizing loop can test marketing angles, outreach, website changes, and workflow improvements, then learn from outcomes without guessing forever.",
    hrsPerRating: [0, 0.2, 0.6, 1.2, 2.2, 3.5],
  },
  {
    key: "leadgen",
    label: "Research & Qualification",
    sub: "Prospecting, scoring, context",
    recommendation: "Research agents can identify, enrich, and qualify high-fit leads so founders spend time on conversations instead of list-building.",
    hrsPerRating: [0, 0.2, 0.5, 1.1, 2, 3],
  },
  {
    key: "pipeline",
    label: "UGC Ads & Management",
    sub: "Creators, ads, campaigns",
    recommendation: "A focused UGC system can source creators, organize ad production, and manage campaign iterations without letting content work become the whole business.",
    hrsPerRating: [0, 0.1, 0.4, 0.9, 1.5, 2.2],
  },
  {
    key: "content",
    label: "Role Clarity",
    sub: "Owners, strengths, bottlenecks",
    recommendation: "A role analyzer can reveal who should own which work, where people are miscast, and which responsibilities should move to agents.",
    hrsPerRating: [0, 0.2, 0.5, 1, 1.8, 2.5],
  },
  {
    key: "reporting",
    label: "Control Dashboards",
    sub: "Metrics, insights, reviews",
    recommendation: "A simple command dashboard can show what your agents did, what worked, what failed, and where a human needs to approve next.",
    hrsPerRating: [0, 0.1, 0.4, 0.8, 1.4, 2],
  },
];

export const industries = [
  "SaaS / Software",
  "Startup",
  "Solo Founder",
  "Founder-led Agency",
  "Consulting / Professional Services",
  "Creator-led Business",
  "Community / Education",
  "AI-first Service Business",
  "Other",
];

export const employeeSizes = ["1-5", "6-20", "21-50", "51-200", "200+"];

const HOURLY_VALUE = 30; // conservative $/hr for first-pass time reclaimed

export function calcResults(ratings: Record<string, number>, size: string) {
  const sized = size === "1-5" ? 0.6 : size === "6-20" ? 0.8 : size === "51-200" ? 1.1 : size === "200+" ? 1.2 : 1;

  const areas = painAreas.map((area) => {
    const rating = ratings[area.key] || 0;
    const hrs = +(area.hrsPerRating[rating] * sized).toFixed(1);
    const annual = Math.round(hrs * 52 * HOURLY_VALUE);
    return { ...area, rating, hrs, annual };
  });

  const sorted = [...areas].sort((a, b) => b.hrs - a.hrs);
  const totalHrs = +areas.reduce((s, a) => s + a.hrs, 0).toFixed(1);
  const totalAnnual = areas.reduce((s, a) => s + a.annual, 0);
  const maxHrs = areas.reduce((s, a) => s + (a.hrsPerRating[5] * sized), 0);
  const score = maxHrs > 0 ? Math.round((totalHrs / maxHrs) * 100) : 0;

  return { sorted, totalHrs, totalAnnual, score };
}
