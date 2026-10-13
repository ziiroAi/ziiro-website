/**
 * (C) S9 when no plan could be made on the device (review H2): its code didn't load, so the lead went with the
 * fallback plan. The plan's frame still opens with what's true: the plan is on its way by email, or, if the send
 * failed too, the page couldn't show it. Either way with their booking link (D18, review M4's note).
 */
import { PlanFailed, PlanScreen } from "./Plan";
import type { ScreenProps } from "./types";

/** The plan when there is one, else its frame with the note. */
export function PlanOrNoPlan(props: ScreenProps) {
  const { plan, visitor, saveNotice } = props.state;
  if (plan) return <PlanScreen {...props} />;
  if (!visitor) return null;
  return (
    <div className="f-plan" tabIndex={-1} data-question="">
      <PlanFailed visitor={visitor} saveNotice={saveNotice} />
    </div>
  );
}
