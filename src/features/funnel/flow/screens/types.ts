/** (C) What every screen gets from FunnelRoot. */
import type { Boot } from "../boot";
import type { FlowAction, FlowState } from "../state";

/** What S7's send needs from the Turnstile widget. useTurnstile (Task 9) returns a superset. */
export interface TokenSource {
  waitForToken(ms: number): Promise<string>;
  reset(): void;
}

/** S7's fields after its checks: the name and email trimmed, the phone in E.164 and absent when blank. */
export interface CheckedContact { name: string; email: string; phone?: string }

export interface FlowEnv {
  boot: Boot;
  introOffsetMs: number | null;   // S0's intro: where it already is; null when it doesn't play
  country: string | null;         // from the first /visit save (Task 14)
  starter: string;                // s6.text
  send(widget: TokenSource, contact: CheckedContact): void;  // S7's "Show me my plan" (Task 13)
}

export interface ScreenProps {
  state: FlowState;
  act(action: FlowAction): void;  // a tap, through the tap gate (Review Focus 2)
  edit(action: FlowAction): void; // typing, ticking and plan progress, straight to the reducer
  env: FlowEnv;
}
