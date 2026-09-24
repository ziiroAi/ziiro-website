/**
 * The hero's live 3D brain: which Spline scene it loads, and the credit its
 * licence requires.
 *
 * Shared because two places read it. The home hero draws the scene
 * (features/home/hero/SplineBrain.tsx), and the Terms page carries the
 * attribution in its Credits line.
 *
 * The scene is the human's export of the community "AI Brain". To replace it,
 * remix in Spline, then Export → Code, and paste the
 * `https://prod.spline.design/<id>/scene.splinecode` URL here. Then:
 * - re-measure SplineBrain's FRAME and MODEL_CENTRE, which are specific to this
 *   export's camera and mesh;
 * - re-render the hero's still (HeroBrain.tsx says how);
 * - update the credit on the Terms page.
 * An empty string turns the live scene off: the hero never fetches the runtime
 * and keeps the still.
 *
 * The "Built with Spline" badge: a free-plan export ships it inside the
 * .splinecode and the runtime draws it into the canvas. SplineBrain switches it
 * off, at the human's explicit decision. Spline's free plan expects the badge
 * to stay, and a Hobby or higher plan exports without it, which is the
 * official route.
 */
// Typed as string so the empty-string off switch stays a valid comparison.
export const SPLINE_BRAIN_SCENE: string =
  "https://prod.spline.design/6F-9Io7GmyXhEfJl/scene.splinecode";

/** CC BY 4.0 requires the credit, a licence link and a note of changes. */
export const SPLINE_BRAIN_SOURCE =
  "https://app.spline.design/community/file/d41a43ec-3a84-472b-9a12-6d2410229667";
export const SPLINE_BRAIN_LICENSE = "https://creativecommons.org/licenses/by/4.0/";
