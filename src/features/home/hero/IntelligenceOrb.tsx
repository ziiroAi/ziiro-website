import { lazy, Suspense, useCallback, useEffect, useRef, useState } from "react";

import type { CoreOrbHandle } from "@/ogl/CoreOrb";

/**
 * The WebGL body is code-split, as DotArt3D is at the other end of the page.
 * It was a static import, which put ogl (~48K) in the homepage's entry chunk
 * and on the critical path for a layer that is decorative: the poster below is
 * the real first paint, and the canvas only ever crossfades in over it.
 *
 * `import type` for the handle — a type-only import is erased at compile time,
 * so the ref's type costs nothing at runtime. Importing the value here would
 * put the module straight back in the entry chunk and undo the split.
 *
 * No IntersectionObserver gate, unlike DotArtSection: that section is below the
 * fold, so waiting for the viewport genuinely saves the work. The orb is in the
 * hero and already on screen at load, so an observer would fire on the first
 * frame and buy nothing while adding a way for the orb never to appear.
 */
const CoreOrb = lazy(() => import("@/ogl/CoreOrb"));
import DynamicIdentity, { useCycle } from "./DynamicIdentity";
import { IDENTITIES } from "./heroContent";

/**
 * The intelligence core: a dark body, the light on its limb, and the one
 * control that disturbs it.
 *
 * Four layers, and they have different jobs on purpose.
 *
 * The **halo** is CSS: a pair of blurred blobs — a coloured one and a black one
 * inset inside it — whose difference is a soft band of light, morphing on
 * mismatched cycles so the band changes shape *and* thickness as they drift out
 * of step. It stays in CSS because a soft, shapeless glow is exactly what a
 * blur filter is good at and exactly what a rasterised sphere is bad at.
 *
 * The **body** is WebGL: a displaced sphere whose surface really deforms. It is
 * near-black in the middle and carries all of its light on the limb, so what a
 * click actually changes is the *silhouette* — the rim band thickens, thins and
 * travels with the wave crest. That reads far more clearly on a dark object
 * than a moving specular would, and it leaves the middle black enough to set
 * type on.
 *
 * The **poster** is the same body in CSS, and it is not a placeholder — it is
 * shaded with the same rig (warm limb at the base, cool over the top, hairline
 * terminator), so the handover from poster to canvas is invisible. It is what a
 * visitor sees before the scene compiles, what they keep if WebGL fails or the
 * context is lost, and what the prerendered HTML contains for a crawler.
 *
 * The **interior** is sharp HTML — the label and the role, centred on the dark
 * face over their own scrim.
 *
 * Activation is a real `<button>` behind that copy, clipped to a circle so only
 * the visible object is hit-testable. One `click` listener and nothing else: it
 * fires once per completed click or tap, it fires for Enter and Space for free,
 * and a touch that turns into a scroll never fires it at all. Adding a
 * pointerdown handler alongside it is what makes these things fire twice.
 *
 * Do NOT put `will-change: border-radius` on the morphing blobs. It is not a
 * compositor property, so the hint promotes each blob to a layer the size of
 * its own box and the blur — which spreads far past that box — is clipped to
 * it. The result is a hard rectangle around the orb, visible on device.
 */
/** How far the orb shrinks while hovered. This is the animation that used to
 *  fire on click; it fires on hover now, and on nothing else.
 *
 *  It briefly also turned the orb on its Y axis. The human did not want the
 *  tilt, so the engaged state is the shrink alone and the silhouette stays a
 *  circle. The perspective that made the turn readable went with it — the
 *  rotateY was the only 3D transform in this component, and every CSS
 *  animation the orb uses is either flat or a translate3d with a zero Z, which
 *  a perspective cannot affect. */
const HOVER_SHRINK = 0.06;

