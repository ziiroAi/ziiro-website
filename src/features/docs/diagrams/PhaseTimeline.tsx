import { ACCENT, DIM, FAINT, Figure, INK, LINE, MAX, MONO, SANS, VIEW } from "./svg";
import { PHASES } from "@/features/who-we-are/entities/phases";

/**
 * The seven diagnosis phases on their real spans.
 *
 * This is NOT a second copy of the accordion below it. The accordion answers
 * what each phase does; this answers a question the accordion cannot, which is
 * what the three weeks actually look like: that Understand and Map are days
 * rather than weeks, that week 2 carries two phases at once, and that the
 * whole thing lands inside three weeks. That shape is in `days` on every phase
 * and was previously readable only by opening seven rows and holding them in
 * your head.
 *
 * Read straight off `PHASES`, not passed in, because the bands below are
 * derived from each phase's own `days` string rather than authored: add a
 * phase to the entity and it appears here on its stated span.
 */

const ROW_H = 30;
const TRACK_X = 150;
const TRACK_W = VIEW - TRACK_X - 4;

/** Three weeks, in days, which is what every `days` string resolves into. */
const TOTAL_DAYS = 21;

/**
 * Turn a phase's own wording into a span in days.
 *
 * Deliberately a parser over the entity rather than a second table of numbers:
 * a hand-kept table is exactly the kind of duplicate that drifts, and the
 * whole reason these diagrams read from entities is to make drift impossible.
 * Understood forms, which are all seven that exist: "Days 1-3", "Week 1",
 * "Week 2". Anything unrecognised returns null and that phase draws no band
 * rather than drawing a wrong one.
 */
function span(days: string): [number, number] | null {
  const dayRange = days.match(/Days?\s+(\d+)\s*[-–]\s*(\d+)/i);
  if (dayRange) return [Number(dayRange[1]) - 1, Number(dayRange[2])];
  const single = days.match(/Day\s+(\d+)/i);
  if (single) return [Number(single[1]) - 1, Number(single[1])];
  const week = days.match(/Week\s+(\d+)/i);
  if (week) {
    const w = Number(week[1]);
    return [(w - 1) * 7, w * 7];
  }
  return null;
}

export default function PhaseTimeline() {
  const n = PHASES.length;
  // +48 leaves the footer clear of the last row's output line, which it
  // collided with at +34.
  const H = n * ROW_H + 48;
  const x = (day: number) => TRACK_X + (day / TOTAL_DAYS) * TRACK_W;

  return (
    <Figure
      maxWidth={MAX}
      caption="The seven phases across three weeks. Week 2 carries two of them."
    >
      <svg
        viewBox={`0 0 ${VIEW} ${H}`}
        width="100%"
        role="img"
        aria-labelledby="phases-title phases-desc"
        style={{ display: "block" }}
      >
        <title id="phases-title">Diagnose, seven phases across three weeks</title>
        <desc id="phases-desc">
          {"A timeline. " +
            PHASES.map((p) => `${p.num} ${p.name}, ${p.days}, ends in ${p.output}.`).join(" ")}
        </desc>

        {/* Week gridlines, so a band's position means something. */}
        {[0, 1, 2, 3].map((w) => (
          <g key={w}>
            <line
              x1={x(w * 7)}
              y1={16}
              x2={x(w * 7)}
              y2={n * ROW_H + 18}
              stroke={LINE}
              strokeWidth={1}
            />
            {w < 3 && (
              <text
                x={x(w * 7) + 5}
                y={11}
                fontFamily={MONO}
                fontSize={9.5}
                letterSpacing={1.1}
                fill={FAINT}
              >
                {`WK ${w + 1}`}
              </text>
            )}
          </g>
        ))}

        {PHASES.map((phase, i) => {
          const y = 22 + i * ROW_H;
          const s = span(phase.days);
          return (
            <g key={phase.num}>
              <text
                x={0}
                y={y + 13}
                fontFamily={MONO}
                fontSize={10}
                letterSpacing={1.2}
                fill={FAINT}
              >
                {phase.num}
              </text>
              <text x={22} y={y + 12} fontFamily={SANS} fontSize={12} fontWeight={600} fill={INK}>
                {phase.name}
              </text>
              <text
                x={22}
                y={y + 24}
                fontFamily={SANS}
                fontSize={10}
                fill={DIM}
              >
                {phase.output}
              </text>
              {s && (
                <rect
                  x={x(s[0])}
                  y={y + 3}
                  width={Math.max(6, x(s[1]) - x(s[0]))}
                  height={12}
                  rx={2}
                  fill={ACCENT}
                  opacity={0.16}
                  stroke={ACCENT}
                  strokeWidth={0.8}
                />
              )}
            </g>
          );
        })}

        <text
          x={0}
          y={H - 4}
          fontFamily={MONO}
          fontSize={9.5}
          letterSpacing={1.2}
          fill={FAINT}
        >
          FIXED SCOPE, ONE TO THREE WEEKS
        </text>
      </svg>
    </Figure>
  );
}
