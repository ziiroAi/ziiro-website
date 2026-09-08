import { useCallback, useEffect, useRef, useState } from "react";

import CoreOrb, { type CoreOrbHandle } from "@/ogl/CoreOrb";
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
export default function IntelligenceOrb() {
  const coreRef = useRef<CoreOrbHandle>(null);
  const [live, setLive] = useState(false);
  const [failed, setFailed] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

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
      style={{ width: "var(--orb)", height: "var(--orb)" }}
    >
      {/* Ambient bloom, outside the morphing pair so its cycle drifts against
          theirs instead of pumping with them. */}
      <div
        data-hero-reveal
        data-hero-glow
        aria-hidden="true"
        className="hero-glow-pulse absolute -inset-[22%] rounded-full"
        style={{
          background:
            "radial-gradient(circle closest-side at 50% 62%, rgba(255,138,61,0.26) 0%, rgba(232,89,140,0.12) 42%, rgba(140,106,255,0.05) 66%, transparent 80%)",
          filter: "blur(30px)",
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
            "radial-gradient(circle closest-side at 50% 60%, rgba(255,170,110,0.34) 0%, rgba(232,89,140,0.16) 38%, rgba(140,106,255,0.08) 62%, transparent 78%)",
          filter: "blur(36px)",
        }}
      />

      {/* ── The halo ── */}
      <div
        data-hero-reveal
        data-hero-orb
        aria-hidden="true"
        className="absolute inset-0"
      >
        <div
          className="hero-morph absolute inset-0"
          style={{
            background:
              "linear-gradient(to top, rgba(255,242,226,1) 0%, rgba(255,150,78,0.86) 18%, rgba(232,89,140,0.56) 44%, rgba(150,116,255,0.62) 72%, rgba(150,116,255,0.44) 100%)",
            filter: "blur(calc(var(--orb) * 0.072))",
            // The resting shape. Without it, reduced motion stops the morph
            // and the radius falls back to zero — a blurred square.
            borderRadius: "41% 59% 63% 37% / 54% 42% 58% 46%",
          }}
        />
        <div
          className="hero-morph-inner absolute inset-[8%]"
          style={{
            background: "#000000",
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
                // A small, weak specular. Anything larger lifts the middle of
                // the ball and the type inside stops having a black to sit on.
                "radial-gradient(circle at 33% 25%, rgba(242,238,233,0.055) 0%, transparent 34%)",
                // Body: near-black almost all the way out, lifting only in the
                // last tenth. A dark sphere is dark — what makes it read as
                // round is the limb, not a grey fill.
                "radial-gradient(circle at 50% 50%, #030206 0%, #030206 58%, #0a0711 86%, #171122 100%)",
              ].join(", "),
              borderRadius: "52% 48% 47% 53% / 49% 51% 49% 51%",
              boxShadow: [
                // The limb. Tight negative spreads keep both of these on the
                // edge instead of bleeding into the middle, which is what
                // marries the body to the halo — the glow now looks like it
                // comes off the ball rather than sitting behind it.
                "inset 0 -20px 44px -24px rgba(255,150,78,0.95)",
                "inset 0 18px 44px -26px rgba(150,116,255,0.8)",
                "inset 26px -18px 50px -40px rgba(232,89,140,0.6)",
                "inset 0 0 0 1px rgba(242,238,233,0.05)",
                "0 40px 90px -40px rgba(0,0,0,0.9)",
              ].join(", "),
            }}
          >
            {/* Surface sheen, turning slowly. Clipped to the body, so it reads
                as something moving across the object rather than around it. */}
            <div
              className="hero-sphere-spin absolute inset-[-20%]"
              style={{
                background:
                  "conic-gradient(from 0deg, transparent 0deg, rgba(255,138,61,0.07) 55deg, transparent 130deg, transparent 190deg, rgba(150,116,255,0.06) 250deg, transparent 330deg)",
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
            <CoreOrb
              ref={coreRef}
              onReady={onReady}
              onFail={onFail}
              reducedMotion={reducedMotion}
            />
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
                "radial-gradient(ellipse 58% 30% at 50% 50%, rgba(0,0,0,0.82) 0%, rgba(0,0,0,0.5) 55%, transparent 78%)",
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
            className="pointer-events-auto relative z-[2] block cursor-pointer rounded-lg"
            style={{ marginTop: "calc(var(--orb) * 0.045)" }}
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
      <button
        type="button"
        onClick={onActivate}
        aria-label="Animate AI core"
        className="hero-core-button absolute inset-[7%] z-[2] rounded-full"
        style={{ clipPath: "circle(50%)" }}
      />
    </div>
  );
}
