import { ACCENT, DIM, FAINT, Figure, INK, LINE, LINE_STRONG, MAX, MONO, SANS, VIEW } from "./svg";

/**
 * The priority matrix: value against effort, four named quadrants.
 *
 * This is the framework phase 06 Prioritize actually runs, and until now the
 * page said "ranked by value against difficulty on a clear 2x2" without ever
 * showing the 2x2. It is the one diagram here that teaches a method a reader
 * could apply to their own list tonight, which is what a docs page is for.
 *
 * Generic methodology only. Nothing about engagement models, revenue or data
 * access appears here or anywhere on the public site.
 *
 * Square, authored at VIEW like the rest, so it needs no second layout: it
 * renders about 1:1 on a phone and scales up to the shared cap on a desktop.
 */

const S = VIEW;
const PAD_L = 34;
const PAD_B = 30;
const PAD_T = 10;
const PAD_R = 8;

const QUADRANTS = [
  { label: "Do first", note: "High value, low effort", col: 0, row: 0, strong: true },
  { label: "Plan next", note: "High value, high effort", col: 1, row: 0, strong: false },
  { label: "Nice to have", note: "Low value, low effort", col: 0, row: 1, strong: false },
  { label: "Skip for now", note: "Low value, high effort", col: 1, row: 1, strong: false },
];

export default function PriorityMatrix() {
  const plotW = S - PAD_L - PAD_R;
  const plotH = S - PAD_T - PAD_B;
  const halfW = plotW / 2;
  const halfH = plotH / 2;

  return (
    <Figure
      maxWidth={MAX}
      caption="Every opportunity is placed by value against effort. Do first is the quadrant that builds momentum."
    >
      <svg
        viewBox={`0 0 ${S} ${S}`}
        width="100%"
        role="img"
        aria-labelledby="matrix-title matrix-desc"
        style={{ display: "block" }}
      >
        <title id="matrix-title">Priority matrix, value against effort</title>
        <desc id="matrix-desc">
          A two by two matrix. The vertical axis is value, low at the bottom and high at the
          top. The horizontal axis is effort, low on the left and high on the right. The four
          quadrants are: Do first, high value and low effort. Plan next, high value and high
          effort. Nice to have, low value and low effort. Skip for now, low value and high
          effort.
        </desc>

        {QUADRANTS.map((q) => {
          const x = PAD_L + q.col * halfW;
          const y = PAD_T + q.row * halfH;
          return (
            <g key={q.label}>
              <rect
                x={x}
                y={y}
                width={halfW}
                height={halfH}
                fill={q.strong ? ACCENT : "transparent"}
                opacity={q.strong ? 0.05 : 1}
                stroke={LINE}
                strokeWidth={0.8}
              />
              <text
                x={x + 11}
                y={y + 23}
                fontFamily={SANS}
                fontSize={13}
                fontWeight={600}
                fill={q.strong ? INK : DIM}
              >
                {q.label}
              </text>
              <text x={x + 11} y={y + 39} fontFamily={SANS} fontSize={10} fill={DIM}>
                {q.note}
              </text>
            </g>
          );
        })}

        {/* The two axes, drawn over the quadrant edges so the cross reads as
            the structure rather than as four boxes that happen to touch. */}
        <line
          x1={PAD_L}
          y1={PAD_T + halfH}
          x2={PAD_L + plotW}
          y2={PAD_T + halfH}
          stroke={LINE_STRONG}
          strokeWidth={1}
        />
        <line
          x1={PAD_L + halfW}
          y1={PAD_T}
          x2={PAD_L + halfW}
          y2={PAD_T + plotH}
          stroke={LINE_STRONG}
          strokeWidth={1}
        />

        {/* Effort runs left to right along the bottom. */}
        <text
          x={PAD_L}
          y={S - 12}
          fontFamily={MONO}
          fontSize={9.5}
          letterSpacing={1.1}
          fill={FAINT}
        >
          LOW EFFORT
        </text>
        <text
          x={PAD_L + plotW}
          y={S - 12}
          textAnchor="end"
          fontFamily={MONO}
          fontSize={9.5}
          letterSpacing={1.1}
          fill={FAINT}
        >
          HIGH EFFORT
        </text>

        {/* Value runs bottom to top, so its label is rotated up the left edge. */}
        <text
          transform={`translate(13, ${PAD_T + plotH}) rotate(-90)`}
          fontFamily={MONO}
          fontSize={9.5}
          letterSpacing={1.1}
          fill={FAINT}
        >
          LOW VALUE
        </text>
        <text
          transform={`translate(13, ${PAD_T}) rotate(-90)`}
          textAnchor="end"
          fontFamily={MONO}
          fontSize={9.5}
          letterSpacing={1.1}
          fill={FAINT}
        >
          HIGH VALUE
        </text>
      </svg>
    </Figure>
  );
}
