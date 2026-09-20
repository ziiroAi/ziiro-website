import { ArrowDown, DIM, FAINT, Figure, INK, LINE, LINE_STRONG, MAX, MONO, SANS, VIEW } from "@/features/docs/diagrams/svg";

/**
 * Where a visitor's data actually goes on ziiro.work.
 *
 * WHAT THIS DRAWS, and the reason it draws so little: only the two paths that
 * exist. A contact submission, which is forwarded to a team mailbox and kept
 * nowhere, and a country lookup, which reads a header and stores nothing.
 * There is no third path because there is no database, no account and no
 * analytics store to draw one to.
 *
 * WHAT IT DELIBERATELY DOES NOT DRAW: the architecture of a consulting
 * engagement. A diagram of agents, retrieval stores and approval gates would
 * be the most persuasive thing on this page and the least substantiated, and a
 * reviewer would reasonably read a drawn box as a running system. Engagement
 * architecture is described in words under the risk model instead, where it
 * can carry the caveat that it is designed per contract rather than certified.
 *
 * NO ANIMATION, matching every other diagram on this site. The shared drawing
 * language says so, and it is right here for a second reason: a pulse
 * travelling a path is exactly the "watch the data move" flourish a security
 * page should not have. Direction is carried by arrowheads, which are readable
 * when the animation would be, and also when it would not.
 *
 * ACCESSIBILITY. role="img" with a title and a long desc, so a screen reader
 * announces one figure with a full reading rather than a pile of shapes, and
 * the visible caption states the same thing in words for anyone who cannot
 * resolve the drawing.
 */

/** 34, not the 26 this started at. A row has to clear a 20-unit box AND the
 *  micro-label that hangs under some of them; at 26 the label sat on top of
 *  the next box's edge. Every numeric check passed while two captions were
 *  unreadable, which is why this was caught by looking at it. */
const ROW = 34;
const COL_L = 56;
const COL_R = 214;
const BOX_W = 112;
const BOX_H = 20;

/** One labelled node. Hollow by default; `terminal` marks an endpoint. */
function Node({
  x,
  y,
  label,
  terminal = false,
}: {
  x: number;
  y: number;
  label: string;
  terminal?: boolean;
}) {
  return (
    <g>
      <rect
        x={x - BOX_W / 2}
        y={y - BOX_H / 2}
        width={BOX_W}
        height={BOX_H}
        rx={3}
        fill="none"
        stroke={terminal ? LINE_STRONG : LINE}
        strokeWidth={1}
        strokeDasharray={terminal ? undefined : "3 2"}
      />
      <text
        x={x}
        y={y + 3.4}
        textAnchor="middle"
        fontFamily={SANS}
        fontSize={8.5}
        fill={terminal ? INK : DIM}
      >
        {label}
      </text>
    </g>
  );
}

/** A tracked micro-label, the site's Space Mono usage. */
function Micro({
  x,
  y,
  children,
  anchor = "middle",
}: {
  x: number;
  y: number;
  children: string;
  anchor?: "start" | "middle" | "end";
}) {
  return (
    <text
      x={x}
      y={y}
      textAnchor={anchor}
      fontFamily={MONO}
      fontSize={6.5}
      letterSpacing={1.1}
      fill={FAINT}
    >
      {children.toUpperCase()}
    </text>
  );
}

const DESC =
  "Two paths, side by side, each read downward. Left path, a contact submission: " +
  "the visitor submits the form in the browser; a bot check runs at Cloudflare Turnstile; " +
  "the submission reaches a Ziiro edge function, which validates and escapes it; " +
  "the function hands it to the email provider Resend, which delivers it to the team mailbox. " +
  "The edge function keeps no copy and there is no database to write one to. " +
  "Right path, regional pricing: the browser asks the geo edge function for a country; " +
  "the function reads a two-letter country code from a request header the host sets, " +
  "returns it, and stores nothing. It never handles the IP address itself, and the " +
  "response is marked private and no-store so no cache retains it. " +
  "Neither path reaches a database, an account, or an AI model, because the site has none.";

