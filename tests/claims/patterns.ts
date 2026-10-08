/**
 * (C) The claims check's patterns (spec §12, Appendix A). Each rule runs on one sentence at a time.
 * Lines that may put 33 next to "today" are named by ID, and their filled-in sentences are allowed
 * wherever they appear (the plan, the email, the meta description).
 */
export interface ClaimRule { id: string; why: string; test(sentence: string): boolean }

const has = (re: RegExp) => (s: string) => re.test(s);
const both = (a: RegExp, b: RegExp) => (s: string) => a.test(s) && b.test(s);

export const RULES: ClaimRule[] = [
  { id: "free", why: "\"free audit\"; any free session (Appendix A, Price)", test: has(/\bfree\s+(?:business\s+)?(?:audit|consult\w*|session|call|analysis|strategy)/i) },
  { id: "price", why: "a price figure outside S5's bands (§12)", test: has(/[₹$€£]\s?\d|\b(?:rs\.?|inr|usd)\s?\d|\d\s?(?:rupees|dollars|inr|usd)\b|\bsave\s+[₹$]/i) },
  { id: "old-counts", why: "\"127 jobs\", \"30 agents\", \"107\", \"11 run\" (§12)", test: has(/\b127\b|\b30\s+agents\b|\b107\b|\b11\s+run/i) },
  { id: "runs", why: "\"run end-to-end\", \"jobs live\", \"all demoable\" (§12)", test: has(/\brun\s+end[- ]to[- ]end\b|\bjobs\s+live\b|\ball\s+demoable\b/i) },
  { id: "33-today", why: "33 in a sentence with running, live, built, ready or today (§12)", test: both(/\b33\b/, /\b(?:running|live|built|ready|today)\b/i) },
  { id: "our-33", why: "\"our 33 agents\", \"33 AI employees\" (§12)", test: has(/\bour\s+33\b|\b33\s+AI\s+employees\b/i) },
  { id: "spine-live", why: "\"Spine\" in a sentence with \"live\" (§12)", test: both(/\bSpine\b/, /\blive\b/i) },
  { id: "proof", why: "\"case stud\" or \"testimonial\" on a funnel page (§12)", test: has(/case\s+stud|testimonial/i) },
  { id: "value", why: "\"AI that pays for itself\"; \"cheaper than hiring\" (Appendix A)", test: has(/pays?\s+for\s+itself|cheaper\s+than\s+hiring/i) },
  { id: "users", why: "\"used by clients\", \"trusted by businesses\" (Appendix A)", test: has(/used\s+by\s+clients|trusted\s+by\s+businesses/i) },
  { id: "agent-state", why: "\"ready agent\", \"live agent\" (Appendix A)", test: has(/\b(?:ready|live)\s+agents?\b/i) },
  { id: "calls", why: "\"an AI calls every lead inside 60 s\" (Appendix A)", test: has(/calls?\s+every\s+lead/i) },
];

/** Appendix A: "The only lines that may put 33 in the same sentence as 'today'". */
export const ALLOWED_33_TODAY = ["sp.hero.h", "ph.hero.h", "em.need", "em.need.fallback", "seo.home.desc"];
/** S5's revenue bands are the only figures with a currency sign (§12). */
export const ALLOWED_PRICE = ["s5.o.IN", "s5.o.other"];

export const sentences = (text: string) =>
  text.split(/(?<=[.!?…])\s+|\n+/).map((s) => s.replace(/\s+/g, " ").trim()).filter(Boolean);

/** Elements that start a new line when a browser draws them. */
const BLOCKS = "address,article,aside,blockquote,br,button,dd,div,dl,dt,figcaption,figure,footer,form,h1,h2,h3,h4,h5,h6,header,hr,label,li,main,nav,ol,p,pre,section,summary,table,td,th,tr,ul";

/**
 * An element's words with a line break around every block. textContent runs neighbouring blocks
 * together ("…you need only 6 today.Here they are"), which would merge two sentences into one.
 * It adds text nodes to the element, so pass a freshly parsed copy.
 */
// A viewport variant (Tailwind's max-[…]:hidden / min-[…]:hidden pairs) is text one screen size reads on its own.
const VARIANTS = '[class*=":hidden"]';

export function readableText(root: Element): string {
  for (const el of root.querySelectorAll(`${BLOCKS},${VARIANTS}`)) {
    el.before("\n");
    el.after("\n");
  }
  return root.textContent ?? "";
}

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** A raw line's sentences as patterns, each {placeholder} matching any text. */
export const templatePatterns = (line: string) =>
  sentences(line).map((s) => new RegExp(`^${escape(s).replace(/\\\{[^}]*\\\}/g, ".+?")}$`, "i"));

/** The filled-in forms of the lines Appendix A lets put 33 next to "today". Pass COPY_LINES. */
export const allowedSentences = (lines: Readonly<Record<string, string>>) =>
  ALLOWED_33_TODAY.flatMap((id) => templatePatterns(lines[id] ?? ""));

export interface ScanOptions { id?: string; allowedSentences?: RegExp[] }

/** Every rule a text breaks, as `rule: "sentence"`. */
export function findClaims(text: string, { id, allowedSentences = [] }: ScanOptions = {}): string[] {
  return sentences(text).flatMap((sentence) =>
    RULES.filter((rule) => {
      if (!rule.test(sentence)) return false;
      if (rule.id === "33-today" && id && ALLOWED_33_TODAY.includes(id)) return false;
      if (rule.id === "33-today" && allowedSentences.some((re) => re.test(sentence))) return false;
      if (rule.id === "price" && id && ALLOWED_PRICE.includes(id)) return false;
      return true;
    }).map((rule) => `${rule.id}: "${sentence}"`),
  );
}