export default function IntelligenceOrb() {
  const coreRef = useRef<CoreOrbHandle>(null);
  const [live, setLive] = useState(false);
  const [failed, setFailed] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  /** Hovered or keyboard-focused. One boolean with a transition between its two
   *  ends, which is all the gesture is. */
  const [engaged, setEngaged] = useState(false);
  const engage = useCallback(() => setEngaged(true), []);
  const release = useCallback(() => setEngaged(false), []);
  // Only when the focus ring is actually showing: a click also focuses the
  // button, and that must not latch the gesture open after the pointer leaves.
  const onFocus = useCallback((e: React.FocusEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).matches(":focus-visible")) setEngaged(true);
  }, []);

  // The role rotation. Clicking the word advances it; DynamicIdentity's scale
  // variant owns what that looks like.
  const [index, nextIdentity] = useCycle(IDENTITIES.length, 3400, 1500);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(mq.matches);
    const onChange = () => setReducedMotion(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  const onReady = useCallback(() => setLive(true), []);
  const onFail = useCallback(() => {
    setLive(false);
    setFailed(true);
  }, []);

  /**
   * `click` carries viewport coordinates for a pointer, and `detail === 0` for
   * a keyboard activation — which is precisely the signal we need to fall back
   * to a fixed front-facing wave origin.
   */
  /**
   * The halo's share of the response.
   *
   * The shader lifts the ring on activation, but the soft bloom around it lives
   * in CSS behind the canvas and knows nothing about the click — so without
   * this the sharp object flares and the glow around it sits there, which reads
   * as two objects rather than one. The reference site solves the same problem
   * with `filter: brightness()` on the whole wrapper; this does it by fading a
   * dedicated bloom layer instead, because opacity stays on the compositor
   * whereas animating a filter over a 40px blur repaints it every frame.
   *
   * Snap up with no transition, then ease back down over a period matched to
   * the shader's own energy decay, so the two settle together.
   */
  const flareRef = useRef<HTMLDivElement>(null);

  const flare = useCallback(() => {
    const el = flareRef.current;
    if (!el) return;
    el.style.transition = "none";
    el.style.opacity = reducedMotion ? "0.3" : "0.62";
    // Force the style to land before the transition is re-attached, otherwise
    // the browser coalesces both writes and nothing animates.
    void el.offsetHeight;
    el.style.transition = `opacity ${reducedMotion ? 600 : 1500}ms cubic-bezier(0.22, 1, 0.36, 1)`;
    el.style.opacity = "0";
  }, [reducedMotion]);

  const onActivate = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      coreRef.current?.activate(
        e.detail === 0 ? undefined : { x: e.clientX, y: e.clientY },
      );
      flare();
    },
    [flare],
  );

  return (
    <div
      data-orb-scope
      className="relative shrink-0"
      style={{
        // index.css solves `--orb` for the composition this used to sit in: one
        // centred column with the eyebrow, headline, copy, buttons, trust line
        // and scroll cue stacked UNDER the orb, so it subtracts a fixed ~600px
        // of them from the viewport height. Those sit beside it now, and that
        // subtraction was costing the orb most of its size for nothing —
        // measured at 246px in a right column better than twice that wide.
        // One expression rather than a media-query ladder, since an inline
        // style cannot carry breakpoints.
        ["--orb" as string]: "min(clamp(240px, 34vw, 440px), calc(100svh - 300px))",
        width: "var(--orb)",
        height: "var(--orb)",
        // The orb reserves its own glow.
        //
        // Every layer here is drawn OUTSIDE the box: the bloom and the flare
        // are -inset-22% and -inset-26%, so the light starts a fifth of the
        // orb's width above `top: 0`. Laying this out as a plain 205px block
        // therefore under-measures it by ~45px at the top, and the glow ran up
        // behind the fixed navbar — 117px behind it on a large screen, which is
        // what made the composition feel crowded even with padding above.
        //
        // Matching the bloom's own 22% means the visible top of the light lands
        // exactly where the box's top edge would have, so the padding above can
        // be reasoned about in terms of what you actually see. `--orb` in
        // index.css is solved against the 1.22x total this implies.
        marginTop: "calc(var(--orb) * 0.22)",
      }}
      // The gesture is bound here, on the box, rather than on the element that
      // moves. The orb shrinks when engaged, so listening on the moving element
      // would pull its own edge out from under a pointer resting near the rim:
      // leave fires, it grows back, enter fires, and it flickers. This box never
      // transforms. Focus events bubble in React, so both buttons inside are
      // covered by the same pair and a keyboard reader gets what hover gets.
      //
      // Binding here is necessary but NOT sufficient, and this is the subtle
      // part: pointerenter/pointerleave on a box are satisfied by the pointer
      // being over ANY DESCENDANT of it, not just over the box itself. The
      // decorative layers below are drawn at -inset-22% and -inset-26%, so they
      // hang ~22% of the orb's width outside this box — and they sit inside
      // [data-orb-turn], which is the thing that scales. So a pointer resting
      // on the outer edge of the glow was still "inside" this box, engaging it,
      // which shrank the glow out from under the pointer, which fired leave,
      // which grew it back. The exact loop the paragraph above is about, one
      // element further out. Measured at 20-26 enter/leave pairs per second
      // from a stationary pointer, in a ~19px band at the edge of the halo.
      //
      // The fix is that every layer reaching outside this box is
      // pointer-events-none, so the hit region is this box and nothing wider.
      // If you add another layer out there, it needs the same, or the flicker
      // comes straight back.
      onPointerEnter={engage}
      onPointerLeave={release}
      onPointerCancel={release}
      onFocus={onFocus}
      onBlur={release}
    >
      {/* The one element the hover gesture moves, and all it does is shrink —
          the animation that used to fire on click. A CSS transition between two
          states is also what makes it reverse smoothly and stay interruptible
          — leaving mid-arrival retargets the same transform from wherever it
          is rather than queueing a separate exit. */}
      <div
        data-orb-turn
        className="absolute inset-0"
        style={{
          transform:
            reducedMotion || !engaged ? "none" : `scale(${1 - HOVER_SHRINK})`,
          transition: reducedMotion
            ? "none"
            : "transform 620ms cubic-bezier(0.22, 1, 0.36, 1)",
        }}
      >
      {/* Ambient bloom, outside the morphing pair so its cycle drifts against
          theirs instead of pumping with them. */}
      {/* Ambient bloom, outside the morphing pair so its cycle drifts against
          theirs instead of pumping with them.

          No `filter: blur()` here, deliberately. This element animates scale
          and opacity forever, so a blur on it is a large CSS filter re-run
          every frame of a continuous scene — the thing the art direction
          explicitly rules out, and a second candidate for the same clipped-
          rectangle artefact as the halo below. A radial gradient is already
          perfectly smooth; the blur was belt-and-braces on top of something
          that did not need it. The stops are spread a little wider to make up
          the softness it was contributing. */}
      <div
        data-hero-reveal
        data-hero-glow
        aria-hidden="true"
        // pointer-events-none because this reaches outside [data-orb-scope],
        // which owns the hover gesture. See the note on that element.
        className="hero-glow-pulse pointer-events-none absolute -inset-[22%] rounded-full"
        style={{
          background:
            "radial-gradient(circle closest-side at 50% 64%, rgba(10,10,10,0.05) 0%, rgba(10,10,10,0.03) 30%, rgba(10,10,10,0.012) 52%, transparent 78%)",
        }}
      />

      {/* The click's share of the bloom. Zero at rest, so it costs nothing and
          never fights the ambient pulse above it — they are separate layers
          precisely so one can be driven by time and the other by input. */}
      <div
        ref={flareRef}
        aria-hidden="true"
        className="pointer-events-none absolute -inset-[26%] rounded-full"
        style={{
          opacity: 0,
          background:
            "radial-gradient(circle closest-side at 50% 58%, rgba(10,10,10,0.14) 0%, rgba(10,10,10,0.09) 26%, rgba(10,10,10,0.04) 50%, transparent 78%)",
        }}
      />

      {/* ── The halo ──────────────────────────────────────────────────────
           The container is -inset-22% and the blobs are inset back INSIDE it,
           which lands them at exactly the same place on screen as a plain
           `inset-0` would. The 45px of empty box that buys is the entire point.

           A blurred element is rasterised into a layer, and on some mobile
           GPUs that layer is sized to the element's own box rather than to the
           box plus the filter's outset. `hero-morph` used to fill `inset-0`
           edge to edge with a 14.8px blur that needs ~45px of spread, so on
           device the spread was cut off square and the orb sat inside a visible
           rectangle — reported from a real handset, invisible in every desktop
           browser.

           Margin is the fix rather than a smaller blur, because the blur is
           what smears the morphing border-radius into a halo in the first
           place. 45px is 3x the blur radius, which is where a gaussian has
           effectively reached zero — so it no longer matters whether the layer
           is clipped to the box or not.

           This is the same failure the note at the top of this file describes
           for `will-change: border-radius`. It does not need will-change to
           happen: a filter plus a running animation is enough. ── */}
      <div
        data-hero-reveal
        data-hero-orb
        aria-hidden="true"
        // pointer-events-none for the same reason as the bloom above: this box
        // reaches outside [data-orb-scope] and scales with the hover, so left
        // hit-testable it makes the gesture fight itself. Inherited by both
        // morph blobs inside it.
        className="pointer-events-none absolute -inset-[22%]"
      >
        <div
          className="hero-morph absolute inset-[15.28%]"
          style={{
            // Ink, and only its density varies. The ramp that used to run from
            // a near-white hot spot at the base up through orange and pink to
            // violet is now the same ramp in one tone: heavier at the bottom,
            // lighter over the top. That gradient is tonal rather than
            // chromatic, which is what still makes a blurred blob read as a
            // form lit from above once the hues are gone.
            background:
              "linear-gradient(to top, rgba(10,10,10,0.15) 0%, rgba(10,10,10,0.13) 18%, rgba(10,10,10,0.10) 44%, rgba(10,10,10,0.085) 72%, rgba(10,10,10,0.06) 100%)",
            filter: "blur(calc(var(--orb) * 0.072))",
            // The resting shape. Without it, reduced motion stops the morph
            // and the radius falls back to zero — a blurred square.
            borderRadius: "41% 59% 63% 37% / 54% 42% 58% 46%",
          }}
        />
        <div
          className="hero-morph-inner absolute inset-[20.83%]"
          style={{
            // The ground, not a colour. This blob only exists to erase the
            // middle of the one above so their difference is a band, so it has
            // to be whatever the page is standing on — black when the hero
            // painted its own black field, the page's white now.
            background: "var(--hero-bg)",
            filter: "blur(calc(var(--orb) * 0.05))",
            borderRadius: "58% 42% 40% 60% / 44% 58% 42% 56%",
          }}
        />
      </div>

      {/* ── The body, and everything that floats with it ──────────────────
           Poster and canvas occupy the same box. The shader's fitRadius of
           0.43 puts the sphere's silhouette exactly where `inset: 7%` puts the
           poster's, so the two coincide and the crossfade reads as the object
           sharpening rather than as a swap. */}
      <div className="hero-float absolute inset-0">
        {/* Two nested elements because two things own opacity here and they
            must not fight: the entrance timeline animates the outer one, React
            crossfades the inner one against the canvas. */}
        <div
          data-hero-reveal
          data-hero-orb
          aria-hidden="true"
          className="absolute inset-[7%]"
        >
          <div
            className="hero-morph-body absolute inset-0 overflow-hidden"
            style={{
              opacity: live ? 0 : 1,
              transition: "opacity 620ms cubic-bezier(0.22, 1, 0.36, 1)",
              background: [
                // Body: the page's own white almost all the way out, taking ink
                // only in the last tenth. Exactly the logic the near-black
                // version used, run the other way up — a pale disc is pale, and
                // what makes it read as an object is the rim, not a fill. The
                // specular that used to sit on top of this is gone rather than
                // inverted: on a pale body a lighter spot is invisible, so it
                // only ever read as a warm one, and warm is a hue.
                "radial-gradient(circle at 50% 50%, var(--hero-bg) 0%, var(--hero-bg) 58%, rgba(10,10,10,0.04) 86%, rgba(10,10,10,0.09) 100%)",
              ].join(", "),
              borderRadius: "52% 48% 47% 53% / 49% 51% 49% 51%",
              boxShadow: [
                // The rim. Tight negative spreads keep these on the edge instead
                // of bleeding into the middle, which is what marries the body to
                // the halo. The two that used to carry the duotone's cast are
                // kept as ink at the same strengths, because what they actually
                // do is thicken the rim off-axis — which is what stops a ring of
                // even weight reading as a drawn circle.
                "inset 0 -20px 44px -24px rgba(10,10,10,0.62)",
                "inset 0 18px 44px -26px rgba(10,10,10,0.42)",
                "inset 26px -18px 50px -40px rgba(10,10,10,0.26)",
                "inset 0 0 0 1px var(--hero-line)",
                // 0.9 alpha at 90px was a black field's shadow; over white it
                // would be a grey plate the size of the orb.
                "0 34px 64px -38px rgba(10,10,10,0.30)",
              ].join(", "),
            }}
          >
            {/* Surface sheen, turning slowly. Clipped to the body, so it reads
                as something moving across the object rather than around it. */}
            <div
              className="hero-sphere-spin absolute inset-[-20%]"
              style={{
                background:
                  "conic-gradient(from 0deg, transparent 0deg, rgba(10,10,10,0.04) 55deg, transparent 130deg, transparent 190deg, rgba(10,10,10,0.035) 250deg, transparent 330deg)",
              }}
            />
            {/* Grain, so the shading never bands on a wide-gamut panel. */}
            <div
              className="absolute inset-0 opacity-[0.05]"
              style={{
                backgroundImage: "var(--hero-noise)",
                backgroundSize: "160px 160px",
              }}
            />
          </div>
        </div>

        {/* The ring shader normalises its coordinates so that len = 1.0 lands
            on the shorter side of the canvas, and the ring's outer falloff is
            already inside that — so the canvas is simply the orb's own box and
            nothing clips. */}
        {!failed && (
          <div
            aria-hidden="true"
            className="absolute inset-0"
            style={{
              opacity: live ? 1 : 0,
              transition: "opacity 620ms cubic-bezier(0.22, 1, 0.36, 1)",
            }}
          >
            {/* The box is reserved by this layer, not by the fallback: it is
                `absolute inset-0` inside a parent sized `var(--orb)` square,
                so the canvas contributes nothing to layout and there is no
                shift to have whether the chunk has landed or not. That is also
                why the boundary sits inside this div rather than around it —
                the opacity transition that crossfades poster to canvas stays
                mounted across the swap instead of being torn down with it.

                `fallback={null}` because the poster underneath already IS the
                fallback, at `opacity: 1` until `onReady` flips `live`. Drawing
                anything here would just stack a second placeholder on it.
                `renderToString` cannot flush Suspense, so nothing inside this
                boundary reaches the prerendered HTML — which is the same
                bargain DotArtSection documents, and fine for the identical
                reason: the crawler gets the poster. */}
            <Suspense fallback={null}>
              <CoreOrb
                ref={coreRef}
                onReady={onReady}
                onFail={onFail}
                reducedMotion={reducedMotion}
              />
            </Suspense>
          </div>
        )}

        {/* ── Interior ───────────────────────────────────────────────────
             The label and the role, as one tight pair centred on the dark
             face. Above the activation button in the stack, so the word stays
             its own control and clicking it advances the rotation rather than
             rippling the surface. ── */}
        <div className="pointer-events-none absolute inset-0 z-[3] flex flex-col items-center justify-center px-[10%] text-center">
          {/* Scrim. The body already reads near-black, but the rim moves and
              the ripples cross the face, so the type gets its own guaranteed
              ground. */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                "radial-gradient(ellipse 58% 30% at 50% 50%, rgba(255,255,255,0.92) 0%, rgba(255,255,255,0.62) 55%, transparent 78%)",
            }}
          />

          <p
            data-hero-reveal
            data-hero-orb-label
            className="relative z-[2] font-mono uppercase"
            style={{
              fontSize: "max(11px, calc(var(--orb) * 0.042))",
              letterSpacing: "0.17em",
              textIndent: "0.17em",
              color: "var(--hero-dim)",
            }}
          >
            Your AI
          </p>

          <button
            type="button"
            data-hero-reveal
            data-hero-orb-word
            onClick={nextIdentity}
            aria-label="Show the next role"
            // 7px of padding takes the role-cycling button past 44px; the
            // margin gives the same 7px back above it so the word stays on
            // the line the orb's proportions put it on.
            className="pointer-events-auto relative z-[2] block cursor-pointer rounded-lg py-[7px]"
            style={{ marginTop: "calc(var(--orb) * 0.045 - 7px)" }}
          >
            <DynamicIdentity
              items={IDENTITIES}
              index={index}
              variant="scale"
              srLabel={`Your AI: ${IDENTITIES.join(", ")}`}
              // gap >= durationOut, so the outgoing word has fully cleared
              // before the next one starts arriving. The previous 90ms against
              // a 720ms swap left both words legible on top of each other for
              // most of the transition — the ghosted double-image that showed
              // up on a real handset.
              blur={6}
              durationOut={220}
              gap={240}
              duration={560}
              scaleFrom={0.92}
              className="justify-items-center font-display font-bold"
              style={{
                fontSize: "calc(var(--orb) * 0.115)",
                lineHeight: 1,
                letterSpacing: "-0.031em",
                color: "var(--hero-ink)",
                whiteSpace: "nowrap",
              }}
            />
          </button>
        </div>
      </div>

      {/* ── The control ───────────────────────────────────────────────────
           Clipped to a circle so a click in the corner of the square falls
           through to the page instead of rippling an object that isn't there.
           `clip-path` clips hit-testing as well as paint, so this is the hit
           region, not just its picture. It sits under the interior copy in the
           stack, which is what lets the role button keep its own clicks. */}
      {/* The `.hero-core-button` class this used to carry has been deleted from
          index.css, so its reset is inlined here — without it the element takes
          the UA button styling and paints a grey box over the orb. Its focus
          ring went too, and it cannot simply come back: a ring on this element
          would be clipped away by the very `clip-path` that makes the hit region
          correct, so it is drawn on the sibling below instead. */}
      <button
        type="button"
        onClick={onActivate}
        aria-label="Animate AI core"
        className="peer absolute inset-[7%] z-[2] cursor-pointer rounded-full border-0 bg-transparent p-0 outline-none"
        style={{
          clipPath: "circle(50%)",
          // `auto`, not `none`: a touch that turns into a page scroll must
          // scroll the page, and the browser then declines to fire the click.
          // That is the whole mechanism keeping a scroll gesture from
          // activating the core.
          touchAction: "auto",
          WebkitTapHighlightColor: "transparent",
        }}
      />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-[7%] z-[2] rounded-full opacity-0 peer-focus-visible:opacity-100"
        style={{
          boxShadow: "0 0 0 2px var(--hero-bg), 0 0 0 4px var(--hero-ink)",
        }}
      />
      </div>
    </div>
  );
}
