import { ArrowDown, DIM, FAINT, Figure, INK, LINE, LINE_STRONG, MAX, MONO, SANS, VIEW } from "@/features/docs/diagrams/svg";

/**
 * How client data moves through a system Ziiro designs.
 *
 * WHAT THIS REPLACED, and why: it used to draw the marketing site's own two
 * request paths, the contact form and a country lookup. That was the security
 * of a brochure. This draws the thing a CTO is actually evaluating, which is
 * what happens to their data once it is inside a system we build.
 *
 * WHAT IT DRAWS, and the one idea it exists to carry: the model is a single
 * component in the middle of a longer path, not the system. Data passes a
 * control layer, is minimised, is checked against permissions, and only then
 * reaches an approved provider. What comes back is validated by ordinary code
 * and, for high-impact actions, by a person, before anything is written back.
 * Drawn as one vertical path so the sequence is unmistakable and so there is
 * no second layout for a phone.
 *
 * THE TENSE APPLIES TO DRAWINGS TOO. This is how systems ARE DESIGNED. It is
 * not a picture of a certified running deployment, and the caption says so, so
 * that a reviewer cannot reasonably read a drawn box as an audited control.
 *
 * NO ANIMATION, matching every diagram on this site. A pulse tracing the path
 * would be the "watch your data flow" flourish a security page must not have.
 * Direction is carried by arrowheads, which read when an animation would and
 * also when it would not.
 */

/** 34 clears a 20-unit box plus the micro-label that hangs under some of them.
 *  At 26 the labels sat on the box below; every numeric check passed and two
 *  captions were unreadable. */
const ROW = 34;
const CX = VIEW / 2;
/** 150, not 176. The side note sits at the box's right edge plus 6, and at 176
 *  "LEAVES THE BOUNDARY" ran past the 340-unit viewBox and was clipped. An
 *  overlap check does not catch clipping, only looking at it does. */
const BOX_W = 150;
const BOX_H = 20;

/** One stage on the path. `edge` marks the client's own system at each end;
 *  `model` marks the single step that leaves the client's boundary. */
function Stage({
  y,
  label,
  note,
  edge = false,
  model = false,
}: {
  y: number;
  label: string;
  note?: string;
  edge?: boolean;
  model?: boolean;
}) {
  return (
    <g>
      <rect
        x={CX - BOX_W / 2}
        y={y - BOX_H / 2}
        width={BOX_W}
        height={BOX_H}
        rx={3}
        fill="none"
        stroke={edge || model ? LINE_STRONG : LINE}
        strokeWidth={1}
        strokeDasharray={model ? "3 2" : undefined}
      />
      <text
        x={CX}
        y={y + 3.4}
        textAnchor="middle"
        fontFamily={SANS}
        fontSize={8.5}
        fill={edge || model ? INK : DIM}
      >
        {label}
      </text>
      {note && (
        <text
          x={CX + BOX_W / 2 + 6}
          y={y + 2.6}
          textAnchor="start"
          fontFamily={MONO}
          fontSize={6}
          letterSpacing={0.9}
          fill={FAINT}
        >
          {note.toUpperCase()}
        </text>
      )}
    </g>
  );
}

const STAGES: { label: string; note?: string; edge?: boolean; model?: boolean }[] = [
  { label: "Client system", note: "Your boundary", edge: true },
  { label: "Control layer" },
  { label: "Minimisation and redaction" },
  { label: "Permission check" },
  { label: "Approved model provider", note: "Leaves boundary", model: true },
  { label: "Output validation" },
  { label: "Human or policy check" },
  { label: "Back to client system", note: "Your boundary", edge: true },
];

const DESC =
  "A single vertical path with eight stages, read downward. " +
  "1. Client system, inside the client's own boundary. " +
  "2. Control layer. " +
  "3. Minimisation and redaction, where only the portion of data the task needs is kept and sensitive fields are removed or tokenised. " +
  "4. Permission check, where the action is tested against what the agent is scoped to do. " +
  "5. Approved model provider, the one stage that leaves the client's boundary, shown with a broken outline for that reason. " +
  "6. Output validation, where ordinary code checks what the model returned against the rules of the destination. " +
  "7. Human or policy check, for actions that are irreversible, externally visible or financially material. " +
  "8. Back to the client system. " +
  "The model sits in the middle of the path rather than at the end of it: permission, context, validation and human control are supplied by the system around it. " +
  "This is how systems are designed, not a picture of a certified running deployment.";

export default function DataFlow() {
  const top = 26;
  const H = STAGES.length * ROW + 30;
  const y = (i: number) => top + i * ROW;

  return (
    <Figure
      maxWidth={MAX}
      caption="How client data is designed to move: minimised and redacted before it goes anywhere, checked against what the agent may do, and validated on the way back. The model is one step in the middle, and the only one that leaves your boundary. This is the design, not a certified running deployment."
    >
      <svg
        viewBox={`0 0 ${VIEW} ${H}`}
        width="100%"
        role="img"
        aria-labelledby="dataflow-title dataflow-desc"
        style={{ display: "block" }}
      >
        <title id="dataflow-title">
          How client data moves through a system Ziiro designs
        </title>
        <desc id="dataflow-desc">{DESC}</desc>

        <text
          x={CX}
          y={11}
          textAnchor="middle"
          fontFamily={MONO}
          fontSize={6.5}
          letterSpacing={1.1}
          fill={FAINT}
        >
          ONE PATH, EIGHT STAGES
        </text>

        {STAGES.map((s, i) => (
          <g key={s.label}>
            {i > 0 && (
              <>
                <line
                  x1={CX}
                  y1={y(i - 1) + BOX_H / 2}
                  x2={CX}
                  y2={y(i) - BOX_H / 2 - 4}
                  stroke={LINE}
                  strokeWidth={1}
                />
                <ArrowDown x={CX} y={y(i) - BOX_H / 2 - 5} size={3.2} />
              </>
            )}
            <Stage
              y={y(i)}
              label={s.label}
              note={s.note}
              edge={s.edge}
              model={s.model}
            />
          </g>
        ))}
      </svg>
    </Figure>
  );
}
