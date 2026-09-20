/**
 * The inner content of the site's two-tone page headline: a lead line in
 * primary ink, a tail line in secondary ink, broken onto its own line.
 *
 * WHY THIS EXISTS. Every page used to inline the same idiom by hand:
 *
 *     <h1 …>
 *       One rate is published.
 *       <br />
 *       <span className="text-[var(--text-secondary)]">The rest is scoped.</span>
 *     </h1>
 *
 * Nothing separates the two text runs. `<br>` contributes no characters, and
 * JSX strips the newline between the lines, so the two runs sit flush against
 * each other in the text stream. Block layout made it look right, but every
 * consumer that reads text rather than pixels got the words glued together:
 * `textContent` returned "One rate is published.The rest is scoped.", and the
 * same string is what Google, a screen reader and an AI answer engine each
 * see. The h1 is the highest-value string on a page, so it was wrong in the
 * worst possible place, on eight pages at once.
 *
 * THE FIX. `lead` and `tail` are joined by one real character in the text
 * stream. Notes on why it is done this way:
 *
 *   - It is a text node, not `::after { content: " " }`. Generated content is
 *     not part of `textContent` and would have fixed the appearance of the fix
 *     without fixing anything a crawler actually reads.
 *   - It cannot double up. The lines are trimmed and the gap is supplied here
 *     exactly once, so a stray trailing space in a page's copy cannot produce
 *     "lead  tail", and a second person cannot add a second separator.
 *   - It cannot show up on screen. The gap lands at the end of a line, and CSS
 *     removes white space at the end of a line, so the rendered result is
 *     identical to the markup it replaces. That is the whole point: the pixels
 *     do not move, the text stream gets its missing space.
 *
 * Only the h1's contents live here. The element itself, with its per-page
 * classes, inline type scale and `data-hero-*` animation hooks, stays on the
 * page, so adopting this changes nothing about how a page looks or animates.
 *
 * `lead` and `tail` are strings rather than nodes on purpose: the join is only
 * deterministic if this component owns the whole text. Anything richer has to
 * come back here and think about the separator again, which is correct.
 */

/**
 * The one character that separates headline lines in the text stream.
 * Exported because the home hero splits its lines into animated block spans
 * instead of using this component, and both should mean the same thing by
 * "the gap between the lines".
 */
export const HEADLINE_LINE_GAP = " ";

export default function SplitHeadline({ lead, tail }: { lead: string; tail: string }) {
  return (
    <>
      {lead.trim() + HEADLINE_LINE_GAP}
      <br />
      <span className="text-[var(--text-secondary)]">{tail.trim()}</span>
    </>
  );
}
