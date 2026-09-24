import { useCallback, useEffect, useRef, useState } from "react";

import { CSS_EASE, DURATION } from "@/shared/motion/tokens";

/**
 * A self-hosted film that starts itself when the reader arrives at it, muted,
 * and stops the moment they leave.
 *
 * The behaviour is the easy part. What makes this safe to put on a home page
 * is what it refuses to do:
 *
 *   1. **Nothing downloads while the page is still loading.** The element
 *      ships `preload="none"`, so parsing the document costs nothing, and the
 *      observers are not even attached until `load` has fired and the main
 *      thread is idle. Distance is not enough on its own here: this frame
 *      sits barely one screen below the fold, so "near the viewport" is true
 *      before the hero has painted. The gate that protects LCP is time.
 *      After that, buffering starts one screen out (WARM_MARGIN) and playback
 *      at PLAY_RATIO — late enough to be a real intent signal, early enough
 *      that the first frame is decoded when the frame arrives.
 *   2. **The poster stays lazy.** It is a real `<img>` underneath the video
 *      rather than the `poster` attribute, because `poster` is fetched
 *      eagerly at parse time and this frame sits well below the fold. The
 *      video paints over it the instant it has something to show.
 *   3. **`src` is in the server-rendered HTML anyway.** `preload="none"`
 *      suppresses the fetch, not the markup, so a crawler finds a real
 *      `<video>` with a real source where the facade player would have handed
 *      it a button. Indexable, and still free.
 *   4. **It never makes noise on its own, and it is never loud.** Muted is
 *      the only state autoplay is allowed in: sound arriving unasked is the
 *      single most hated thing a page can do. Every autoplay-initiated start
 *      re-mutes, so scrolling back to a film you unmuted earlier does not
 *      start it talking without a fresh press. And when the viewer does press
 *      Sound on, it comes up at UNMUTED_VOLUME rather than full — this is a
 *      film playing quietly under a page someone is reading, not a cinema.
 *   5. **The viewer outranks the scroll position.** Press pause, and
 *      scrolling away and back will not restart it. Auto-resume after an
 *      explicit pause is what makes autoplay feel like it is arguing.
 *   6. **It respects a no.** `prefers-reduced-motion: reduce` and Save-Data
 *      both disable autoplay outright — the film is then click-to-play, which
 *      is what those signals are asking for. WCAG 2.2.2 requires anything
 *      moving past five seconds to be stoppable, so the pause control is not
 *      decoration: it is always rendered and always keyboard reachable.
 *
 * A hidden tab is not "in view". IntersectionObserver does not fire on a tab
 * switch, so visibility is tracked separately and both feed one `sync()`.
 */

/** Fraction of the frame on screen before playback starts. Roughly where
 *  ScrollScene's own fade-in has finished, so the film never starts talking
 *  from behind a half-faded block. */
const PLAY_RATIO = 0.45;

/** How early the file starts buffering: one screen out. Distance alone is not
 *  the protection though — see the load gate in the effect. */
const WARM_MARGIN = "400px 0px";

/** Where the lighter encode takes over. Matches Tailwind's `md`, which is the
 *  breakpoint the rest of the site lays out against. */
const NARROW = "(max-width: 767px)";

/** Level the film plays at once the viewer asks for sound. Deliberately low:
 *  this plays under a page someone is reading, and a brand film at full gain
 *  is the thing they close the tab over. They still have the OS volume. */
const UNMUTED_VOLUME = 0.2;

/**
 * The pill stays 29px because anything taller starts competing with the film
 * it is sitting on. The *hit area* does not: the button is a transparent
 * 44x44 box and the pill is painted inside it, so a thumb has the full WCAG
 * 2.5.8 target while the design is unchanged to the pixel. `-my-[7.5px]`
 * cancels the 15px the box gained, the same padding-plus-negative-margin
 * trade the rest of the site made for its mobile targets in 9579a9b.
 *
 * Unconditional rather than behind `(pointer: coarse)`: an invisible box costs
 * a mouse nothing and spares one media query, and a 768px tablet is a touch
 * device that no width-based breakpoint would have caught.
 */
const hit =
  "group pointer-events-auto -my-[7.5px] inline-flex min-h-[44px] min-w-[44px] cursor-pointer items-center justify-center focus-visible:outline-none";

/** The visible control. Hover and focus are driven from the button around it,
 *  so the ring lands tight on the pill rather than on the invisible box. */
/* color-mix, NOT `bg-[var(--background)]/80`. Tailwind cannot apply an alpha
   modifier to a var() colour and silently emits no rule at all, which is the
   house rule about this: verified against the built CSS, where the old class
   produced zero declarations, so this pill had no ground under its label at
   all while sitting on top of a moving film. */
