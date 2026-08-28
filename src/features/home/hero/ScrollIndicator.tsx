/**
 * Scroll cue. A label and a hairline rail with a single point of light falling
 * down it — the movement is the invitation, so the rail itself stays at the
 * edge of visibility and nothing bounces.
 *
 * It sits in normal flow at the end of the hero column (pushed down with
 * mt-auto) rather than being absolutely pinned, so on a short viewport it
 * follows the content instead of landing on top of the buttons.
 */
export default function ScrollIndicator() {
  return (
    <a
      data-hero-reveal
      data-hero-scroll
      href="#how-it-works"
      className="group inline-flex flex-col items-center gap-3 rounded-[10px] px-3 py-2 focus-visible:outline-none focus-visible:ring-1"
      style={{ ["--tw-ring-color" as string]: "rgba(255,138,61,0.75)" }}
    >
      <span
        className="font-mono text-[10px] font-bold uppercase text-[var(--hero-faint)] transition-colors duration-300 group-hover:text-[var(--hero-ink)]"
        style={{ letterSpacing: "0.34em" }}
      >
        Scroll
      </span>
      <span
        aria-hidden="true"
        className="relative block h-9 w-px overflow-hidden"
        style={{
          background:
            "linear-gradient(to bottom, transparent, rgba(242,238,233,0.16) 30%, rgba(242,238,233,0.16) 70%, transparent)",
        }}
      >
        <span
          className="hero-scroll-dot absolute left-1/2 top-0 block h-3 w-px -translate-x-1/2"
          style={{
            background:
              "linear-gradient(to bottom, transparent, var(--hero-accent), transparent)",
            boxShadow: "0 0 8px rgba(255,138,61,0.9)",
          }}
        />
      </span>
    </a>
  );
}
