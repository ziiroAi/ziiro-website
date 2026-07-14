import { useEffect, useRef, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { createAnimatable } from "animejs";
import ZiiroMark from "@/shared/ui/ziiro-mark";

const COLUMNS: { head: string; links: { label: string; to: string }[] }[] = [
  {
    head: "Explore",
    links: [
      { label: "Mission", to: "/mission" },
      { label: "Products", to: "/products" },
      { label: "Process", to: "/process" },
      { label: "Audit", to: "/audit" },
    ],
  },
  {
    head: "Company",
    links: [
      { label: "Pricing", to: "/pricing" },
      { label: "Contact", to: "/contact" },
    ],
  },
  {
    head: "Legal",
    links: [
      { label: "Privacy", to: "/privacy" },
      { label: "Terms", to: "/terms" },
    ],
  },
];

/** Footer link with a tactile x-nudge on hover (anime.js Animatable). */
function NudgeLink({ to, children }: { to: string; children: ReactNode }) {
  const ref = useRef<HTMLAnchorElement>(null);
  const nudge = useRef<ReturnType<typeof createAnimatable> | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    nudge.current = createAnimatable(el, { x: 350, ease: "out(4)" });
    return () => {
      nudge.current?.revert();
      nudge.current = null;
    };
  }, []);

  return (
    <Link
      ref={ref}
      to={to}
      onMouseEnter={() => nudge.current?.x(6)}
      onMouseLeave={() => nudge.current?.x(0)}
      className="inline-block text-sm text-[var(--text-secondary)] transition-colors duration-300 hover:text-[var(--text-primary)]"
    >
      {children}
    </Link>
  );
}

/** Social icon link with a quiet opacity/color hover. */
function SocialLink({
  href,
  label,
  children,
}: {
  href: string;
  label: string;
  children: ReactNode;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      className="text-[var(--text-muted)] transition-colors duration-300 hover:text-[var(--text-primary)]"
    >
      {children}
    </a>
  );
}

export default function Footer() {
  return (
    <footer className="border-t border-[var(--border)]">
      <div className="mx-auto max-w-7xl px-6 py-16 md:px-10 md:py-20">
        <div className="grid gap-14 md:grid-cols-[minmax(0,1fr)_auto] md:gap-10">
          {/* ─── Wordmark block ─── */}
          <div>
            <Link
              to="/"
              className="inline-block text-[var(--text-primary)] transition-opacity duration-300 hover:opacity-80"
              aria-label="Ziiro — home"
            >
              <ZiiroMark className="h-8 w-8" />
            </Link>

            <p
              className="mt-6 font-display font-semibold text-[var(--text-primary)]"
              style={{
                fontSize: "clamp(2.8rem, 6vw, 4.5rem)",
                letterSpacing: "-0.03em",
                lineHeight: 1,
              }}
            >
              Ziiro
            </p>

            <p className="mt-5 font-mono text-[11px] font-bold uppercase tracking-[0.25em] text-[var(--text-secondary)]">
              ( Leverage AI anywhere )
            </p>
          </div>

          {/* ─── Link columns ─── */}
          <nav
            aria-label="Footer"
            className="grid grid-cols-2 gap-x-10 gap-y-12 sm:grid-cols-3 md:gap-x-16 lg:gap-x-20"
          >
            {COLUMNS.map((col) => (
              <div key={col.head}>
                <p className="font-mono text-[10px] font-bold uppercase tracking-[0.25em] text-[var(--text-muted)]">
                  {col.head}
                </p>
                <ul className="mt-5 space-y-3">
                  {col.links.map((link) => (
                    <li key={link.to}>
                      <NudgeLink to={link.to}>{link.label}</NudgeLink>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
        </div>

        {/* ─── Bottom row ─── */}
        <div className="mt-16 flex flex-col-reverse items-center justify-between gap-6 border-t border-[var(--border)] pt-8 sm:flex-row md:mt-20">
          <p className="text-center font-mono text-[10px] uppercase tracking-[0.25em] text-[var(--text-muted)] sm:text-left">
            &copy; 2026 Ziiro AI — All rights reserved
          </p>

          <div className="flex items-center gap-5">
            <SocialLink
              href="https://www.linkedin.com/company/zirroai/"
              label="LinkedIn"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
              </svg>
            </SocialLink>
            <SocialLink href="https://x.com/ziir0ai" label="X / Twitter">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
            </SocialLink>
            <SocialLink href="https://www.instagram.com/ziiroai" label="Instagram">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
              </svg>
            </SocialLink>
          </div>
        </div>
      </div>
    </footer>
  );
}
