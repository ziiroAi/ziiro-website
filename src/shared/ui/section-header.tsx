import ScrollScene from "@/shared/motion/ScrollScene";

/**
 * Shared editorial section header: hairline rule, dot marker, mono
 * index/label, bracketed meta on the right, and a tight two-tone
 * display headline set in Inter. Keeps every section speaking the
 * same visual language as the dot-art world and nav wordmark.
 */
export default function SectionHeader({
  index,
  label,
  meta,
  titleA,
  titleB,
  sub,
}: {
  index: string;
  label: string;
  meta?: string;
  titleA: string;
  titleB?: string;
  sub?: string;
}) {
  return (
    // exitTo={1}: headers resolve on scroll but never dim on the way out.
    // The homepage opts into overlap at the section level instead, so pages
    // like /process and /mission keep their headings at full strength.
    <ScrollScene exitTo={1}>
      <div className="border-t border-[var(--border)] pt-6">
        <div className="mb-10 flex items-center justify-between gap-4">
          <p className="flex items-center gap-3 font-mono text-[11px] font-bold uppercase tracking-[0.25em] text-[var(--text-secondary)]">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-[var(--accent)]" />
            Sec. {index} / {label}
          </p>
          {meta && (
            <p className="hidden font-mono text-[11px] uppercase tracking-[0.25em] text-[var(--text-muted)] md:block">
              [ {meta} ]
            </p>
          )}
        </div>

        <h2
          className="font-display font-semibold text-[var(--text-primary)]"
          style={{
            fontSize: "clamp(2.4rem, 5vw, 4.3rem)",
            letterSpacing: "-0.03em",
            lineHeight: 1.04,
          }}
        >
          {titleA}
          {titleB && (
            <>
              <br />
              <span
                style={{
                  background: "var(--gradient-text)",
                  WebkitBackgroundClip: "text",
                  backgroundClip: "text",
                  color: "transparent",
                  // A gradient fill clips the descenders of a tight display
                  // face unless the box is given room to breathe.
                  paddingBottom: "0.08em",
                  display: "inline-block",
                }}
              >
                {titleB}
              </span>
            </>
          )}
        </h2>

        {sub && (
          <p className="mt-6 max-w-xl leading-relaxed text-[var(--text-secondary)]">
            {sub}
          </p>
        )}
      </div>
    </ScrollScene>
  );
}
