// S9 (§6): the plan, drawn on the device from the descriptor lane A passes in (00-index §1.3). It renders §6.2's
// blocks 1 to 4. Blocks 0 and 5 are the site's own Navbar and footer (lane D). Blocks 2 and 3 sit in the 3D tour
// (W14-F): a sticky spine beside them that flies to each stop's disc.
import { useCallback, useEffect, useMemo, useRef } from "react";
import { Helmet } from "react-helmet-async";
import { copy } from "../data";
import type { CtaFrom, PlanPageProps, PlanProgress } from "../data/contract";
import { Close } from "./Close";
import { Hero } from "./Hero";
import { NeedBlock } from "./NeedBlock";
import { PartStop } from "./PartStop";
import { SpineTour } from "../spine3d/plan/SpineTour";
import { buildPlanView } from "./planView";
import { SaveBanner } from "./SaveBanner";
import { usePlanDepth } from "./usePlanDepth";

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
      <Hero
        heroText={view.heroText}
        name={visitor.name}
        email={visitor.email}
        headingRef={headingRef}
        onBook={onBook}
        onProgress={report}
        lit={lit}
      />
      <SpineTour departments={lit} planAgentIds={plan.agentIds}>
        <NeedBlock view={view} />
        {view.stops.map((stop) => (
          <PartStop key={stop.department} stop={stop} />
        ))}
      </SpineTour>
      <Close view={view} name={visitor.name} email={visitor.email} onBook={onBook} />
    </div>
  );
}
