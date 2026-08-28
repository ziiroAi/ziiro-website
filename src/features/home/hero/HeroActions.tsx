import { Link } from "react-router-dom";

/**
 * The two things a visitor can do from the hero. Both already exist on the
 * site — the strategy session is the standing offer, and "how it works" is the
 * section directly below — so neither button promises anything new.
 *
 * The arrow moves, the button doesn't slide around under the cursor, and the
 * press response fires on pointer-down rather than on click, so the control
 * acknowledges you at the moment you touch it.
 */

function Arrow({ className = "" }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      width="15"
      height="15"
      viewBox="0 0 15 15"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M3 7.5h9M8.4 3.9 12 7.5l-3.6 3.6" />
    </svg>
  );
}

// Sentence case, normal tracking, and small. Uppercase mono at wide tracking
// made a 276px-wide button out of three words and read as decoration rather
// than as a control.
const base =
  "group inline-flex min-h-[46px] items-center justify-center gap-2 rounded-[10px] px-6 text-[14px] font-medium tracking-[-0.005em] transition-[transform,background-color,border-color,box-shadow,color] duration-200 ease-out active:scale-[0.985] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2";

export default function HeroActions() {
  return (
    <div
      data-hero-reveal
      data-hero-actions
      className="flex w-full flex-col items-stretch gap-3 sm:w-auto sm:flex-row sm:items-center"
    >
      <Link
        to="/contact"
        className={base}
        style={{
          background: "var(--hero-ink)",
          color: "#0b0714",
          boxShadow:
            "0 1px 0 rgba(255,255,255,0.6) inset, 0 12px 40px -14px rgba(255,224,196,0.5)",
          // Tailwind can't alpha-modify a var() colour, so the focus ring
          // offset is painted against the hero ground explicitly.
          ["--tw-ring-offset-color" as string]: "#000000",
          ["--tw-ring-color" as string]: "rgba(255,224,196,0.9)",
        }}
      >
        Book a strategy session
        <Arrow className="transition-transform duration-300 ease-out group-hover:translate-x-1" />
      </Link>

      <a
        href="#how-it-works"
        className={`${base} border`}
        style={{
          borderColor: "var(--hero-line)",
          color: "var(--hero-ink)",
          background:
            "linear-gradient(180deg, rgba(242,238,233,0.045), rgba(242,238,233,0.015))",
          ["--tw-ring-offset-color" as string]: "#000000",
          ["--tw-ring-color" as string]: "rgba(255,138,61,0.85)",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = "rgba(255,138,61,0.5)";
          e.currentTarget.style.boxShadow =
            "0 0 30px -8px rgba(255,138,61,0.4), inset 0 0 24px -14px rgba(255,138,61,0.7)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = "var(--hero-line)";
          e.currentTarget.style.boxShadow = "none";
        }}
      >
        See how it works
        <Arrow className="transition-transform duration-300 ease-out group-hover:translate-y-[2px] group-hover:rotate-90" />
      </a>
    </div>
  );
}
