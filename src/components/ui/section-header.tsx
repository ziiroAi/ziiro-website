import MotionReveal from "@/components/motion/MotionReveal";

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
    <MotionReveal>
      <div className="border-t border-[var(--border)] pt-6">
        <div className="mb-10 flex items-center justify-between gap-4">
          <p className="flex items-center gap-3 font-mono text-[11px] font-bold uppercase tracking-[0.25em] text-[var(--text-secondary)]">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-[var(--text-primary)] opacity-70" />
            Sec. {index} — {label}
          </p>
          {meta && (
            <p className="hidden font-mono text-[11px] uppercase tracking-[0.25em] text-[var(--text-secondary)]/70 md:block">
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
              <span className="text-[var(--text-secondary)]">{titleB}</span>
            </>
          )}
        </h2>

        {sub && (
          <p className="mt-6 max-w-xl leading-relaxed text-[var(--text-secondary)]">
            {sub}
          </p>
        )}
      </div>
    </MotionReveal>
  );
}
