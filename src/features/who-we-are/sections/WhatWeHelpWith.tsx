import { Link } from "react-router-dom";
import MotionReveal, { MotionRevealItem } from "@/shared/motion/MotionReveal";
import { CSS_EASE, DURATION, STAGGER } from "@/shared/motion/tokens";
import SectionHeader from "@/shared/ui/section-header";
import { STAGES } from "@/features/who-we-are/entities/stages";

const COUNT = String(STAGES.length).padStart(2, "0");

/**
 * The three stages in one line each, with the products page one click away for
 * what each one contains.
 *
 * The header used to be the products page's own hero copy ("Five ways we build
 * leverage"), which is how this section was still counting five retired
 * services. It now states the count from the data, so the heading cannot drift
 * from the list again, and deliberately avoids both reserved openings: the
 * products h1 is "Diagnose. Build. Optimize." and the home hero leads on the
 * same sequence, so a third page opening that way would be the repetition this
 * job is closing.
 */
export default function WhatWeHelpWith({ index }: { index: string }) {
  return (
    <section className="pb-24 md:pb-32">
      <div className="mx-auto max-w-7xl px-6 md:px-10">
        <SectionHeader
          index={index}
          label="What We Help With"
          meta={`${COUNT} stages`}
          titleA="Three stages,"
          titleB="and what each is for."
          sub="Not every engagement ends in a build. The ones that do ship something running inside your business, doing real work: not a license, and not a slide deck."
        />

        <MotionReveal as="ol" stagger={STAGGER.card} className="mt-16 border-t border-[var(--border)]">
          {STAGES.map((c, i) => (
            <MotionRevealItem
              key={c.name}
              as="li"
              className="grid grid-cols-12 gap-x-4 gap-y-3 border-b border-[var(--border)] py-8"
            >
              <span aria-hidden="true" className="col-span-2 font-mono text-sm text-[var(--text-secondary)] md:col-span-1">
                {String(i + 1).padStart(2, "0")}
              </span>
              <div className="col-span-10 md:col-span-4">
                <h3
                  className="font-display font-semibold text-[var(--text-primary)]"
                  style={{ fontSize: "clamp(1.35rem, 2vw, 1.75rem)", letterSpacing: "-0.03em", lineHeight: 1.1 }}
                >
                  {c.name}
                </h3>
                <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.25em] text-[var(--text-secondary)]">
                  {c.sub}
                </p>
              </div>
              <p className="col-span-12 leading-relaxed text-[var(--text-secondary)] md:col-span-6 md:col-start-7">
                {c.desc}
              </p>
            </MotionRevealItem>
          ))}
        </MotionReveal>

        <MotionReveal>
          <p className="mt-10 max-w-xl leading-relaxed text-[var(--text-secondary)]">
            {/* Was "what each one delivers, and how long it takes to build".
                The build durations went with the five retired services, so
                /products no longer answers the second half; it lists the
                capabilities inside each stage and what the stage hands over. */}
            What each stage contains, and what it hands you at the end, is on{" "}
            <Link
              to="/products"
              className="text-[var(--text-primary)] underline underline-offset-4 transition-opacity hover:opacity-70"
              style={{ transitionDuration: `${DURATION.micro}s`, transitionTimingFunction: CSS_EASE.outExpo }}
            >
              the products page
            </Link>
            .
          </p>
        </MotionReveal>
      </div>
    </section>
  );
}
