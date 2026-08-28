/**
 * The field the hero sits on.
 *
 * Five stacked layers, all decorative, all painted once: a wide band of light
 * across the top of the page, a warm bloom where the orb will land, a cool
 * counter-light so the composition isn't lit from a single point, a grain
 * plate, and a vignette that closes the edges. The ground underneath is true
 * black, and nothing is ruled across it — the light and the grain are the
 * whole field.
 *
 * Only the two light pools move, and they move by translating a few percent
 * over half a minute — slow enough that you never catch it, which is the point.
 * Nothing here blurs on every frame and nothing paints outside its own layer.
 */
export default function HeroAtmosphere() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 overflow-hidden"
    >
      {/* The band. A dome pushed almost entirely off the top of the section,
          so all that shows is its lower arc — a rim of light along the head of
          the page rather than a wash behind it. Violet on one shoulder, orange
          on the other, meeting in the bridge hue at the centre: the duotone
          stated across the full width before a word of the page is read. */}
      <div
        className="absolute left-1/2 top-[-48%] h-[58%] w-[124%] -translate-x-1/2 rounded-[50%]"
        style={{
          background:
            "linear-gradient(90deg, rgba(140,106,255,0.04) 0%, rgba(140,106,255,0.26) 20%, rgba(200,100,190,0.22) 38%, rgba(232,89,140,0.24) 52%, rgba(255,138,61,0.26) 74%, rgba(255,138,61,0.04) 100%)",
          filter: "blur(70px)",
        }}
      />

      {/* The bloom, centred on the orb rather than on the section — the light
          has to look like it comes off the object, not like a wash someone
          dropped behind the whole hero. Everything below then reads on
          near-clean black, which is where the serif line gets its contrast. */}
      <div
        className="hero-drift-a absolute left-1/2 top-[-12%] h-[min(820px,80vw)] w-[min(820px,80vw)] -translate-x-1/2 rounded-full"
        style={{
          background:
            "radial-gradient(circle at 50% 50%, rgba(255,138,61,0.19) 0%, rgba(255,138,61,0.055) 30%, rgba(232,89,140,0.03) 52%, transparent 72%)",
          filter: "blur(20px)",
        }}
      />

      {/* Counter-light: the cool half of the duotone, weak and on the other
          side, so the field has two sources rather than one flat radial. */}
      <div
        className="hero-drift-b absolute left-[-10%] top-[10%] h-[min(620px,62vw)] w-[min(620px,62vw)] rounded-full"
        style={{
          background:
            "radial-gradient(circle at 50% 50%, rgba(140,106,255,0.07) 0%, rgba(140,106,255,0.02) 45%, transparent 70%)",
          filter: "blur(30px)",
        }}
      />

      {/* Grain. Enough to break up the gradient banding on wide gamut panels,
          not enough to read as texture. */}
      <div
        className="absolute inset-0 opacity-[0.055]"
        style={{
          backgroundImage: "var(--hero-noise)",
          backgroundSize: "160px 160px",
        }}
      />

      {/* Vignette: pulls the corners down so the centre carries the eye. */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 70% 62% at 50% 40%, transparent 16%, rgba(0,0,0,0.72) 58%, #000000 88%)",
        }}
      />
    </div>
  );
}
