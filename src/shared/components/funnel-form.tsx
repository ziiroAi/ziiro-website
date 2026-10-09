/**
 * (C) W16-B: the funnel's questions are a form, not a page (the owner: "the rounded advert is on the form page… this
 * underlying orange section should be just on the landing page"). While they are on screen the site drops its orange
 * footer and the sheet's rounded bottom; the plan, after the details are in, and every other page keep both.
 */
import { useSyncExternalStore, type ReactNode } from "react";
import { useLocation } from "react-router-dom";
import type { FunnelStage } from "@/features/funnel/data/contract";
import { funnelSession } from "@/features/funnel/flow/session";

const subscribeStage = (onChange: () => void) => funnelSession.subscribe(onChange);
const readStage = (): FunnelStage => funnelSession.stage();
/** The server renders "/" at its first screen, a question. */
const serverStage = (): FunnelStage => "questions";

/** True while the funnel's questions are on screen: "/" before the plan. */
export function useOnFunnelForm(): boolean {
  const { pathname } = useLocation();
  const stage = useSyncExternalStore(subscribeStage, readStage, serverStage);
  return pathname === "/" && stage === "questions";
}

/** The page's sheet (index.css .site-sheet): flat at the bottom on the questions, where there is no footer under it. */
export function SiteSheet({ children }: { children: ReactNode }): JSX.Element {
  const onForm = useOnFunnelForm();
  return (
    <div className="site-sheet" data-flat={onForm ? "" : undefined}>
      {children}
    </div>
  );
}
