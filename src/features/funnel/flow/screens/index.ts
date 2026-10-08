/** (C) Which component shows each screen. Tasks 6, 7, 8, 10, 12 and 13 add theirs. */
import type { ComponentType } from "react";
import type { Screen } from "../state";
import { Landing } from "./Landing";
import type { ScreenProps } from "./types";

export const SCREEN_UI: Readonly<Partial<Record<Screen, ComponentType<ScreenProps>>>> = {
  s1: Landing,
};
