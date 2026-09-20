import { ACCENT, ArrowDown, BG, DIM, FAINT, Figure, INK, LINE, LINE_STRONG, MAX, MONO, SANS, VIEW } from "./svg";

/**
 * The engagement lifecycle as one graphic: consult, diagnose, build, optimize.
 *
 * The original Docs brief asked for this explicitly and the page had only a
 * four-box grid, which is a list wearing a grid's clothes: it shows four things
 * but not that they are a sequence, and not that the first is a single hour
 * while the other three are stages decided one at a time.
 *
 * VERTICAL, not the horizontal row I drew first. Four boxes across 340 units
 * leaves about 75 units per step, which fits "OPTIMIZE" only barely and leaves
 * no room at all for each step's sentence. Running it down the page gives every
 * step a full line of width, and a sequence over time reads perfectly well
 * downward. It also means there is no second layout for a phone.
 *
 * Drawn from the same array the prose reads, passed in rather than copied.
 */

export interface LifecycleStep {
  name: string;
  line: string;
}

const ROW_H = 58;
const RAIL_X = 12;
const TEXT_X = 34;

export default function LifecycleFlow({ steps }: { steps: LifecycleStep[] }) {
  const n = steps.length;
  const H = n * ROW_H + 16;

  return (
    <Figure
      maxWidth={MAX}
      caption={`How an engagement runs: ${steps.map((s) => s.name).join(", then ")}.`}
    >
      <svg
        viewBox={`0 0 ${VIEW} ${H}`}
        width="100%"
        role="img"
        aria-labelledby="lifecycle-title lifecycle-desc"
        style={{ display: "block" }}
      >
        <title id="lifecycle-title">Ziiro engagement lifecycle</title>
        <desc id="lifecycle-desc">
          {`A sequence of ${n} steps, read downward. ` +
            steps.map((s, i) => `${i + 1}. ${s.name}: ${s.line}`).join(" ") +
            " The first step is a single paid hour; the three stages after it are scoped and decided one at a time."}
        </desc>

        {steps.map((step, i) => {
          // +18, not +10: the row's index label sits 6 above the node, and at 10 the
          // first one was clipped by the top of the viewBox.
          const y = i * ROW_H + 18;
          const isEntry = i === 0;
          const last = i === n - 1;
          return (
            <g key={step.name}>
              {/* The rail between this node and the next. */}
              {!last && (
                <>
                  <line
                    x1={RAIL_X}
                    y1={y + 8}
                    x2={RAIL_X}
                    y2={y + ROW_H - 6}
                    stroke={LINE}
                    strokeWidth={1}
                  />
                  <ArrowDown x={RAIL_X} y={y + ROW_H - 7} size={3.4} />
                </>
              )}
              {/* Consult is the hour, not a stage, so it is the one hollow
                  node: the difference is drawn rather than only stated. */}
              <circle
                cx={RAIL_X}
                cy={y}
                r={4.5}
                fill={isEntry ? BG : ACCENT}
                stroke={isEntry ? LINE_STRONG : ACCENT}
                strokeWidth={1.2}
              />
              <text
                x={TEXT_X}
                y={y - 6}
                fontFamily={MONO}
                fontSize={10}
                letterSpacing={1.4}
                fill={FAINT}
              >
                {String(i + 1).padStart(2, "0")}
              </text>
              <text
                x={TEXT_X}
                y={y + 9}
                fontFamily={MONO}
                fontSize={13}
                letterSpacing={1.3}
                fill={INK}
              >
                {step.name.toUpperCase()}
              </text>
              <text x={TEXT_X} y={y + 26} fontFamily={SANS} fontSize={11.5} fill={DIM}>
                {step.line}
              </text>
            </g>
          );
        })}
      </svg>
    </Figure>
  );
}
