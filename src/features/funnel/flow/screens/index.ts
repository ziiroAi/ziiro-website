/** (C) Which component shows each screen. */
import type { ComponentType } from "react";
import type { Screen } from "../state";
import { Analysing } from "./Analysing";
import { BusinessType } from "./BusinessType";
import { ContactForm } from "./ContactForm";
import { Landing } from "./Landing";
import { NonOwner } from "./NonOwner";
import { PlanScreen } from "./Plan";
import { Problem } from "./Problem";
import { Revenue } from "./Revenue";
import type { ScreenProps } from "./types";
import { YearsTeam } from "./YearsTeam";

export const SCREEN_UI: Readonly<Partial<Record<Screen, ComponentType<ScreenProps>>>> = {
  s1: Landing,
  s1b: NonOwner,
  s2: BusinessType,
  s34: YearsTeam,
  s5: Revenue,
  s6: Problem,
  s7: ContactForm,
  s8: Analysing,
  plan: PlanScreen,
};
