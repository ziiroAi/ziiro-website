import { useEffect, useRef, useState, type FocusEvent, type ReactNode, type RefObject } from "react";
import { Link } from "react-router-dom";
import { createAnimatable, cubicBezier } from "animejs";
import MotionReveal from "@/shared/motion/MotionReveal";
import { scrollTo } from "@/shared/motion/SmoothScroll";
import {
  CSS_EASE,
  DURATION,
  EASE_OUT_EXPO,
  MS,
  TRAVEL,
} from "@/shared/motion/tokens";

/** Pointer feedback, everywhere in the footer. Spelled out instead of leaning
 *  on Tailwind's `duration-*` scale so the footer moves on the same 0.15s as
 *  the rest of the site and cannot quietly drift when someone edits a class. */
const micro = (properties: string) => ({
  transitionProperty: properties,
  transitionDuration: `${DURATION.micro}s`,
  transitionTimingFunction: CSS_EASE.out,
});

/**
 * The footer is now the site's main wayfinding surface, so the grouping has to
 * earn that. The navigation was cut to three items plus the booking call to
 * action, which means every other route on the site is reachable from here and
 * nowhere else.
 *
 * WHAT CHANGED AND WHY. The old heads had stopped describing their contents:
 * "Company" held Pricing and FAQ, which are commercial and support, while
 * "Explore" mixed the offer (Products, Docs) with the company (Mission, Who We
 * Are). Grouped by what a reader is trying to DO instead:
 *
 *   Start here    the commercial path, in the order it is walked
 *   How it works  the reference material, for someone not ready to talk yet
 *   Company       who we are, and how to reach us about anything else
 *   Trust         can this company be trusted with our data and our systems
 *
 * ORDERING IS DELIBERATE. Book a Call is the primary conversion route on the
 * site and it sits first in the first column, which is where a reader looks
 * first. It was missing from the footer entirely until now.
 *
 * BOOK A CALL VERSUS CONTACT. These are different jobs and the split is
 * structural rather than decorative: Book a Call is "I want to explore working
 * with Ziiro" and lives with Pricing under Start here; Contact is "I have
 * something to ask" and lives with Careers under Company. Putting them in one
 * column under one head is what made them look interchangeable. Do not merge
 * them back.
 *
 * Home is not listed. The navbar's logo links to it, and a "Home" row in a
 * footer is a row that says nothing.
 *
 * The heads are not shown any more (the owner's reference sets bare links,
 * grouped by spacing alone), but they are still each group's accessible name,
 * so a screen reader hears "Start here, list, 3 items" rather than one long
 * run of links.
 */
const COLUMNS: { head: string; links: { label: string; to: string }[] }[] = [
  {
    head: "Start here",
    links: [
      { label: "Book a Call", to: "/book-a-call" },
      { label: "Pricing", to: "/pricing" },
      { label: "Products", to: "/products" },
    ],
  },
  {
    head: "How it works",
    links: [
      { label: "Docs", to: "/docs" },
      { label: "FAQ", to: "/faq" },
      { label: "Watch", to: "/watch/how-ziiro-works" },
    ],
  },
  {
    head: "Company",
    links: [
      { label: "Mission", to: "/mission" },
      { label: "Who We Are", to: "/who-we-are" },
      { label: "Careers", to: "/careers" },
      { label: "Contact", to: "/contact" },
    ],
  },
  {
    // Was "Legal", which was accurate for two documents and wrong the moment a
    // third joined them: the security page is engineering practice, not a
    // policy. "Trust" covers all three honestly and is also the word an
    // enterprise buyer or a security reviewer scans a footer for.
    head: "Trust",
    links: [
      // First, above the two a reviewer already expects to find. This is the
      // one they are hunting for, and "Security architecture" rather than a
      // bare "Security" is deliberate: sitting between Privacy and Terms, one
      // word would read as a third policy. The label has to say that what is
      // behind it is due-diligence material, written as engineering practice
      // rather than as certifications the company does not hold.
      { label: "Security architecture", to: "/security" },
      { label: "Privacy", to: "/privacy" },
      { label: "Terms", to: "/terms" },
    ],
  },
];

/**
 * Footer link with a tactile x-nudge on hover (anime.js Animatable).
 *
 * The nudge used to be 6px over 350ms, which is far enough and slow enough
 * that the label is still sliding when the eye has already moved on — the
 * pointer leads the link instead of the link answering the pointer. TRAVEL.nudge
 * over DURATION.micro is the reference behaviour: a distance you register as
 * acknowledgement rather than as travel, finished before you can call it late.
 *
 * `min-h-[44px]` rather than padding around the ink: the label has to stay
 * vertically centred in the row for the nudge to read as horizontal, and a
 * flex box that owns its height does that without the ink moving.
 */