const pill =
  "rounded-full border border-[var(--border)] bg-[color-mix(in_srgb,var(--background)_80%,transparent)] px-3 py-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--text-primary)] backdrop-blur-sm group-hover:bg-[var(--background)] group-focus-visible:bg-[var(--background)] group-focus-visible:ring-1 group-focus-visible:ring-[var(--text-primary)]";

/**
 * A label that never changes its control's width.
 *
 * Both controls below swap their text: Play / Pause / Replay, and Sound on /
 * Sound off. A shorter word made the pill narrower, so the button moved under
 * the pointer at the exact moment it was pressed. Measured at 8.1px on the
 * sound toggle, which is small and is still the page twitching while someone
 * is using it.
 *
 * Every option is rendered into the SAME grid cell, so the cell is as wide as
 * the widest of them and the width is fixed for the control's whole life. Only
 * the current one is visible. The buttons carry their own aria-label, so this
 * text is not the accessible name and hiding the others costs nothing.
 */
function StableLabel({ options, current }: { options: string[]; current: string }) {
  return (
    <span className="grid place-items-center">
      {options.map((o) => (
        <span
          key={o}
          aria-hidden={o !== current}
          className={`col-start-1 row-start-1 ${o === current ? "" : "invisible"}`}
        >
          {o}
        </span>
      ))}
    </span>
  );
}

const micro = {
  transitionProperty: "opacity, background-color, transform",
  transitionDuration: `${DURATION.micro}s`,
  transitionTimingFunction: CSS_EASE.out,
} as const;

