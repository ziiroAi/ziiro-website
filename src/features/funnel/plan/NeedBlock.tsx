// Block 2 (§6.2): "you need only {n}". It's plan_depth 0.
import { copy } from "../data";
import type { JobStatus } from "../data/contract";
import { markOf, type PlanViewModel } from "./planView";
import { Swap } from "./Swap";

const STATUSES: readonly JobStatus[] = ["runs_on_our_company_today", "we_build_it_for_you", "mapped"];
const MICRO = "font-mono text-xs uppercase tracking-[0.18em] text-[color:var(--funnel-muted)]";
/** W15-B3: from 1024 px PlanStage shows these words (--words-right, 0 to 1) only once the spine has left their
 *  column, so the spine never crosses them. Opacity only: block 2 has no controls, and a screen reader must still
 *  reach it. */
const WAITS_FOR_SPINE = "lg:opacity-[var(--words-right,1)] lg:group-data-[words-right-off]/stage:pointer-events-none";

export function NeedBlock({ view }: { view: PlanViewModel }): JSX.Element {
  return (
    <section
      data-depth={0}
      aria-labelledby="plan-need-title"
      className={`border-t border-[color:var(--funnel-line)] px-4 py-16 sm:px-6 lg:px-10 lg:py-24 ${WAITS_FOR_SPINE}`}
    >
      <div className="grid gap-10">
        <div>
          <p className={`${MICRO} flex flex-wrap items-center gap-3`}>
            <span>{copy("sp.hero.eyebrow")}</span>
            {view.pilot && (
              <span className="rounded-full border border-[color:var(--funnel-line)] px-2 py-0.5 text-[color:var(--funnel-fg)]">
                {copy("sp.pilot")}
              </span>
            )}
          </p>
          <h2 id="plan-need-title" className="mt-4 max-w-3xl text-3xl font-medium leading-tight lg:text-5xl">
            <Swap lines={view.headline} />
          </h2>
          <Swap as="p" lines={view.sub} className="mt-6 max-w-2xl text-[color:var(--funnel-muted)]" />
          <Swap
            as="p"
            lines={{ desktop: copy("sp.hero.honest"), phone: copy("ph.hero.honest") }}
            className="mt-4 max-w-2xl text-[color:var(--funnel-muted)]"
          />
          {view.pilot && <p className="mt-4 max-w-2xl">{copy("sp.pilot.note")}</p>}
        </div>
        <div className="rounded-2xl border border-[color:var(--funnel-line)] bg-[color:var(--funnel-card)] p-6">
          <Swap as="p" lines={{ desktop: copy("sp.brain.label"), phone: copy("ph.brain.label") }} className="font-medium" />
          <p className="mt-3 text-sm text-[color:var(--funnel-muted)]">{copy("sp.brain.tip")}</p>
          <p className="mt-3 text-sm">{copy("sp.brain.live")}</p>
        </div>
      </div>
      <div className="mt-12">
        <p className="text-sm text-[color:var(--funnel-muted)]">{copy("sp.legend.jobs")}</p>
        <ul className="mt-3 flex flex-col gap-2 text-sm sm:flex-row sm:gap-6">
          {STATUSES.map((status) => {
            const mark = markOf(status);
            return (
              <li key={status}>
                <span aria-hidden="true">{mark.glyph}</span> {mark.label}
              </li>
            );
          })}
        </ul>
      </div>
      <Swap as="p" lines={view.scroll} className={`mt-12 ${MICRO}`} />
    </section>
  );
}
