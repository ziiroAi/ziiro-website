/**
 * (C) The visit's ID (spec §13.2): a v4 UUID kept in sessionStorage, or in memory when storage is blocked (§10).
 * A visit that sent its lead is over: a reload, or leaving the plan, starts a new one (§4.1).
 */
import { STEPS, isOneOf, type StepId } from "@/features/funnel/data/light";

export interface StoredVisit { id: string; lead: boolean; step: StepId }

const KEY = "ziiro.funnel.visit";
let memory: StoredVisit | null = null;

/** crypto.randomUUID, else a v4 UUID from getRandomValues: iOS Safari before 15.4 has no randomUUID (review M5). */
function uuid(): string {
  if (typeof crypto.randomUUID === "function") return crypto.randomUUID();
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;  // version 4
  bytes[8] = (bytes[8] & 0x3f) | 0x80;  // variant 10xx
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
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
