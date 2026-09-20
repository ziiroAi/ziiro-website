/**
 * The technical canvas: a barely-there dot field that sits behind a diagram so
 * the diagram reads as something drawn rather than something typed.
 *
 * Adapted from ObsidianUI's Dotted Grid, reduced to the one thing that belongs
 * on a monochrome editorial site. What was dropped: the animated parallax, the
 * cursor-reactive highlight and the coloured accent dots. A background that
 * follows the pointer behind body copy is a distraction with a job title.
 *
 * WHERE IT GOES. Architecture and process diagrams only, never behind body
 * copy. On /docs that means exactly two places, the engagement lifecycle and
 * the architecture stack. It is not a page background and it is not a section
 * decoration; if it ever sits behind a paragraph, that is the bug.
 *
 * It is drawn entirely in CSS (one repeating radial-gradient), so it costs no
 * JavaScript, no canvas and no bundle. All of the styling lives in index.css
 * under `.dotted-grid`, including the spacing, the opacity, the edge fade and
 * the accessibility media queries, so a reader can find the whole effect in one
 * place rather than half here and half there.
 *
 * It renders inside a `relative isolate` parent and extends 16px past it on
 * every side, which is inside the page's 24px gutter, so it can never widen the
 * page. `isolate` matters: the layer sits at z-index -1, and without a stacking
 * context on the parent that would put it behind the page rather than behind
 * the diagram.
 *
 * `className` exists for one real case. A diagram whose own cells are opaque
 * cannot show dots through itself, so it needs the canvas to read as a band
 * around it instead: pass a taller, horizontally flush inset. Widen the
 * HORIZONTAL inset at your peril, since 24px is all the gutter there is at
 * 390.
 */
export default function DottedGrid({ className = "" }: { className?: string }) {
  return <div className={`dotted-grid ${className}`} aria-hidden="true" />;
}
