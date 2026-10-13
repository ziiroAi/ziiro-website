// templates.md §1 and §5.2 rule 1: their words, cleaned before matching.

/** Spelling variants, joined before matching. A Map, so a typed word like "constructor" can't reach Object.prototype. */
const TOKEN_VARIANTS: ReadonlyMap<string, string> = new Map([
  ["nahin", "nahi"], ["nai", "nahi"], ["nhi", "nahi"],
  ["paise", "paisa"], ["pese", "paisa"],
  ["inquiry", "enquiry"], ["enquery", "enquiry"],
  ["followup", "follow up"],
  ["watsapp", "whatsapp"], ["wa", "whatsapp"],
  ["leads", "lead"], ["clients", "client"],
  ["horaha", "ho raha"], ["rha", "raha"],
  ["thik", "theek"],
]);
const VARIATION_SELECTORS_AND_JOINERS = /[\uFE00-\uFE0F\u200C\u200D]/g;
const APOSTROPHES = /['\u2018\u2019`]/g;
const NOT_A_WORD = /[^\p{L}\p{M}\p{N}\s]/gu;
const STRETCHED = /([a-z])\1{2,}/g;

/** Lower case; no punctuation, emoji or apostrophes; a letter typed 3 or more times in a row kept once; variants joined. */
export function normalise(text: string): string {
  const cleaned = text
    .normalize("NFC")
    .toLowerCase()
    .replace(VARIATION_SELECTORS_AND_JOINERS, "")
    .replace(APOSTROPHES, "")
    .replace(NOT_A_WORD, " ")
    .replace(STRETCHED, "$1");
  return cleaned
    .split(/\s+/)
    .filter((word) => /[\p{L}\p{N}]/u.test(word))
    .map((word) => TOKEN_VARIANTS.get(word) ?? word)
    .join(" ");
}

export function tokens(text: string): string[] {
  const clean = normalise(text);
  return clean === "" ? [] : clean.split(" ");
}
