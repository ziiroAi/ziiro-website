import DynamicIdentity, { useCycle } from "./DynamicIdentity";
import { IDENTITIES } from "./heroContent";

/**
 * The intelligence orb: a body, and the light around it.
 *
 * Two things stacked, and they do different jobs.
 *
 * The halo is a pair of blurred blobs — a coloured one and a black one inset
 * inside it — whose difference is a soft band of light. Both morph their own
 * border-radius on mismatched 19s and 23s cycles, so the band changes shape
 * *and* thickness as they drift out of step. One shape morphing reads as a
 * wobble; two reads as something alive. The light runs bottom-hot: near-white
 * at the base, through the warm accent, into the cool one at the top, so it is
 * lit from below by the same source as the field behind it.
 *
 * Inside that sits an actual sphere, and it's shaded like one: a specular
 * highlight up and to the left, a warm bounce coming back off the floor at the
 * lower right, a cool fill opposite it, and a hairline terminator. A slow
 * sheen turns inside it and the whole body floats on a long cycle, so it reads
 * as a physical object suspended in the light rather than as a hole cut in it.
 *
 * CSS only — no canvas, no WebGL, no dependency. Everything scales off one
 * custom property, `--orb`, including the type and the blur radii, so the
 * proportions are identical at 205px and at 520px. `--orb` itself is set in
 * index.css against [data-orb-scope], because phones need a tighter cap than
 * a media query in a style attribute can express.
 *
 * Do NOT put `will-change: border-radius` on the morphing blobs. It is not a
 * compositor property, so the hint promotes each blob to a layer the size of
 * its own box and the blur — which spreads far past that box — is clipped to
 * it. The result is a hard rectangle around the orb, visible on device.
 */
export default function IntelligenceOrb() {
  // The role is the control: clicking it advances the rotation, and
  // DynamicIdentity's scale variant owns what that looks like.
  const [index, next] = useCycle(IDENTITIES.length, 3400, 1500);

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

      {/* ── The body, and everything that floats with it ── */}
      <div className="hero-float absolute inset-0">
        <div
          data-hero-reveal
          data-hero-orb
          aria-hidden="true"
          className="hero-morph-body absolute inset-[7%] overflow-hidden"
          style={{
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
              // edge instead of bleeding into the middle, which is what marries
              // the body to the halo — the glow now looks like it comes off
              // the ball rather than sitting behind it.
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

        {/* ── Interior ─────────────────────────────────────────────────────
             The label and the role, as one tight pair centred in the orb, with
             the ring orbiting the pair rather than one line of it. ── */}
        <div className="absolute inset-0 flex flex-col items-center justify-center px-[10%] text-center">
          {/* Scrim. The body already reads near-black, but the sheen turns and
              the limb moves, so the type gets its own guaranteed ground. */}
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
            onClick={next}
            aria-label="Show the next role"
            className="relative z-[2] block cursor-pointer"
            style={{ marginTop: "calc(var(--orb) * 0.045)" }}
          >
            <DynamicIdentity
              items={IDENTITIES}
              index={index}
              variant="scale"
              srLabel={`Your AI: ${IDENTITIES.join(", ")}`}
              blur={8}
              gap={90}
              duration={720}
              scaleFrom={0.9}
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
    </div>
  );
}
