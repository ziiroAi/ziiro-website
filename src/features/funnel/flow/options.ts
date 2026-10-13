/** (C) Each screen's option IDs (contract.ts) paired with their labels (copy lines), in display order (index §1.2). */
import {
  BUSINESS_TYPES, CHIPS, NON_OWNER_REASONS, REVENUE_BANDS, SEGMENTS, TEAM_BANDS, YEARS_BANDS, copy,
  type Currency, type RevenueBand,
} from "@/features/funnel/data/light";

export interface Option<T extends string> { id: T; label: string }

/** Item i of a " · " line, paired with ID i. Throws when the counts differ, so a copy edit can't shift answers. */
export function listOptions<T extends string>(ids: readonly T[], lineId: string): Option<T>[] {
  const labels = copy(lineId).split(" · ");
  if (labels.length !== ids.length) throw new Error(`${lineId} has ${labels.length} items, expected ${ids.length}`);
  return ids.map((id, i) => ({ id, label: labels[i] }));
}

/** IDs paired with numbered lines: s1.o1 to s1.o5. */
export function numberedOptions<T extends string>(ids: readonly T[], prefix: string): Option<T>[] {
  return ids.map((id, i) => ({ id, label: copy(`${prefix}${i + 1}`) }));
}

const BANDS = REVENUE_BANDS.filter((band) => band !== "undisclosed");

export const segmentOptions = () => numberedOptions(SEGMENTS, "s1.o");
export const nonOwnerOptions = () => numberedOptions(NON_OWNER_REASONS, "s1b.o");
export const businessOptions = () => listOptions(BUSINESS_TYPES, "s2.o");
export const yearsOptions = () => listOptions(YEARS_BANDS, "s3.o");
export const teamOptions = () => listOptions(TEAM_BANDS, "s4.o");
export const chipOptions = () => listOptions(CHIPS, "s6.chips");

/** S5: the five bands in the visitor's currency (D10), then s5.skip, which is a full answer. */
export function revenueOptions(currency: Currency): Option<RevenueBand>[] {
  return [...listOptions(BANDS, currency === "INR" ? "s5.o.IN" : "s5.o.other"), { id: "undisclosed", label: copy("s5.skip") }];
}
