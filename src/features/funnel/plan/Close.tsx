// Block 4 (§6.2): the close. cta.btn is the only wording here (§6.3). Its plan_depth is the number of stops plus one.
import { copy } from "../data";
import type { CtaFrom } from "../data/contract";
import { BookCallLink } from "./BookCallLink";
import type { PlanViewModel } from "./planView";
import { Swap } from "./Swap";

export interface CloseProps {
  view: PlanViewModel;
  name: string;
  email: string;
  onBook(from: CtaFrom): void;
}

export function Close({ view, name, email, onBook }: CloseProps): JSX.Element {
  return (
    <section
      data-depth={view.closeDepth}
      aria-labelledby="plan-close-title"
      className="border-t border-[color:var(--funnel-line)] px-4 py-20 sm:px-6 lg:px-10 lg:py-28 lg:opacity-[var(--words-right,1)] lg:group-data-[words-right-off]/stage:pointer-events-none"
    >
      <Swap as="p" lines={view.later} className="max-w-2xl text-lg" />
      <p className="mt-2 max-w-2xl text-[color:var(--funnel-muted)]">{copy("sp.later.sub")}</p>
      <h2 id="plan-close-title" className="mt-12 max-w-3xl text-3xl font-medium leading-tight lg:text-5xl">{copy("cta.h")}</h2>
      <Swap as="p" lines={view.ctaLead} className="mt-4 max-w-2xl text-[color:var(--funnel-muted)]" />
      <BookCallLink
        name={name}
        email={email}
        from="close"
        onBook={onBook}
        className="mt-8 inline-flex min-h-11 items-center justify-center rounded-full bg-[color:var(--funnel-accent)] px-6 text-sm font-medium text-[color:var(--funnel-on-accent)]"
      >
        {copy("cta.btn")}
      </BookCallLink>
      <p className="mt-4 text-sm text-[color:var(--funnel-muted)]">{copy("cta.sub")}</p>
    </section>
  );
}
