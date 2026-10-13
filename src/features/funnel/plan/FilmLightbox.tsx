// §6.5: hx.btn2 opens the launch film in a lightbox named r.film.title. The film is lane D's BrandFilm, the
// click-to-play player, rendered as it is. Its frame already shows r.film.title, so the dialog only takes it as its
// aria-label (00-index §1.5, request 13). Media events don't bubble, so the dialog listens in the capture phase to
// report film_played and film_pct (§9) without reaching into BrandFilm.
import { useEffect, useRef } from "react";
import BrandFilm from "../../home/sections/BrandFilm";
import { copy } from "../data";
import { FILM_PCTS } from "../data/contract";
import type { FilmPct, PlanProgress } from "../data/contract";

export interface FilmLightboxProps {
  open: boolean;
  onClose(): void;
  onProgress(fields: PlanProgress): void;
}

/** The last quarter of the film reached: 0, 25, 50, 75 or 100. */
export function filmPctFor(currentTime: number, duration: number): FilmPct {
  if (!(duration > 0)) return 0;
  const pct = (currentTime / duration) * 100;
  return [...FILM_PCTS].reverse().find((p) => pct >= p) ?? 0;
}

const FOCUSABLE = 'a[href], button:not([disabled]), video[controls], [tabindex]:not([tabindex="-1"])';

/** Keeps Tab and Shift+Tab inside the dialog. */
function trapTab(e: KeyboardEvent, dialog: HTMLElement): void {
  const focusable = Array.from(dialog.querySelectorAll<HTMLElement>(FOCUSABLE));
  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  if (!first || !last) return;
  if (e.shiftKey && document.activeElement === first) {
    e.preventDefault();
    last.focus();
  } else if (!e.shiftKey && document.activeElement === last) {
    e.preventDefault();
    first.focus();
  }
}

export function FilmLightbox({ open, onClose, onProgress }: FilmLightboxProps): JSX.Element | null {
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const latest = useRef({ onClose, onProgress });
  const reported = useRef<{ played: boolean; pct: FilmPct }>({ played: false, pct: 0 });

  useEffect(() => {
    latest.current = { onClose, onProgress };
  }, [onClose, onProgress]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!open || !dialog) return undefined;
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();

    const reportPct = (pct: FilmPct) => {
      if (pct <= reported.current.pct) return;
      reported.current = { ...reported.current, pct };
      latest.current.onProgress({ filmPct: pct });
    };
    const onPlay = () => {
      if (reported.current.played) return;
      reported.current = { ...reported.current, played: true };
      latest.current.onProgress({ filmPlayed: true });
    };
    const onTime = (e: Event) => {
      const video = e.target as HTMLVideoElement;
      reportPct(filmPctFor(video.currentTime, video.duration));
    };
    const onEnded = () => reportPct(100);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") latest.current.onClose();
      if (e.key === "Tab") trapTab(e, dialog);
    };

    dialog.addEventListener("play", onPlay, true);
    dialog.addEventListener("timeupdate", onTime, true);
    dialog.addEventListener("ended", onEnded, true);
    document.addEventListener("keydown", onKey);
    return () => {
      dialog.removeEventListener("play", onPlay, true);
      dialog.removeEventListener("timeupdate", onTime, true);
      dialog.removeEventListener("ended", onEnded, true);
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
      opener?.focus();
    };
  }, [open]);

  if (!open) return null;
  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-label={copy("r.film.title")}
      className="fixed inset-0 z-50 overflow-y-auto bg-[color:var(--funnel-bg)] text-[color:var(--funnel-fg)]"
    >
      <div className="absolute inset-x-0 top-0 z-10 flex items-center justify-end px-4 py-4 sm:px-6 lg:px-10">
        <button
          ref={closeRef}
          type="button"
          onClick={() => latest.current.onClose()}
          className="min-h-11 min-w-11 rounded-full border border-[color:var(--funnel-line)] px-4 text-sm"
        >
          {copy("r.film.close")}
        </button>
      </div>
      <BrandFilm />
      <p className="px-4 pb-8 text-center text-sm text-[color:var(--funnel-muted)]">{copy("r.film.cap")}</p>
    </div>
  );
}
