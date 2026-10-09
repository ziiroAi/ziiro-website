// S9 (§6): the plan, drawn on the device from the descriptor lane A passes in (00-index §1.3). It renders §6.2's
// blocks 1 to 4. Blocks 0 and 5 are the site's own Navbar and footer (lane D). Blocks 1 to 4 share one 3D stage
// (W15-B, PlanStage): the spine starts on the right of the hero and, as the plan scrolls, moves left and into each
// stop's disc, with blocks 2 to 4 in a column on the right from 1024 px.
import { useCallback, useEffect, useMemo, useRef } from "react";
import { Helmet } from "react-helmet-async";
import { copy } from "../data";
import type { CtaFrom, PlanPageProps, PlanProgress } from "../data/contract";
import { Close } from "./Close";
import { Hero } from "./Hero";
import { NeedBlock } from "./NeedBlock";
import { PartStop } from "./PartStop";
import { PlanStage } from "../spine3d/plan/PlanStage";
import { buildPlanView } from "./planView";
import { SaveBanner } from "./SaveBanner";
import { usePlanDepth } from "./usePlanDepth";

/** From 1024 px blocks 2 to 4 lie over the stage in a column on its right, which alone takes the pointer, so a drag
 *  or a tap beside it reaches the spine (W15-B). */
const OVER_STAGE = "relative lg:z-10 lg:pointer-events-none lg:[&>section]:pointer-events-auto lg:[&>section]:ml-auto lg:[&>section]:w-[46%]";

/** The site's title suffix, as SEO.tsx writes it. */
const TITLE_SUFFIX = " | Ziiro AI";

export function PlanPage({ plan, visitor, words, saveNotice, onProgress }: PlanPageProps): JSX.Element {
  const view = useMemo(
    () => buildPlanView({ plan, name: visitor.name, problemText: words.problemText }),
    [plan, visitor.name, words.problemText],
  );
  const lit = useMemo(() => view.stops.map((stop) => stop.department), [view]);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const latest = useRef(onProgress);
  useEffect(() => {
    latest.current = onProgress;
  }, [onProgress]);

  const report = useCallback((fields: PlanProgress) => latest.current(fields), []);
  const onBook = useCallback((from: CtaFrom) => report({ ctaFrom: from, ctaClicked: true }), [report]);
  const depthRef = usePlanDepth(useCallback((planDepth: number) => report({ planDepth }), [report]));

  useEffect(() => {
    window.scrollTo(0, 0);
    headingRef.current?.focus({ preventScroll: true });
  }, []);

  return (
    <div ref={depthRef} className="bg-[color:var(--funnel-bg)] text-[color:var(--funnel-fg)]">
      <Helmet>
        <title>{`${copy("seo.plan.title")}${TITLE_SUFFIX}`}</title>
      </Helmet>
      <SaveBanner notice={saveNotice} />
      <PlanStage departments={lit} planAgentIds={plan.agentIds} onProgress={report}>
        {(stage) => (
          <>
            <Hero
              heroText={view.heroText}
              name={visitor.name}
              email={visitor.email}
              headingRef={headingRef}
              onBook={onBook}
              onProgress={report}
              stage={stage}
            />
            <div className={OVER_STAGE}>
              <NeedBlock view={view} />
              {view.stops.map((stop) => (
                <PartStop key={stop.department} stop={stop} />
              ))}
              <Close view={view} name={visitor.name} email={visitor.email} onBook={onBook} />
            </div>
          </>
        )}
      </PlanStage>
    </div>
  );
}
