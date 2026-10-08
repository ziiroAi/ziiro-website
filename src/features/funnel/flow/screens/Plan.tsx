/** (C) S9 (spec §6; index §1.3): lane C's PlanPage at "/", with what the questions gathered; and S5's prefetch. */
import { Component, Suspense, useEffect, type ReactNode } from "react";
import { calendlyUrl, copy } from "@/features/funnel/data/light";
import { ErrorNote } from "../ErrorNote";
import { LazyHeroPicturePrefetch, LazyPlanPage } from "../plan-chunk";
import { problemTextFrom } from "../words";
import type { ScreenProps } from "./types";

/** If the plan's code can't load, a note shows in its place (§10, review M4) instead of a blank page. */
class PlanBoundary extends Component<{ fallback: ReactNode; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

/** Mounts together with PlanPage once its code has loaded: the plan has painted (§9's time to plan). */
function Painted({ onPaint }: { onPaint(): void }) {
  useEffect(() => {
    onPaint();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once, when the plan paints
  }, []);
  return null;
}

/** The lead was sent, so the plan is in their inbox, unless the save failed or is unsure: then it says only what's true. */
function PlanFailed({ visitor, saveNotice }: { visitor: { name: string; email: string }; saveNotice: ScreenProps["state"]["saveNotice"] }) {
  const line = saveNotice ? copy("s9.err.unsent") : copy("s9.err.sent", { email: visitor.email });
  return <ErrorNote line={line} bookingHref={calendlyUrl(visitor.name, visitor.email)} />;
}

export function PlanScreen({ state, edit, env }: ScreenProps) {
  if (!state.plan || !state.visitor) return null;
  const words = { problemText: problemTextFrom(state.answers.problemText, env.starter), chips: state.answers.chips };
  return (
    <div className="f-plan" tabIndex={-1} data-question="">
      <PlanBoundary fallback={<PlanFailed visitor={state.visitor} saveNotice={state.saveNotice} />}>
        <Suspense fallback={null}>
          <LazyPlanPage
            plan={state.plan}
            visitor={state.visitor}
            words={words}
            saveNotice={state.saveNotice}
            onProgress={(fields) => edit({ type: "progress", fields })}
          />
          <Painted onPaint={() => edit({ type: "planShown", seconds: Math.round((performance.now() - env.boot.t0) / 1_000) })} />
        </Suspense>
      </PlanBoundary>
    </div>
  );
}

/** From S5 until the plan: the hero still, out of sight (§6.6). A prefetch that fails shows nothing. */
export function PlanPrefetch() {
  return (
    <PlanBoundary fallback={null}>
      <Suspense fallback={null}>
        <LazyHeroPicturePrefetch />
      </Suspense>
    </PlanBoundary>
  );
}
