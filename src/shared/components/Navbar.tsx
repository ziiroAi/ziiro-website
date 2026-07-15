import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import ThemeToggle from "@/shared/ui/theme-toggle";
import ZiiroMark from "@/shared/ui/ziiro-mark";

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? "backdrop-blur-xl py-3 border-b border-[var(--border)]"
          : "py-5"
      }`}
      style={{
        // Tailwind can't alpha-modify var() colors (bg-[var(--x)]/90 compiles
        // to transparent), so paint the scrolled backdrop explicitly. Keeps
        // the logo readable over the dark full-bleed sections in light mode.
        backgroundColor: scrolled
          ? "color-mix(in srgb, var(--background) 90%, transparent)"
          : "transparent",
      }}
    >
      <div className="w-full max-w-[1400px] mx-auto px-6 md:px-10 flex items-center justify-between">
        {/* Left — logo mark + brand */}
        <Link
          to="/"
          aria-label="Ziiro — home"
          className="flex items-center gap-3 text-[var(--text-primary)] transition-opacity hover:opacity-80"
        >
          <ZiiroMark className="h-8" />
          <span className="font-display text-[26px] font-bold leading-none tracking-tight">
            Ziiro
          </span>
        </Link>

        {/* Right — actions */}
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <Link
            to="/contact"
            className="flex items-center gap-2 bg-[var(--text-primary)] text-[var(--background)] text-xs font-semibold px-5 py-2.5 rounded-full hover:opacity-90 transition-all tracking-wide uppercase"
          >
            Book a Call
          </Link>
        </div>
      </div>
    </nav>
  );
}
