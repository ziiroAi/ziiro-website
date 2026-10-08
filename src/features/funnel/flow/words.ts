/**
 * (C) What S6's box means (spec §4.3, §4.4; Review Focus 1). The box opens with s6.text, a sentence starter with
 * blanks, and most people type into it rather than clearing it. Only what they wrote counts.
 */
import { LIMITS, type ChipId, type InputMode } from "@/features/funnel/data/light";

export const BLANK = "___";

/** Their words, without the starter's unfilled parts. "" when nothing of their own is left. */
export function problemTextFrom(value: string, starter: string): string {
  const leadIns = starter.split(BLANK).slice(0, -1);   // "Honestly, I'm struggling with ", " because "
  const unblanked = leadIns
    .reduce((text, leadIn) => text.replace(`${leadIn}${BLANK}`, ""), value)
    .split(BLANK)
    .join(" ");
  const tidy = unblanked
    .replace(/\s+/g, " ")
    .replace(/\s+([.,;:!?])/g, "$1")
    .replace(/^[\s.,;:!?-]+/, "")
    .trim();
  return /[\p{L}\p{N}]/u.test(tidy) ? tidy.slice(0, LIMITS.problemTextChars) : "";
}

/** typed, chips or mixed (§9). "voice" comes with phase 2. */
export function inputModeOf(problemText: string, chips: readonly ChipId[]): InputMode {
  if (problemText && chips.length > 0) return "mixed";
  return chips.length > 0 ? "chips" : "typed";
}
