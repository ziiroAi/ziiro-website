// (C) §6.7 and D28: how bright each of the 9 discs glows. With no plan every disc glows, as in r17. With a plan, the
// discs of its departments stay lit and the rest, the end discs included, keep 12 % of their glow.
import { DEPARTMENT_DISC, DISCS, type DepartmentId, type DiscId } from "../data/contract";

export const QUIET_LEVEL = 0.12;

export type DiscLevels = Readonly<Record<DiscId, number>>;

export function discLevels(lit?: readonly DepartmentId[]): DiscLevels {
  const litDiscs = new Set(lit?.map((department) => DEPARTMENT_DISC[department]));
  const level = (disc: DiscId): number => (!lit || litDiscs.has(disc) ? 1 : QUIET_LEVEL);
  return Object.freeze(Object.fromEntries(DISCS.map((disc) => [disc, level(disc)])) as Record<DiscId, number>);
}
