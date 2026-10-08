/**
 * (C) W14-I: S0's live spine, a fixed layer under the greeting and S1 (flow.css .f-spine). It never takes part in
 * layout, so it cannot push the options down or shift anything. From 1200 px it fills the gutter right of the
 * questions, framed as r17's hero; under that it is a band along the bottom, under the option cards. All nine discs
 * glow and it spins idly. No still: on S0 a still would compete with the greeting for the LCP, so when the 3D cannot
 * run, the layer simply shows nothing (never a blank box).
 */
import { copy } from "../data/light";
import { useHtmlTheme } from "../plan/useHtmlTheme";
import { SpineViewer } from "../spine3d/SpineViewer";

export function LandingSpine({ visible }: { visible: boolean }): JSX.Element {
  const theme = useHtmlTheme();
  return (
    <div className="f-spine" data-testid="landing-spine" data-visible={visible ? "" : undefined} aria-hidden={!visible}>
      {/* W14-R: the first tap never waits on it: no 3D on software GL, a quiet second past the LCP, gone on an early tap. */}
      <SpineViewer label={copy(theme === "dark" ? "hx.alt.dark" : "hx.alt.light")} className="f-spine-viewer" firstScreen>
        {null}
      </SpineViewer>
    </div>
  );
}
