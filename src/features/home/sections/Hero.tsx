import { Link } from "react-router-dom";
import { useEffect, useRef } from "react";
import { createTimeline, stagger } from "animejs";
import {
  LayoutDashboard,
  Code,
  MapPin,
  AlignLeft,
  Globe,
  Mail,
  Brain,
  Workflow,
} from "lucide-react";

/**
 * Homepage hero: the kinetic "Leverage / AI / Anywhere" rows, restored.
 *
 * The three-row type, icon circles, connectors and starfield are the brand's
 * signature opener and they stay. What's added underneath is the sentence the
 * old hero hid in an sr-only tag: what we do, who for, and the two things a
 * visitor can act on. So the identity plays first and the answer lands right
 * behind it, without a visitor having to scroll to find out what we sell.
 */

function IconCircle({
  Icon,
  size = "lg",
}: {
  Icon: typeof Brain;
  size?: "sm" | "lg";
}) {
  const dim =
    size === "lg"
      ? "w-[90px] h-[90px] md:w-[130px] md:h-[130px]"
      : "w-[70px] h-[70px] md:w-[100px] md:h-[100px]";
  const iconSize = size === "lg" ? 28 : 22;

  return (
    <div
      data-hero-icon
      style={{ opacity: 0 }}
      className={`${dim} rounded-full border border-black/15 dark:border-white/15 flex items-center justify-center shrink-0`}
    >
      <Icon
        size={iconSize}
        strokeWidth={1}
        className="text-black/40 dark:text-white/40"
      />
    </div>
  );
}

function Connector() {
  return (
    <div
      data-hero-connector
      style={{ opacity: 0 }}
      className="flex items-center shrink-0 mx-1 origin-left"
    >
      <div className="w-[5px] h-[5px] rotate-45 bg-black/40 dark:bg-white/40" />
      <div className="w-8 md:w-14 h-[1px] bg-black/15 dark:bg-white/15" />
      <div className="w-[5px] h-[5px] rotate-45 bg-black/40 dark:bg-white/40" />
    </div>
  );
}

