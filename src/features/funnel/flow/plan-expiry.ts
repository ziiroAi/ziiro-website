/**
 * (C) W24-C3, review N-4: the kept plan (resume.ts) leaves sessionStorage 30 minutes after it was first kept, on
 * whatever page the visitor is on, as /privacy section 05 says. main.tsx runs it at boot on every route; resume.ts
 * runs it when a visit's plan is first kept. No imports, so the entry chunk stays as it was.
 */
export const PLAN_KEY = "ziiro.funnel.plan";
/** A kept plan older than this is dropped, even on its own visit (review C-2). */
export const KEEP_MS = 30 * 60 * 1000;

let timer: ReturnType<typeof setTimeout> | null = null;

function savedAtOf(storage: Storage): number | null {
  const raw = storage.getItem(PLAN_KEY);
  if (raw === null) return null;
  const savedAt = (JSON.parse(raw) as { savedAt?: unknown } | null)?.savedAt;
  return typeof savedAt === "number" ? savedAt : 0;  // no time on it: an older build's copy, dropped now
}

/** Drops the kept plan if it has expired, else sets a timer for the moment it does. */
export function dropExpiredPlan(now = Date.now()): void {
  try {
    const storage = window.sessionStorage;
    const savedAt = savedAtOf(storage);
    if (timer) clearTimeout(timer);
    timer = null;
    if (savedAt === null) return;
    const left = savedAt + KEEP_MS - now;
    if (left <= 0) storage.removeItem(PLAN_KEY);
    else timer = setTimeout(() => dropExpiredPlan(), left + 1);
  } catch {
    // Blocked or unreadable storage holds no plan; resume.ts's copy in memory checks its own age.
  }
}
