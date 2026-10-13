/**
 * (C) W15-A: the header's light/dark toggle, on "/" only (the rest of the site stays dark, D9). It shows the theme it
 * switches to: a sun while the page is dark, a moon while it's light. It reads the page's live theme from
 * <html data-theme> until the visitor chooses, then their choice at once, and changes it only through chooseTheme.
 */
import { copy } from "@/features/funnel/data/light";
import { useHtmlTheme } from "@/features/funnel/plan/useHtmlTheme";
import { chooseTheme, useChosenTheme } from "./theme";

const ICON = { width: 18, height: 18, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.6,
  strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": true } as const;

const Sun = () => (
  <svg {...ICON}>
    <circle cx="12" cy="12" r="4.2" />
    <path d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.3 5.3l1.6 1.6M17.1 17.1l1.6 1.6M5.3 18.7l1.6-1.6M17.1 6.9l1.6-1.6" />
  </svg>
);

const Moon = () => (
  <svg {...ICON}>
    <path d="M20 14.6A8.2 8.2 0 0 1 9.4 4a8.2 8.2 0 1 0 10.6 10.6Z" />
  </svg>
);

export function ThemeToggle() {
  const theme = useChosenTheme(useHtmlTheme());
  const next = theme === "dark" ? "light" : "dark";
  return (
    <button
      type="button"
      data-theme-toggle=""
      aria-label={copy(next === "light" ? "nav.theme.light" : "nav.theme.dark")}
      onClick={() => chooseTheme(next)}
      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--background)] text-[var(--text-primary)] transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
    >
      {next === "light" ? <Sun /> : <Moon />}
    </button>
  );
}
