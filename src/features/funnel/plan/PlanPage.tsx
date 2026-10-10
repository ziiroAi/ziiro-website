// S9 (§6): the plan, drawn on the device from the descriptor lane A passes in (00-index §1.3). It renders §6.2's
// blocks 1 to 4. Blocks 0 and 5 are the site's own Navbar and footer (lane D). Blocks 1 to 4 share one 3D stage
// (W15-B, PlanStage): the spine starts on the right of the hero and, as the plan scrolls, zooms in on each
// department's disc, alternating sides (W17-S); from 1024 px the words take the other side.
import { useCallback, useEffect, useMemo, useRef } from "react";
import { Helmet } from "react-helmet-async";
import { copy } from "../data";
import type { CtaFrom, PlanPageProps, PlanProgress } from "../data/contract";
import { Close } from "./Close";
import { Hero } from "./Hero";
import { NeedBlock } from "./NeedBlock";
import { PartStop } from "./PartStop";
import { PlanStage } from "../spine3d/plan/PlanStage";
import { stopSide } from "../spine3d/plan/stagePath";
import { buildPlanView } from "./planView";
import { SaveBanner } from "./SaveBanner";
import { usePlanDepth } from "./usePlanDepth";

/** From 1024 px blocks 2 to 4 lie over the stage in a column on its right, which alone takes the pointer, so a drag
 *  or a tap beside it reaches the spine (W15-B). A department whose zoomed spine stands right has its column on
 *  the left (W16-A, W17-S). */
const OVER_STAGE = "relative lg:z-10 lg:pointer-events-none lg:[&>section]:pointer-events-auto lg:[&>section]:ml-auto " +
  "lg:[&>section]:w-[46%] lg:[&>section[data-side=left]]:ml-0 lg:[&>section[data-side=left]]:mr-auto";

/** The site's title suffix, as SEO.tsx writes it. */
const TITLE_SUFFIX = " | Ziiro AI";

export function PlanPage({ plan, visitor, words, saveNotice, onProgress, guest = false }: PlanPageProps): JSX.Element {
  const view = useMemo(
    () => buildPlanView({ plan, name: visitor.name, problemText: words.problemText, guest }),
    [plan, visitor.name, words.problemText, guest],
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
      <PlanStage departments={lit} planAgentIds={plan.agentIds} onProgress={report} guest={guest}>
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
              guest={guest}
            />
            <div className={OVER_STAGE}>
              <NeedBlock view={view} />
              {view.stops.map((stop, i) => (
                <PartStop key={stop.department} stop={stop} side={stopSide(i) === "left" ? "right" : "left"} />
              ))}
              <Close view={view} name={visitor.name} email={visitor.email} onBook={onBook} />
            </div>
          </>
        )}
      </PlanStage>
    </div>
  );
}
