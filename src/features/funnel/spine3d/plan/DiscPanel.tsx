// (C) W14-F (e): the disc panel, §6.2 "Opening a disc", with its content and copy IDs unchanged. Hover, tap or
// keyboard focus on a disc opens it; Escape closes it, and the caller puts focus back on the disc. A panel opened by
// a tap or Enter takes focus; one opened by hover or focus leaves it where it is.
import { useEffect, useId, useRef } from "react";
import { copy } from "../../data";
import type { AgentId, DiscId } from "../../data/contract";
import { departmentForDisc, panelRows } from "./discCopy";

const MICRO = "font-mono text-xs uppercase tracking-[0.18em] text-[color:var(--funnel-muted)]";

export interface DiscPanelProps {
  disc: DiscId;
  planAgentIds: readonly AgentId[];
  onClose: () => void;
  focusOnOpen?: boolean;
  className?: string;
}

export function DiscPanel({ disc, planAgentIds, onClose, focusOnOpen = false, className = "" }: DiscPanelProps): JSX.Element | null {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const department = departmentForDisc(disc);

  useEffect(() => {
    if (!department) return undefined;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [department, onClose]);

  useEffect(() => {
    if (focusOnOpen) panelRef.current?.focus();
  }, [focusOnOpen]);

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
