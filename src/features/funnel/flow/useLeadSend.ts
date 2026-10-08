/**
 * (C) S7's send (spec §4.3, §10, §13.2; index §1.3). S8 shows at once, the plan is composed on the device, and the lead
 * goes to /lead with the spam check's token. After S8's lines the visitor sees the plan, or S7 once more (D18).
 * S8's clock is Date.now(), counted from the tap.
 */
import { useCallback, useRef, type Dispatch } from "react";
import { loadPlanData, loadPlanPage } from "./plan-chunk";
import type { CheckedContact, FlowEnv, TokenSource } from "./screens/types";
import { LEAD_BUDGET_MS, S8_MIN_MS, TOKEN_WAIT_MS, afterSend, leadRequest, postLead } from "./send";
import { setLeadContact } from "./session";
import type { FlowAction, FlowState, SendResult } from "./state";
import { markLeadSent } from "./visit-id";
import { problemTextFrom } from "./words";

/** S8's hold. Nothing left to hold resolves at once, so a send that used up its time goes straight on. */
const wait = (ms: number) => (ms <= 0 ? Promise.resolve() : new Promise<void>((resolve) => setTimeout(resolve, ms)));
const FAILED: SendResult = { to: "s7", error: "server", field: null, line: "g.error" };
/** A second try that failed before /lead: never S7 again (D18, review H2). The plan's frame says so and offers a call. */
const GAVE_UP: SendResult = { to: "plan", notice: "fail", error: "server" };

export function useLeadSend(state: FlowState, dispatch: Dispatch<FlowAction>, starter: string): FlowEnv["send"] {
  const sending = useRef(false);

  return useCallback(
    async (widget: TokenSource, contact: CheckedContact) => {
      if (sending.current) return;  // a double tap sends one lead
      sending.current = true;
      const startedAt = Date.now();
      const elapsed = () => Date.now() - startedAt;
      const isRetry = state.attempt >= 1;
      const { answers } = state;
      const words = { problemText: problemTextFrom(answers.problemText, starter), chips: [...answers.chips] };
      const visitor = { name: contact.name, email: contact.email };
      dispatch({ type: "sendStarted", visitor });
      setLeadContact(visitor);
      const visit = markLeadSent();
      try {
        const { teamBand, revenueBand, revenueCurrency } = answers;
        if (!teamBand || !revenueBand || !revenueCurrency) throw new Error("S7 was reached without S4 and S5");
        const { composePlan } = await loadPlanData();
        const plan = composePlan({ teamBand, revenueBand, currency: revenueCurrency, chips: words.chips, problemText: words.problemText });
        dispatch({ type: "planReady", plan });
        const token = await widget.waitForToken(TOKEN_WAIT_MS);
        const body = leadRequest({ visitId: visit.id, retry: isRetry, contact, token, answers, words, plan });
        const result = afterSend(await postLead(body, LEAD_BUDGET_MS), isRetry);
        await Promise.all([wait(S8_MIN_MS - elapsed()), result.to === "plan" ? loadPlanPage().catch(() => undefined) : undefined]);
        if (result.to === "s7") widget.reset();  // a token is single use: the second try needs a fresh one
        dispatch({ type: "sendFinished", result });
      } catch {
        // The plan couldn't be composed or its code didn't load, twice over: no lead went out. S7 offers the send
        // once more; after that the plan's frame shows sp.save.fail and the booking link.
        if (!isRetry) widget.reset();
        dispatch({ type: "sendFinished", result: isRetry ? GAVE_UP : FAILED });
      } finally {
        sending.current = false;
      }
    },
    [state, dispatch, starter],
  );
}
