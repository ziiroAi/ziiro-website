/**
 * (C) funnelSession (00-index §1.3): what lane D's header and nav pill read from the funnel. stage() hides the
 * header's links until S9 (D6, §6.2); leadContact() prefills Calendly once S7 has been sent (D14).
 * Type imports only (00-index §1.5), so the header can load it on every page. FunnelRoot sets the rest.
 */
import type { CtaFrom, FunnelSession, FunnelStage } from "@/features/funnel/data/contract";

type Contact = Readonly<{ name: string; email: string }>;

let contact: Contact | null = null;
let stage: FunnelStage = "questions";
let ctaReporter: ((from: CtaFrom) => void) | null = null;
const listeners = new Set<() => void>();

const notify = () => listeners.forEach((onChange) => onChange());

/** Set at S7's send (useLeadSend). For this page view only; nothing typed is stored. */
export function setLeadContact(next: { name: string; email: string } | null): void {
  if (next?.name === contact?.name && next?.email === contact?.email) return;
  contact = next ? Object.freeze({ name: next.name, email: next.email }) : null;
  notify();
}

/** "plan" at S9; "questions" before it, after Back from it, and when the funnel unmounts. */
export function setStage(next: FunnelStage): void {
  if (next === stage) return;
  stage = next;
  notify();
}

/** FunnelRoot saves call-button taps on its visit while it is mounted. With no funnel there's nothing to save. */
export function setCtaReporter(report: ((from: CtaFrom) => void) | null): void {
  ctaReporter = report;
}

export const funnelSession: FunnelSession = {
  leadContact: () => contact,  // the same object until it changes, as useSyncExternalStore needs
  reportCta: (from) => ctaReporter?.(from),
  stage: () => stage,
  subscribe(onChange) {
    listeners.add(onChange);
    return () => {
      listeners.delete(onChange);
    };
  },
};
