// (C) W14-F (e): the disc panel, §6.2 "Opening a disc", with its content and copy IDs unchanged. Hover, tap or
// keyboard focus on a disc opens it; Escape closes it. A panel opened by a tap or Enter takes focus, and gives it back
// (to returnFocusTo, else to what had it) when it closes or moves to another disc; one opened by hover or focus leaves
// focus where it is.
import { type RefObject, useEffect, useId, useRef } from "react";
import { copy } from "../../data";
import type { AgentId, DiscId } from "../../data/contract";
import { departmentForDisc, panelRows } from "./discCopy";

const MICRO = "font-mono text-xs uppercase tracking-[0.18em] text-[color:var(--funnel-muted)]";

export interface DiscPanelProps {
  disc: DiscId;
  planAgentIds: readonly AgentId[];
  onClose: () => void;
  focusOnOpen?: boolean;
  /** Where focus goes when the panel closes; defaults to whatever had focus when it took focus. */
  returnFocusTo?: RefObject<HTMLElement>;
  className?: string;
}

export function DiscPanel({
  disc, planAgentIds, onClose, focusOnOpen = false, returnFocusTo, className = "",
}: DiscPanelProps): JSX.Element | null {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const department = departmentForDisc(disc);

  useEffect(() => {
    if (!department) return undefined;
    const onKey = (event: KeyboardEvent) => {
      if (event.defaultPrevented) return;
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [department, onClose]);

  useEffect(() => {
    const panel = panelRef.current;
    if (!focusOnOpen || !panel) return undefined;
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const giveBackTo = returnFocusTo?.current ?? previous;
    panel.focus();
    return () => {
      const active = document.activeElement;
      const focusLeftWithPanel = active === null || active === document.body || panel.contains(active);
      if (focusLeftWithPanel) giveBackTo?.focus();
    };
  }, [focusOnOpen, disc, returnFocusTo]);

  if (!department) return null;
  return (
    <div
      ref={panelRef}
      role="dialog"
      aria-modal="false"
      aria-labelledby={titleId}
      tabIndex={-1}
      data-disc={disc}
      className={`rounded-2xl border border-[color:var(--funnel-line)] bg-[color:var(--funnel-card)] p-5 shadow-lg ${className}`}
    >
      <h3 id={titleId} className="text-lg font-medium">{copy("sp.vert.dept", { department: department.name })}</h3>
      <ul className="mt-4 flex flex-col gap-4">
        {panelRows(department, planAgentIds).map((row) => (
          <li key={row.id} data-today={row.today}>
            <p className="font-medium">{copy("sp.vert.title", { v: row.number, "agent name": row.name })}</p>
            <p className="mt-1 text-sm text-[color:var(--funnel-muted)]">{copy("sp.vert.line", { "agent line": row.line })}</p>
            <p className={`mt-2 ${MICRO}`}>{copy(row.today ? "sp.vert.today" : "sp.vert.later")}</p>
            <p className="mt-1 text-sm">{copy("sp.vert.jobs", { j: row.jobs })}</p>
            {row.live > 0 && (
              <p data-live className="mt-1 text-sm">{copy("sp.vert.live", { k: row.live, j: row.jobs })}</p>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
