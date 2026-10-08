/** (C) The questions' small parts (spec §4.1, §11). Words come from copy lines; styles from flow.css. */
import type { ReactNode } from "react";
import { copy } from "@/features/funnel/data/light";
import { PROGRESS, PROGRESS_TOTAL, type Screen } from "./state";

/** A screen's question: an H2 that takes focus on each step (§11.2). focusFirst wins over the first H2. */
export function Question({ id, focusFirst = false, children }: { id?: string; focusFirst?: boolean; children: ReactNode }) {
  return (
    <h2 id={id} className="f-q" tabIndex={-1} data-question="" data-focus-first={focusFirst ? "" : undefined}>
      {children}
    </h2>
  );
}

export interface OptionButtonProps {
  label: string;
  onPick(): void;
  kind?: "option" | "tile" | "chip";
  selected?: boolean;   // shown as chosen, as on S2 after s1.o2; no ARIA state, because tapping moves on
  pressed?: boolean;    // a toggle: S3 + S4's rows and S6's chips (§11.1)
  early?: string;       // S1 only: the ID the head script keeps for a tap made before React runs
  expanded?: boolean;   // S2's Other, which opens a box
  controls?: string;
}

export function OptionButton({ label, onPick, kind = "option", selected = false, pressed, early, expanded, controls }: OptionButtonProps) {
  return (
    <button
      type="button"
      className={`f-${kind}${selected ? " is-selected" : ""}`}
      aria-pressed={pressed}
      aria-expanded={expanded}
      aria-controls={controls}
      data-early={early}
      onClick={() => onPick()}
    >
      {label}
    </button>
  );
}

/** The six-segment bar (§4.1). Hidden from screen readers; FunnelRoot announces g.progress instead. */
function Progress({ screen }: { screen: Screen }) {
  const step = PROGRESS[screen];
  if (!step) return null;
  return (
    <div className="f-bar" aria-hidden="true">
      {Array.from({ length: PROGRESS_TOTAL }, (_, i) => (
        <span key={i} className={i < step ? "is-on" : undefined} />
      ))}
    </div>
  );
}

/** One step back through the browser's history, so its Back button and this arrow agree (§4.1). */
function BackArrow() {
  return (
    <button type="button" className="f-back" aria-label={copy("g.back")} onClick={() => window.history.back()}>
      <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true" focusable="false">
        <path d="M12.5 4.5 7 10l5.5 5.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  );
}

/** The top of each screen: the Back arrow on every screen after S1, then the bar. */
export function TopRow({ screen, back = true }: { screen: Screen; back?: boolean }) {
  return (
    <div className="f-top">
      {back && <BackArrow />}
      <Progress screen={screen} />
    </div>
  );
}

/** Privacy opens in a new tab, because a reload would start the questions again (D8, Review Focus 5). */
export function PrivacyLink({ label }: { label: string }) {
  return (
    <a className="f-link" href="/privacy" target="_blank" rel="noopener noreferrer">
      {label}
    </a>
  );
}

/** g.footer under the questions: the sentence, then Privacy as a link. */
export function FlowNote() {
  const [text, link] = copy("g.footer").split(" · ");
  return (
    <p className="f-note">
      {text} · <PrivacyLink label={link} />
    </p>
  );
}
