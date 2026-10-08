/**
 * (C) The visit's ID (spec §13.2): a v4 UUID kept in sessionStorage, or in memory when storage is blocked (§10).
 * A visit that sent its lead is over: a reload, or leaving the plan, starts a new one (§4.1).
 */
import { STEPS, isOneOf, type StepId } from "@/features/funnel/data/light";

export interface StoredVisit { id: string; lead: boolean; step: StepId }

const KEY = "ziiro.funnel.visit";
let memory: StoredVisit | null = null;

const uuid = () => crypto.randomUUID();
const fresh = (newId: () => string): StoredVisit => ({ id: newId(), lead: false, step: "S0" });

function isStoredVisit(value: unknown): value is StoredVisit {
  const visit = value as Partial<StoredVisit> | null;
  return typeof visit?.id === "string" && typeof visit.lead === "boolean" && isOneOf(STEPS, visit.step);
}

function read(): StoredVisit | null {
  try {
    const raw = window.sessionStorage.getItem(KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : null;
    if (isStoredVisit(parsed)) return parsed;
  } catch {
    // Blocked or unreadable storage: the copy in memory decides for this page view.
  }
  return memory;
}

function write(visit: StoredVisit): StoredVisit {
  memory = visit;
  try {
    window.sessionStorage.setItem(KEY, JSON.stringify(visit));
  } catch {
    // Blocked storage (private mode): the visit lives in memory for this page view (§10).
  }
  return visit;
}

export function startVisit(newId: () => string = uuid): StoredVisit {
  const stored = read();
  return write(stored && !stored.lead ? stored : fresh(newId));
}

export function currentVisit(newId: () => string = uuid): StoredVisit {
  return read() ?? write(fresh(newId));
}

export function peekVisit(): StoredVisit | null {
  return read();
}

export function rotateVisit(newId: () => string = uuid): StoredVisit {
  return write(fresh(newId));
}

export function markLeadSent(): StoredVisit {
  return write({ ...currentVisit(), lead: true });
}

/** The furthest step saved. funnelSession's call-button save reuses it; the server only moves last_step forward. */
export function markStep(step: StepId): StoredVisit {
  const visit = currentVisit();
  return STEPS.indexOf(step) > STEPS.indexOf(visit.step) ? write({ ...visit, step }) : visit;
}