export default function Hero() {
  const heroRef = useRef<HTMLElement>(null);

  // Hero entrance: one sequenced timeline. Words rise, annotations fade in,
  // connectors draw, icons pop, instead of a pile of ad-hoc delays.
  useEffect(() => {
    const root = heroRef.current;
    if (!root) return;

    const words = root.querySelectorAll<HTMLElement>("[data-hero-word]");
    const notes = root.querySelectorAll<HTMLElement>("[data-hero-note]");
    const connectors = root.querySelectorAll<HTMLElement>("[data-hero-connector]");
    const icons = root.querySelectorAll<HTMLElement>("[data-hero-icon]");

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      [words, notes, connectors, icons].forEach((list) =>
        list.forEach((el) => {
          el.style.opacity = "1";
        }),
      );
      return;
    }

    const tl = createTimeline({
      defaults: { ease: "out(3)", duration: 700 },
    });

    tl.add(words, { opacity: [0, 1], y: [44, 0], delay: stagger(130) })
      .add(
        notes,
        { opacity: [0, 1], y: [8, 0], duration: 600, delay: stagger(100) },
        "-=420",
      )
      .add(
        connectors,
        { opacity: [0, 1], scaleX: [0, 1], duration: 500, delay: stagger(70) },
        "-=460",
      )
      .add(
        icons,
        { opacity: [0, 1], scale: [0.55, 1], duration: 650, delay: stagger(80) },
        "-=520",
      );

    return () => {
      tl.cancel();
    };
  }, []);

  return (
    <section
      ref={heroRef}
      className="relative bg-[var(--background)]/80 dark:bg-transparent pt-28 md:pt-32 pb-0 overflow-hidden"
    >
      {/* Single semantic H1 for crawlers & AI engines. The visible
          "Leverage / AI / Anywhere" kinetic type is decorative. */}
      <h1 className="sr-only">
        Ziiro: AI that has to pay for itself. Business intelligence and agentic
        AI systems for founder-led teams.
      </h1>

      {/* Row 1: "Leverage" + 3 icons */}
      <div className="border-b border-black/8 dark:border-white/8">
        <div className="max-w-[1400px] mx-auto px-6 md:px-10 py-5 md:py-7 flex items-center gap-3 md:gap-5 overflow-hidden">
          <span
            data-hero-word
            style={{ opacity: 0 }}
            className="text-[clamp(3rem,8vw,7.5rem)] font-display font-bold leading-[0.9] tracking-[-0.03em] text-[var(--text-primary)] shrink-0"
          >
            Leverage
          </span>
          <span
            data-hero-note
            style={{ opacity: 0 }}
            className="hidden lg:block self-end pb-3 font-mono text-[11px] uppercase tracking-[0.25em] text-[var(--text-secondary)] shrink-0"
          >
            ( a force multiplier / we amplify what's there )
          </span>
          <div className="flex items-center gap-2 md:gap-3 ml-auto">
            <Connector />
            <IconCircle Icon={LayoutDashboard} />
            <Connector />
            <IconCircle Icon={Code} />
            <Connector />
            <IconCircle Icon={MapPin} />
          </div>
        </div>
      </div>

      {/* Row 2: 2 icons + "AI" + 1 icon */}
      <div className="border-b border-black/8 dark:border-white/8">
        <div className="max-w-[1400px] mx-auto px-6 md:px-10 py-5 md:py-7 flex items-center gap-3 md:gap-5 overflow-hidden">
          <div className="flex items-center gap-2 md:gap-3">
            <IconCircle Icon={Brain} size="sm" />
            <Connector />
            <IconCircle Icon={AlignLeft} size="sm" />
          </div>
          <span
            data-hero-word
            style={{ opacity: 0 }}
            className="mx-auto flex items-baseline gap-6 text-[clamp(2.2rem,7vw,7.5rem)] font-display font-bold leading-[0.9] tracking-[-0.03em] text-[var(--text-primary)]"
          >
            AI
            <span
              data-hero-note
              style={{ opacity: 0 }}
              className="hidden self-center font-mono text-[11px] font-normal uppercase tracking-[0.25em] text-[var(--text-secondary)] lg:block"
            >
              ( our core tool, stated plainly )
            </span>
          </span>
          <div className="flex items-center gap-2 md:gap-3">
            <Connector />
            <IconCircle Icon={Workflow} />
          </div>
        </div>
      </div>

      {/* Row 3: "Anywhere" + 2 icons + annotation */}
      <div className="border-b border-black/8 dark:border-white/8">
        <div className="max-w-[1400px] mx-auto px-6 md:px-10 py-5 md:py-7 flex items-center gap-3 md:gap-5 overflow-hidden">
          <span
            data-hero-word
            style={{ opacity: 0 }}
            className="text-[clamp(2.5rem,7vw,6.5rem)] font-display font-bold leading-[0.9] tracking-[-0.03em] text-[var(--text-primary)] shrink-0"
          >
            Anywhere
          </span>
          <div className="flex items-center gap-2 md:gap-3">
            <Connector />
            <IconCircle Icon={Globe} size="sm" />
            <Connector />
            <IconCircle Icon={Mail} size="sm" />
          </div>
          <span
            data-hero-note
            style={{ opacity: 0 }}
            className="ml-auto hidden self-end pb-3 font-mono text-[11px] uppercase tracking-[0.25em] text-[var(--text-secondary)] lg:block"
          >
            ( any industry. any function. any process. )
          </span>
        </div>
      </div>

      {/* Sub-nav links row */}
      {/* Wraps to a second row on narrow screens — five labels won't fit on
          one line at 390px, and squeezing them breaks each label mid-word. */}
      <div className="max-w-[1400px] mx-auto px-6 md:px-10 py-6 flex flex-wrap items-center gap-x-6 gap-y-3 md:flex-nowrap md:gap-x-12 border-b border-black/8 dark:border-white/8">
        {[
          { label: "Our Mission", href: "/mission" },
          { label: "Who We Are", href: "/who-we-are" },
          { label: "Products", href: "/products" },
          { label: "Process", href: "/process" },
          { label: "Contact Us", href: "/contact" },
        ].map((link) => (
          <Link
            key={link.label}
            to={link.href}
            className="whitespace-nowrap text-xs md:text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors tracking-wide"
          >
            {link.label}
          </Link>
        ))}
        <span className="ml-auto hidden font-mono text-xs text-[var(--text-secondary)] md:block">
          &copy; 2026
        </span>
      </div>

      {/* The answer, straight off the back of the kinetic type. This is what
          the old hero was missing: a visitor who reads no further than this
          block still knows what we sell and what to do about it. */}
      <div className="max-w-[1400px] mx-auto px-6 md:px-10 pt-14 pb-20 md:pt-20 md:pb-28">
        <p className="mb-8 flex items-center gap-3 font-mono text-[11px] font-bold uppercase tracking-[0.25em] text-[var(--text-secondary)]">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-[var(--text-primary)] opacity-70" />
          Business intelligence first, AI second
        </p>

        <p
          className="max-w-3xl font-display font-semibold text-[var(--text-primary)]"
          style={{
            fontSize: "clamp(1.7rem, 3.4vw, 2.9rem)",
            letterSpacing: "-0.03em",
            lineHeight: 1.12,
          }}
        >
          AI that has to{" "}
          <span className="text-[var(--text-secondary)]">pay for itself.</span>
        </p>

        <p className="mt-6 max-w-2xl text-base leading-relaxed text-[var(--text-secondary)] md:text-lg">
          We're an AI consultancy for founder-led teams. Every engagement starts
          by finding where your hours and money actually go. We quantify the
          return first, then build only the systems the numbers justify.
        </p>

        <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:items-center">
          <Link
            to="/contact"
            className="inline-flex min-h-[52px] items-center justify-center rounded-full bg-[var(--text-primary)] px-8 font-mono text-xs font-semibold uppercase tracking-wide text-[var(--background)] transition-opacity hover:opacity-85"
          >
            Book your strategy session
          </Link>
          <a
            href="#how-it-works"
            className="inline-flex min-h-[52px] items-center justify-center rounded-full border border-[var(--border-strong)] px-8 font-mono text-xs font-semibold uppercase tracking-wide text-[var(--text-primary)] transition-colors hover:border-[var(--text-primary)]/40"
          >
            See how it works
          </a>
        </div>

        <p className="mt-8 font-mono text-[11px] uppercase tracking-[0.25em] text-[var(--text-secondary)]">
          Free 30 minutes · No pitch · You keep the roadmap
        </p>
      </div>
    </section>
  );
}
