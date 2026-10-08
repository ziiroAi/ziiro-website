// (C) The owner's 9 disc gaps (full-gaps.json, via worker-3's look.ts): glTF model space of his full spine (Y up,
// model units), bottom first, so index i is disc G0i (contract.ts DISCS).
import { LOOK, type Gap } from "./look";

export type { Gap };

export const GAPS: readonly Gap[] = LOOK.gaps;
