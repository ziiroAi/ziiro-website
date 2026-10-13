// §6.3: their words, quoted on the plan. And S6's starter line, which isn't their words.
import { copy } from "./copy.js";

/** Spaces, full stops, commas, colons, ? ! … the danda and double danda, and dashes. */
const TRAILING = /[\s.,;:!?\u2026\u0964\u0965\-\u2013\u2014]+$/u;
const BLANKS = /_{2,}/g;

const stripTrailing = (text: string): string => text.replace(TRAILING, "");

/** Their words on one line, trailing punctuation off, cut to `max` characters (code points) ending in "…". */
export function quoteWords(text: string, max: number): string {
  const oneLine = stripTrailing(text.trim().replace(/\s+/g, " "));
  const chars = [...oneLine];
  if (chars.length <= max) return oneLine;
  return `${stripTrailing(chars.slice(0, max - 1).join(""))}…`;
}

/** S6: the untouched starter line (s6.text) counts as nothing typed, and blanks left unfilled go. */
export function cleanProblemText(text: string): string {
  const trimmed = text.trim();
  if (trimmed === copy("s6.text").trim()) return "";
  return trimmed.replace(BLANKS, " ").replace(/[ \t]{2,}/g, " ").trim();
}
