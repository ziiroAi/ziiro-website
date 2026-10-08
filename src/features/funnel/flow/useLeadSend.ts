/**
 * (C) S7's send (spec §4.3, §10, §13.2; index §1.3). S8 shows at once, the plan is composed on the device, and the lead
 * goes to /lead with the spam check's token. After S8's lines the visitor sees the plan, or S7 once more (D18).
 * S8's clock is Date.now(), counted from the tap.
 */
import { useCallback, useRef, type Dispatch } from "react";
import { LEAD_TIMEOUT_MS } from "@/features/funnel/data/light";
import { loadPlanData, loadPlanPage } from "./plan-chunk";
import type { CheckedContact, FlowEnv, TokenSource } from "./screens/types";
import { S8_MIN_MS, TOKEN_WAIT_MS, afterSend, leadRequest, postLead } from "./send";
import { setLeadContact } from "./session";
import type { FlowAction, FlowState, SendResult } from "./state";
import { markLeadSent } from "./visit-id";
import { problemTextFrom } from "./words";

/** S8's hold. Nothing left to hold resolves at once, so a send that used up its 8 s goes straight on. */
const wait = (ms: number) => (ms <= 0 ? Promise.resolve() : new Promise<void>((resolve) => setTimeout(resolve, ms)));
const FAILED: SendResult = { to: "s7", error: "server", field: null, line: "g.error" };

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
        const token = await widget.waitForToken(Math.min(TOKEN_WAIT_MS, LEAD_TIMEOUT_MS - elapsed()));
        const body = leadRequest({ visitId: visit.id, retry: isRetry, contact, token, answers, words, plan });
        const result = afterSend(await postLead(body, LEAD_TIMEOUT_MS - elapsed()), isRetry);
        await Promise.all([wait(S8_MIN_MS - elapsed()), result.to === "plan" ? loadPlanPage().catch(() => undefined) : undefined]);
        if (result.to === "s7") widget.reset();  // a token is single use: the second try needs a fresh one
        dispatch({ type: "sendFinished", result });
      } catch {
        // The plan couldn't be composed or its code didn't load: no lead went out, so S7 offers the send again.
        widget.reset();
        dispatch({ type: "sendFinished", result: FAILED });
      } finally {
        sending.current = false;
      }
    },
    [state, dispatch, starter],
  );
}