export default function ScrollAutoplayVideo({
  src,
  narrowSrc,
  poster,
  title,
  loop = false,
}: {
  src: string;
  /** Lighter encode served under {@link NARROW}. Phones render this frame at a
   *  third of its desktop width and pay for the bytes on a metered plan. */
  narrowSrc?: string;
  poster?: string;
  /** The film's accessible name. It has no visible caption of its own. */
  title: string;
  /** Off by default: a film with an opening line and an ending should stop at
   *  the end rather than start talking over itself. */
  loop?: boolean;
}) {
  const ref = useRef<HTMLVideoElement>(null);
  const inView = useRef(false);
  /** Set the moment the viewer presses pause, cleared when they press play. */
  const userPaused = useRef(false);

  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(true);
  const [ended, setEnded] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // Set once, before anything can play: whatever else happens, this element
    // cannot come out loud.
    el.volume = UNMUTED_VOLUME;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    // Save-Data is the browser saying the viewer is paying for these bytes.
    const conn = (
      navigator as Navigator & { connection?: { saveData?: boolean } }
    ).connection;
    const mayAutoplay = () => !reduced.matches && !conn?.saveData;

    /** One place decides whether the film should be running right now. */
    const sync = () => {
      const shouldPlay =
        inView.current &&
        !document.hidden &&
        !userPaused.current &&
        !el.ended &&
        mayAutoplay();

      if (shouldPlay) {
        // Every start the scroll position asked for is a muted start. An
        // unmute is consent to hear it now, not consent for it to greet the
        // reader with sound the next four times they pass the section.
        el.muted = true;
        // Refused under iOS low-power mode and some enterprise policies. The
        // play button is sitting right there, so a refusal costs one click.
        void el.play().catch(() => {});
      } else if (!el.paused) {
        el.pause();
      }
    };

    let warm: IntersectionObserver | undefined;
    let watch: IntersectionObserver | undefined;

    const observe = () => {
      let warmed = false;
      warm = new IntersectionObserver(
        ([entry]) => {
          // Buffering ahead is only worth it for someone who is about to get
          // autoplay. Under Save-Data, prefetching megabytes they never asked
          // to see is the exact thing the header is there to prevent.
          if (!entry.isIntersecting || warmed || !mayAutoplay()) return;
          warmed = true;
          el.preload = "auto";
          // Resource selection already ran and stopped at preload="none", so
          // the element needs telling. Guarded: load() rewinds, and on a deep
          // link into this section both observers can fire in one tick.
          if (el.readyState === 0 && el.paused && !el.currentTime) el.load();
          warm?.disconnect();
        },
        { rootMargin: WARM_MARGIN },
      );

      watch = new IntersectionObserver(
        ([entry]) => {
          inView.current = entry.intersectionRatio >= PLAY_RATIO;
          sync();
        },
        { threshold: [0, PLAY_RATIO] },
      );

      warm.observe(el);
      watch.observe(el);
    };

    // Wait for the page to finish loading, then for the main thread to go
    // quiet, before any of this is allowed to ask for bytes. A reader who
    // scrolls during load simply gets playback a beat later, which is a much
    // better trade than a 30 MB film racing the hero for bandwidth.
    // requestIdleCallback where it exists (everything current), a short timer
    // where it does not. Either way the point is the same: after the load.
    const idle = typeof window.requestIdleCallback === "function";
    let handle = 0;
    const arm = () => {
      handle = idle
        ? window.requestIdleCallback(observe, { timeout: 1500 })
        : window.setTimeout(observe, 200);
    };

    if (document.readyState === "complete") arm();
    else window.addEventListener("load", arm, { once: true });

    document.addEventListener("visibilitychange", sync);
    reduced.addEventListener("change", sync);

    return () => {
      window.removeEventListener("load", arm);
      if (handle) {
        if (idle) window.cancelIdleCallback(handle);
        else window.clearTimeout(handle);
      }
      warm?.disconnect();
      watch?.disconnect();
      document.removeEventListener("visibilitychange", sync);
      reduced.removeEventListener("change", sync);
    };
  }, []);

  /** The viewer's press — the one input that overrides the scroll position. */
  const toggle = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    if (el.paused || el.ended) {
      userPaused.current = false;
      if (el.ended) el.currentTime = 0;
      void el.play().catch(() => {});
    } else {
      userPaused.current = true;
      el.pause();
    }
  }, []);

  const toggleSound = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    // Re-asserted here rather than trusted from mount: this is the one moment
    // the level is audible, so it is the one place worth being certain.
    el.volume = UNMUTED_VOLUME;
    el.muted = !el.muted;
    // Turning the sound on is an ask to hear it, so it also starts a film that
    // happens to be sitting paused.
    if (!el.muted && el.paused) {
      userPaused.current = false;
      void el.play().catch(() => {});
    }
  }, []);

  return (
    <>
      {poster && (
        <img
          src={poster}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 h-full w-full object-cover"
          loading="lazy"
          decoding="async"
        />
      )}

      <video
        ref={ref}
        className="absolute inset-0 h-full w-full object-cover"
        aria-label={title}
        muted
        playsInline
        loop={loop}
        // Not "metadata": the observer above turns this up on approach, and
        // until then a reader who never scrolls here downloads nothing at all.
        preload="none"
        onPlay={() => {
          setPlaying(true);
          setEnded(false);
        }}
        onPause={() => setPlaying(false)}
        onEnded={() => setEnded(true)}
        onVolumeChange={(e) => setMuted(e.currentTarget.muted)}
      >
        {narrowSrc && <source media={NARROW} src={narrowSrc} type="video/mp4" />}
        <source src={src} type="video/mp4" />
      </video>

      {/* Only over a stopped frame: a scrim on a playing film is just the film
          shown dimmer than it was graded. */}
      {!playing && (
        <span
          aria-hidden="true"
          className="absolute inset-0 block bg-[var(--background)] opacity-30"
          style={micro}
        />
      )}

      {/* The big target, for the stopped and finished states. The small
          controls below stay reachable either way, so this is an affordance
          rather than the only way in. */}
      {!playing && (
        <button
          type="button"
          onClick={toggle}
          aria-label={ended ? `Replay: ${title}` : `Play: ${title}`}
          className="group absolute inset-0 flex h-full w-full cursor-pointer flex-col items-center justify-center gap-5"
        >
          <span
            className="flex h-20 w-20 items-center justify-center rounded-full bg-[var(--text-primary)] group-hover:scale-105 group-focus-visible:scale-105"
            style={micro}
          >
            <span
              className="ml-1.5 block h-0 w-0"
              style={{
                borderTop: "11px solid transparent",
                borderBottom: "11px solid transparent",
                borderLeft: "17px solid var(--background)",
              }}
            />
          </span>
          <span className="font-mono text-[11px] font-bold uppercase tracking-[0.25em] text-[var(--text-primary)]">
            {ended ? "Replay" : "Play"}
          </span>
        </button>
      )}

      {/* Always in the DOM and always tabbable. WCAG 2.2.2: anything moving
          for more than five seconds needs a stop, and a control that only
          exists on hover does not exist on a keyboard. */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-center justify-between gap-3 p-4 opacity-70 focus-within:opacity-100 hover:opacity-100">
        <button
          type="button"
          onClick={toggle}
          className={hit}
          aria-label={playing ? `Pause: ${title}` : `Play: ${title}`}
        >
          <span className={pill} style={micro}>
            <StableLabel
              options={["Play", "Pause", "Replay"]}
              current={playing ? "Pause" : ended ? "Replay" : "Play"}
            />
          </span>
        </button>
        <button
          type="button"
          onClick={toggleSound}
          className={hit}
          aria-label={muted ? "Turn sound on" : "Turn sound off"}
          aria-pressed={!muted}
        >
          <span className={pill} style={micro}>
            <StableLabel
              options={["Sound on", "Sound off"]}
              current={muted ? "Sound on" : "Sound off"}
            />
          </span>
        </button>
      </div>
    </>
  );
}
