/**
 * (C) S9 when no plan could be made (review H2): the plan's code failed to load on both tries, so no lead went out.
 * The plan's frame still opens, with sp.save.fail and the booking link, so the visitor has a way forward (D18).
 */
import { copy } from "@/features/funnel/data/light";
import { INTERIM_BOOKING_URL } from "@/features/pricing/entities/rates";
import { PlanScreen } from "./Plan";
import type { ScreenProps } from "./types";

function NoPlan() {
  return (
    <div className="f-plan" tabIndex={-1} data-question="">
      <p className="f-err" role="alert">{copy("sp.save.fail")}</p>
      <a className="f-act" href={INTERIM_BOOKING_URL}>{copy("nav.btn")}</a>
    </div>
  );
}

/** The plan when there is one, else its frame with the notice. */
export function PlanOrNoPlan(props: ScreenProps) {
  return props.state.plan ? <PlanScreen {...props} /> : <NoPlan />;
}