export default function DataFlow() {
  const rows = 6;
  const H = rows * ROW + 46;
  const top = 30;
  const y = (i: number) => top + i * ROW;

  return (
    <Figure
      maxWidth={MAX}
      caption="The only two paths a visitor's data takes on this site. Both end where they are drawn to end: the contact path in a mailbox with no copy kept, the pricing path nowhere at all. No database, no account and no model sits behind either, because the site has none."
    >
      <svg
        viewBox={`0 0 ${VIEW} ${H}`}
        width="100%"
        role="img"
        aria-labelledby="dataflow-title dataflow-desc"
        style={{ display: "block" }}
      >
        <title id="dataflow-title">
          Where visitor data goes on ziiro.work
        </title>
        <desc id="dataflow-desc">{DESC}</desc>

        <Micro x={COL_L} y={12}>
          Contact submission
        </Micro>
        <Micro x={COL_R} y={12}>
          Regional pricing
        </Micro>
        <line
          x1={VIEW / 2}
          y1={20}
          x2={VIEW / 2}
          y2={H - 30}
          stroke={LINE}
          strokeWidth={1}
          strokeDasharray="2 4"
        />

        {/* ── Left: the contact path ── */}
        <Node x={COL_L} y={y(0)} label="Visitor's browser" />
        <line x1={COL_L} y1={y(0) + BOX_H / 2} x2={COL_L} y2={y(1) - BOX_H / 2 - 4} stroke={LINE} strokeWidth={1} />
        <ArrowDown x={COL_L} y={y(1) - BOX_H / 2 - 5} size={3.2} />

        <Node x={COL_L} y={y(1)} label="Bot check, Cloudflare" />
        <line x1={COL_L} y1={y(1) + BOX_H / 2} x2={COL_L} y2={y(2) - BOX_H / 2 - 4} stroke={LINE} strokeWidth={1} />
        <ArrowDown x={COL_L} y={y(2) - BOX_H / 2 - 5} size={3.2} />

        <Node x={COL_L} y={y(2)} label="Ziiro edge function" terminal />
        <Micro x={COL_L} y={y(2) + BOX_H / 2 + 9}>
          Validated, escaped
        </Micro>
        <line x1={COL_L} y1={y(2) + BOX_H / 2 + 12} x2={COL_L} y2={y(3) - BOX_H / 2 - 4} stroke={LINE} strokeWidth={1} />
        <ArrowDown x={COL_L} y={y(3) - BOX_H / 2 - 5} size={3.2} />

        <Node x={COL_L} y={y(3)} label="Resend, email" />
        <line x1={COL_L} y1={y(3) + BOX_H / 2} x2={COL_L} y2={y(4) - BOX_H / 2 - 4} stroke={LINE} strokeWidth={1} />
        <ArrowDown x={COL_L} y={y(4) - BOX_H / 2 - 5} size={3.2} />

        <Node x={COL_L} y={y(4)} label="Team mailbox" terminal />
        <Micro x={COL_L} y={y(5) - 2}>
          No copy kept
        </Micro>

        {/* ── Right: the country lookup ── */}
        <Node x={COL_R} y={y(0)} label="Visitor's browser" />
        <line x1={COL_R} y1={y(0) + BOX_H / 2} x2={COL_R} y2={y(1) - BOX_H / 2 - 4} stroke={LINE} strokeWidth={1} />
        <ArrowDown x={COL_R} y={y(1) - BOX_H / 2 - 5} size={3.2} />

        <Node x={COL_R} y={y(1)} label="Geo edge function" terminal />
        <Micro x={COL_R} y={y(1) + BOX_H / 2 + 9}>
          Reads country header
        </Micro>
        <line x1={COL_R} y1={y(1) + BOX_H / 2 + 12} x2={COL_R} y2={y(2) - BOX_H / 2 - 4} stroke={LINE} strokeWidth={1} />
        <ArrowDown x={COL_R} y={y(2) - BOX_H / 2 - 5} size={3.2} />

        <Node x={COL_R} y={y(2)} label="Country code returned" />
        <Micro x={COL_R} y={y(3) - 4}>
          Stores nothing
        </Micro>
        <Micro x={COL_R} y={y(3) + 6}>
          Never caches
        </Micro>

        {/* The absent destinations, drawn as absent. A reviewer looks for
            these three, so the diagram answers before the question is asked. */}
        <line x1={20} y1={H - 24} x2={VIEW - 20} y2={H - 24} stroke={LINE} strokeWidth={1} />
        <Micro x={VIEW / 2} y={H - 12}>
          No database · no account · no model on either path
        </Micro>
      </svg>
    </Figure>
  );
}