function NudgeLink({ to, children }: { to: string; children: ReactNode }) {
  const ref = useRef<HTMLAnchorElement>(null);
  const nudge = useRef<ReturnType<typeof createAnimatable> | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    nudge.current = createAnimatable(el, {
      x: MS.micro,
      ease: cubicBezier(...EASE_OUT_EXPO),
    });
    return () => {
      nudge.current?.revert();
      nudge.current = null;
    };
  }, []);

  return (
    <Link
      ref={ref}
      to={to}
      onMouseEnter={() => nudge.current?.x(TRAVEL.nudge)}
      onMouseLeave={() => nudge.current?.x(0)}
      // 44px rows for touch. Under a fine pointer the rows close up to 28px,
      // the reference's relaxed leading, which still clears the 24px minimum
      // target size (WCAG 2.5.8) with no overlap.
      className={`flex min-h-[44px] w-fit items-center rounded-sm text-[15px] leading-relaxed text-[var(--footer-ink)] underline-offset-4 hover:underline md:text-[16px] [@media(pointer:fine)]:min-h-[28px] ${FOCUS_RING}`}
    >
      {children}
    </Link>
  );
}

/**
 * The footer's keyboard focus ring: 2px of the footer's black on a 2px orange
 * offset. The site's default rings are drawn for a white ground; on this
 * orange, black is the colour that reads (5.2:1).
 */
const FOCUS_RING =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--footer-ink)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--footer-bg)]";

/** Social icon link, black on the orange, with a quiet opacity hover. */
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
      // A 18px glyph in p-2 is a 34px target. The box owns 44px instead and
      // keeps the icon centred in it, so only the reachable area changes.
      className={`inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full text-[var(--footer-ink)] hover:opacity-70 ${FOCUS_RING}`}
      style={micro("opacity")}
    >
      {children}
    </a>
  );
}

/** The three social profiles, used in the one place they appear. */
function Socials() {
  return (
    <div className="-ml-3 flex items-center gap-1">
      <SocialLink href="https://www.linkedin.com/company/zirroai/" label="LinkedIn">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
        </svg>
      </SocialLink>
      <SocialLink href="https://x.com/ziir0ai" label="X / Twitter">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
      </SocialLink>
      <SocialLink href="https://www.instagram.com/ziiroai" label="Instagram">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
        </svg>
      </SocialLink>
    </div>
  );
}

/**
 * Whether the footer fits the viewport, and so can stay pinned. Its top corner
 * radius of padding sits behind the sheet's corners and never needs to be
 * seen, so that part does not count; the negative top margin is that radius.
 * Starts true, matching the prerendered HTML.
 *
 * Measured against the root's clientHeight, the SMALL viewport (browser bars
 * showing), not innerHeight: a phone's innerHeight grows and shrinks as its
 * toolbar hides and returns, and flipping between pinned and static on that
 * would make the footer jump mid-scroll. Fitting the small viewport means it
 * fits at every toolbar state.
 */
function usePinnable(ref: RefObject<HTMLElement>) {
  const [pinned, setPinned] = useState(true);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => {
      const hidden = -parseFloat(getComputedStyle(el).marginTop) || 0;
      setPinned(el.offsetHeight - hidden <= document.documentElement.clientHeight);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    window.addEventListener("resize", measure, { passive: true });
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [ref]);

  return pinned;
}

/**
 * Whether the footer should be drawn: the sheet's end is near, so it is about
 * to be seen.
 *
 * Until then the pinned footer is drawn at opacity 0 (index.css). Pinned, it is
 * inside the viewport from the first frame, only covered, and the browser's
 * largest-contentful-paint does not account for covering: the full-width
 * wordmark became every page's "LCP" at first paint, in front of the hero, and
 * the number measured nothing. Opacity rather than visibility, so the links
 * stay in the tab order the whole time.
 *
 * "Near" is the sheet no longer reaching a thin band one screen below the
 * viewport; that screen of lead covers any real scroll speed. Before the first
 * scroll it also takes the footer actually being uncovered, because while a
 * route's chunk loads the sheet holds a one-screen placeholder whose end is
 * "near" without anything of the footer being visible. A page genuinely shorter
 * than the screen still shows it at once.
 */
