/**
 * The duotone, behind the whole site.
 *
 * The hero and the directory paint their own field; everything past them was
 * flat black, which made the theme look like it stopped after two sections.
 * This is the same two lights — warm on one side, violet on the other —
 * fixed behind the page so the ground is never dead, and so a visitor who
 * scrolls past the map is still inside the same room.
 *
 * Fixed rather than per-section on purpose: the lights stay put while content
 * moves over them, which reads as depth rather than as decoration attached to
 * a particular block. Both drift, slowly and out of phase, on the same
 * keyframes the hero uses.
 */
export default function PageAtmosphere() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
      style={{ opacity: "var(--page-atmosphere, 1)" }}
    >
      <div
        className="hero-drift-a absolute left-[-14%] top-[4%] h-[78vh] w-[78vh] rounded-full"
        style={{
          background:
            "radial-gradient(circle at 50% 50%, rgba(255,138,61,0.13) 0%, rgba(232,89,140,0.05) 45%, transparent 72%)",
          filter: "blur(70px)",
        }}
      />
      <div
        className="hero-drift-b absolute right-[-16%] top-[42%] h-[80vh] w-[80vh] rounded-full"
        style={{
          background:
            "radial-gradient(circle at 50% 50%, rgba(140,106,255,0.14) 0%, rgba(140,106,255,0.05) 45%, transparent 72%)",
          filter: "blur(70px)",
        }}
      />
      <div
        className="hero-drift-a absolute bottom-[-10%] left-1/3 h-[60vh] w-[60vh] rounded-full"
        style={{
          background:
            "radial-gradient(circle at 50% 50%, rgba(232,89,140,0.08) 0%, transparent 68%)",
          filter: "blur(80px)",
        }}
      />
      <div
        className="absolute inset-0 opacity-[0.045]"
        style={{
          backgroundImage: "var(--hero-noise)",
          backgroundSize: "160px 160px",
        }}
      />
    </div>
  );
}
