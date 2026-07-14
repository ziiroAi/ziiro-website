/**
 * The Ziiro overlapping-cards mark, drawn as an SVG with currentColor —
 * crisp at any size and correct in both themes. Single source of truth
 * for the brand mark (navbar, footer, favicase moments).
 */
export default function ZiiroMark({ className = "h-9 w-9" }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} fill="none" aria-hidden>
      <rect
        x="8"
        y="14"
        width="18"
        height="28"
        rx="3.5"
        fill="currentColor"
        opacity="0.45"
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M20 6h18a3.5 3.5 0 0 1 3.5 3.5v25A3.5 3.5 0 0 1 38 38H20a3.5 3.5 0 0 1-3.5-3.5v-25A3.5 3.5 0 0 1 20 6Zm5 8.5h8v15h-8v-15Z"
        fill="currentColor"
      />
    </svg>
  );
}