function useFooterShown(ref: RefObject<HTMLElement>) {
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const sheet = ref.current?.previousElementSibling;
    if (!sheet?.classList.contains("site-sheet")) {
      setShown(true);
      return;
    }
    let endNear = false;
    let scrolled = window.scrollY > 0;
    const update = () =>
      setShown(endNear && (scrolled || sheet.getBoundingClientRect().bottom < window.innerHeight));
    const onFirstScroll = () => {
      scrolled = true;
      window.removeEventListener("scroll", onFirstScroll);
      update();
    };
    const observer = new IntersectionObserver(
      ([entry]) => {
        endNear = !entry.isIntersecting;
        update();
      },
      { rootMargin: "-200% 0px 101% 0px" },
    );
    observer.observe(sheet);
    window.addEventListener("scroll", onFirstScroll, { passive: true });
    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", onFirstScroll);
    };
  }, [ref]);

  return shown;
}

/**
 * The site footer, after the owner's reference (the Fragment Studios footer):
 * a flat orange ground, bare black links on the right, and the name set huge
 * and edge to edge along the bottom. The black "Book a call" pill that sat at
 * the far right is gone, at the owner's request; Book a Call is still the
 * first link of the first column.
 *
 * Orange and black only, the owner's two colours (tokens in index.css). Every
 * piece of text on the orange is black, 5.2:1; white on this orange would be
 * 3.7:1 and fail.
 *
 * PINNED BEHIND THE PAGE. The page is a sheet with rounded bottom corners
 * (`.site-sheet`, App.tsx) and the footer is `sticky` underneath it, so the
 * end of every page lifts off the footer rather than pushing it up; the
 * wordmark is uncovered first and nothing in the footer moves (index.css).
 * Two things here keep that honest:
 *
 *   1. A footer taller than the screen cannot pin, or its top would never be
 *      seen. It is measured against the viewport and, if it does not fit,
 *      marked `data-static` and scrolls in the flow like any footer.
 *   2. A pinned footer is always "on screen" as far as the browser knows, just
 *      under the sheet, so tabbing into it scrolls nothing and the focus ring
 *      would be drawn behind the page. Keyboard focus arriving in the footer
 *      scrolls to the end, which uncovers all of it.
 */
export default function Footer() {
  const ref = useRef<HTMLElement>(null);
  const pinned = usePinnable(ref);
  const shown = useFooterShown(ref);

  const reveal = (e: FocusEvent<HTMLElement>) => {
    // Keyboard only: a mouse press already has its target in view, and
    // jumping the page under a click would be the wrong answer to it.
    if (!pinned || !e.target.matches(":focus-visible")) return;
    scrollTo(document.documentElement.scrollHeight - window.innerHeight, { immediate: true });
  };

  return (
    <footer
      ref={ref}
      className="site-footer"
      data-static={pinned ? undefined : ""}
      data-shown={shown ? "" : undefined}
      onFocus={reveal}
    >
      {/* Phones get tighter spacing than tablets and up so their footer fits
          the screen and pins too. The 44px link rows are never what gives. */}
      <div className="px-6 pt-6 md:px-10 md:pt-20 lg:pt-24">
        {/* One reveal for the whole top area: the footer is the last thing
            anyone reads, and a staggered cascade down here would be motion
            asking for attention it hasn't earned. */}
        <MotionReveal className="grid gap-6 md:gap-12 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start lg:gap-x-16">
          {/* ─── Links: first on a phone, on the right on desktop ─── */}
          <nav
            aria-label="Footer"
            className="grid grid-cols-2 gap-x-8 gap-y-3 sm:grid-cols-4 sm:gap-x-10 lg:order-2 lg:gap-x-12"
          >
            {COLUMNS.map((col) => (
              <ul key={col.head} aria-label={col.head}>
                {col.links.map((link) => (
                  <li key={link.to}>
                    <NudgeLink to={link.to}>{link.label}</NudgeLink>
                  </li>
                ))}
              </ul>
            ))}
          </nav>

          {/* ─── Left: the tagline, the socials and the legal line ─── */}
          <div className="flex flex-col gap-3 text-[var(--footer-ink)] md:gap-6 lg:order-1 lg:gap-10">
            <p className="font-mono text-[11px] font-bold uppercase tracking-[0.25em]">
              ( Leverage AI anywhere )
            </p>
            <div className="flex flex-col gap-2 md:gap-3">
              <Socials />
              <p className="font-mono text-[10px] uppercase tracking-[0.25em]">
                &copy; 2026 Ziiro AI · All rights reserved
              </p>
            </div>
          </div>
        </MotionReveal>
      </div>

      {/* ─── The wordmark ───────────────────────────────────────────────────
          Decorative: the name is already said by the legal line above, so a
          screen reader skips the giant copy. It is sized in container units
          of its own full-width box (index.css), so it runs edge to edge at
          every width without depending on 100vw, which counts a classic
          scrollbar. */}
      <div className="site-footer__mark" aria-hidden="true">
        <span className="site-footer__word font-display font-bold">Ziiro AI</span>
        <span className="site-footer__c font-display font-bold">&copy;</span>
      </div>
    </footer>
  );
}
