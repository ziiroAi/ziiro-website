import SectionHeader from "@/shared/ui/section-header";
import ScrollScene from "@/shared/motion/ScrollScene";

/**
 * The stack, read top to bottom as a pipeline from your data to a business
 * outcome. The argument is the shape itself: the model sits in the middle as
 * one swappable layer, so the value lives in everything wrapped around it
 * rather than in whichever frontier model is ahead this quarter.
 */
const layers = [
  { name: "Business data", body: "Your systems connected at the source: CRM, billing, ops, support, spreadsheets." },
  { name: "Business intelligence layer", body: "Where the hours and money go, mapped and quantified before anything is built." },
  { name: "Research agents", body: "Agents that gather, enrich, and verify context from inside and outside your business." },
  { name: "Reasoning models", body: "GPT, Claude, Gemini. Interchangeable by design, and never the differentiator.", swappable: true },
  { name: "Automation engine", body: "The layer that actually executes: routing, follow-ups, reporting, and the repetitive decisions." },
  { name: "Internal knowledge", body: "Your rules, your tone, your edge cases, held so every agent applies them the same way." },
  { name: "Continuous learning", body: "Outcomes fed back in, so each loop is tuned against what it produced last week." },
  { name: "Business outcomes", body: "Hours returned, costs reduced, decisions made faster, revenue found.", terminal: true },
];

export default function WhatPowersZiiro() {
  return (
    <section className="relative px-6 py-24 md:px-10 md:py-32">
      <div className="mx-auto max-w-7xl">
        <SectionHeader
          index="03"
          label="What Powers Ziiro"
          meta="the stack"
          titleA="The model isn't"
          titleB="the advantage."
          sub="Anyone can call the same APIs we call. What compounds is the system built around them, and the business context that feeds it."
        />

        <ol className="mt-16 max-w-3xl">
          {layers.map((layer, i) => (
            <li key={layer.name}>
              <ScrollScene rise={12 + Math.min(i, 5) * 5} exitTo={1}>
                <div className="flex gap-6">
                  {/* Rail: the node plus the line that carries into the next layer. */}
                  <div className="flex flex-col items-center">
                    <span
                      aria-hidden="true"
                      className={
                        layer.terminal
                          ? "mt-2 h-3 w-3 shrink-0 rounded-full bg-[var(--text-primary)]"
                          : "mt-2 h-3 w-3 shrink-0 rounded-full border border-[var(--text-secondary)]"
                      }
                    />
                    {i < layers.length - 1 && (
                      <span
                        aria-hidden="true"
                        className="w-px flex-1 bg-[var(--border-strong)]"
                      />
                    )}
                  </div>

                  <div className={i < layers.length - 1 ? "pb-10" : ""}>
                    <div className="flex flex-wrap items-center gap-3">
                      <h3
                        className="font-display font-semibold text-[var(--text-primary)]"
                        style={{ fontSize: "1.15rem", letterSpacing: "-0.02em" }}
                      >
                        {layer.name}
                      </h3>
                      {layer.swappable && (
                        <span className="rounded-full border border-[var(--border-strong)] px-3 py-1 font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--text-secondary)]">
                          Swappable
                        </span>
                      )}
                    </div>
                    <p className="mt-2 max-w-xl text-sm leading-relaxed text-[var(--text-secondary)]">
                      {layer.body}
                    </p>
                  </div>
                </div>
              </ScrollScene>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
