import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Plus } from "lucide-react";
import { animate, createAnimatable, createSpring, stagger } from "animejs";
import SectionHeader from "@/shared/ui/section-header";
import DotGlyph, { type GlyphVariant, type GlyphEnergy } from "@/shared/ui/dot-glyph";

interface Service {
  name: string;
  sub: string;
  desc: string;
  deliverables: string[];
  glyph: GlyphVariant;
  figCaption: string;
}

const services: Service[] = [
  {
    name: "Agentic Systems",
    sub: "Custom AI operators",
    desc: "We build agents that handle real business workflows: research, routing, follow-ups, reporting, and the repetitive decisions that shouldn't live in a founder's head.",
    deliverables: ["Inbox & follow-up agents", "Research & enrichment", "Ops routing", "Reporting agents"],
    glyph: "agents",
    figCaption: "Operators in motion",
  },
  {
    name: "Self-Optimizing Systems",
    sub: "Feedback loops that learn",
    desc: "Marketing, outreach, website, and workflow loops that track their own outcomes and improve automatically — instead of guessing forever.",
    deliverables: ["Outcome tracking", "A/B loops", "Auto-tuned campaigns", "Weekly learning reports"],
    glyph: "loops",
    figCaption: "A loop, learning",
  },
  {
    name: "Business Intelligence",
    sub: "Data that drives decisions",
    desc: "KPI baselines, analytics dashboards, ROI calculations, and priority matrices that show exactly where to invest next.",
    deliverables: ["KPI baselines", "Live dashboards", "ROI models", "Priority matrix"],
    glyph: "bars",
    figCaption: "Signal over noise",
  },
  {
    name: "AI Strategy Sprint",
    sub: "Know what to build",
    desc: "We map your team, stack, and constraints into a focused roadmap. No random tools — just the highest-leverage system to ship first.",
    deliverables: ["Team & stack audit", "Opportunity map", "Build roadmap", "First-system spec"],
    glyph: "path",
    figCaption: "The shortest route",
  },
  {
    name: "Role Analyzer",
    sub: "People in the right seats",
    desc: "A people-fit diagnostic for founder-led teams: understand what each person should own and how to redesign roles for throughput.",
    deliverables: ["Role diagnostics", "Ownership map", "Throughput redesign", "Hiring guidance"],
    glyph: "clusters",
    figCaption: "Right people, right seats",
  },
];

type Animatable = ReturnType<typeof createAnimatable>;
type PanelAnimation = ReturnType<typeof animate>;

export default function ServicesCarousel() {
  const [open, setOpen] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);
  const panelRefs = useRef<(HTMLDivElement | null)[]>([]);
  const panelAnims = useRef<(PanelAnimation | null)[]>([]);
  const titleAnims = useRef<Animatable[]>([]);
  const plusAnims = useRef<Animatable[]>([]);
  const energyAnim = useRef<Animatable | null>(null);
  const energy = useRef<GlyphEnergy>({ speed: 1, gain: 0 });
  const openRef = useRef(0);
  const reduced = useRef(false);

  // Entrance: rows rise in with a stagger the first time they're seen
  useEffect(() => {
    reduced.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const list = listRef.current;
    if (!list) return;
    const rows = list.querySelectorAll<HTMLElement>("[data-svc-row]");
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        io.disconnect();
        animate(rows, {
          opacity: [0, 1],
          y: [28, 0],
          delay: reduced.current ? 0 : stagger(90),
          duration: reduced.current ? 0 : 800,
          ease: "out(3)",
        });
      },
      { threshold: 0.15 },
    );
    io.observe(list);
    return () => io.disconnect();
  }, []);

  // Animatables: hover-follow titles, rotating plus badges, glyph energy
  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const titles = [...list.querySelectorAll<HTMLElement>("[data-svc-title]")];
    const pluses = [...list.querySelectorAll<HTMLElement>("[data-svc-plus]")];
    // Springs give the hover-follow and plus-rotation a tactile, physical feel
    titleAnims.current = titles.map((el) =>
      createAnimatable(el, {
        x: 450,
        ease: createSpring({ stiffness: 260, damping: 22 }),
      }),
    );
    plusAnims.current = pluses.map((el) =>
      createAnimatable(el, {
        rotate: 450,
        ease: createSpring({ stiffness: 200, damping: 17 }),
      }),
    );
    energyAnim.current = createAnimatable(energy.current, {
      speed: 400,
      gain: 400,
      ease: "out(2)",
    });

    // First panel starts open
    plusAnims.current[openRef.current]?.rotate(45);
    const first = panelRefs.current[openRef.current];
    if (first) first.style.height = "auto";

    return () => {
      titleAnims.current.forEach((a) => a.revert());
      plusAnims.current.forEach((a) => a.revert());
      energyAnim.current?.revert();
      titleAnims.current = [];
      plusAnims.current = [];
    };
  }, []);

  const toggle = (i: number) => {
    const prev = openRef.current;
    const next = prev === i ? -1 : i;
    openRef.current = next;
    setOpen(next);

    panelRefs.current.forEach((el, j) => {
      if (!el) return;
      const isOpening = j === next;
      const isClosing = j === prev && prev !== next;
      if (!isOpening && !isClosing) return;

      panelAnims.current[j]?.cancel();
      const from = el.getBoundingClientRect().height;
      el.style.height = `${from}px`;
      panelAnims.current[j] = animate(el, {
        height: `${isOpening ? el.scrollHeight : 0}px`,
        duration: reduced.current ? 0 : 620,
        ease: "inOutQuart",
        onComplete: () => {
          if (isOpening) el.style.height = "auto";
        },
      });
      plusAnims.current[j]?.rotate(isOpening ? 45 : 0);
    });
  };

  const rowEnter = (i: number) => {
    titleAnims.current[i]?.x(10);
    if (i === openRef.current) {
      energyAnim.current?.speed(2.4);
      energyAnim.current?.gain(0.35);
    }
  };

  const rowLeave = (i: number) => {
    titleAnims.current[i]?.x(0);
    energyAnim.current?.speed(1);
    energyAnim.current?.gain(0);
  };

  return (
    <section id="services" className="relative py-24 md:py-32">
      <div className="mx-auto max-w-7xl px-6 md:px-10">
        <SectionHeader
          index="01"
          label="What We Do"
          meta="05 systems"
          titleA="Five systems."
          titleB="One direction."
          sub="Every engagement ships a working system — not a slide deck. These are the five we build, in the order most teams need them."
        />

        <div ref={listRef} className="mt-16 border-t border-[var(--border)]">
          {services.map((s, i) => {
            const isOpen = open === i;
            return (
              <div
                key={s.name}
                data-svc-row
                className="border-b border-[var(--border)]"
                style={{ opacity: 0 }}
                onMouseEnter={() => rowEnter(i)}
                onMouseLeave={() => rowLeave(i)}
              >
                <button
                  onClick={() => toggle(i)}
                  aria-expanded={isOpen}
                  aria-controls={`svc-panel-${i}`}
                  className="group grid w-full grid-cols-12 items-center gap-4 py-7 text-left md:py-9"
                >
                  <span className="col-span-2 font-mono text-sm text-[var(--text-secondary)] md:col-span-1">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span
                    data-svc-title
                    className={`col-span-8 font-display font-semibold tracking-[-0.03em] transition-colors duration-300 md:col-span-5 ${
                      isOpen
                        ? "text-[var(--text-primary)]"
                        : "text-[var(--text-primary)]/70 group-hover:text-[var(--text-primary)]"
                    }`}
                    style={{ fontSize: "clamp(1.35rem, 2.6vw, 2.1rem)" }}
                  >
                    {s.name}
                  </span>
                  <span className="hidden font-mono text-xs uppercase tracking-[0.2em] text-[var(--text-secondary)] md:col-span-5 md:block">
                    {s.sub}
                  </span>
                  <span className="col-span-2 flex justify-end md:col-span-1">
                    <span
                      data-svc-plus
                      className="flex h-10 w-10 items-center justify-center rounded-full border border-[var(--border)] text-[var(--text-secondary)] transition-colors group-hover:border-[var(--text-primary)]/40 group-hover:text-[var(--text-primary)]"
                    >
                      <Plus size={16} />
                    </span>
                  </span>
                </button>

                <div
                  id={`svc-panel-${i}`}
                  ref={(el) => {
                    panelRefs.current[i] = el;
                  }}
                  style={{ height: 0, overflow: "hidden" }}
                >
                  <div className="grid grid-cols-12 gap-6 pb-12 pt-1">
                    <div className="col-span-12 md:col-span-6 md:col-start-2">
                      <p className="mb-7 max-w-xl leading-relaxed text-[var(--text-secondary)]">
                        {s.desc}
                      </p>
                      <div className="mb-9 flex flex-wrap gap-2.5">
                        {s.deliverables.map((d) => (
                          <span
                            key={d}
                            className="neo-inset rounded-full px-4 py-2 font-mono text-xs tracking-wide text-[var(--text-secondary)]"
                          >
                            {d}
                          </span>
                        ))}
                      </div>
                      <Link
                        to="/contact"
                        className="border-b border-[var(--text-primary)]/25 pb-1 text-sm font-semibold text-[var(--text-primary)] transition-colors hover:border-[var(--text-primary)]"
                      >
                        Book a call →
                      </Link>
                    </div>
                    <div className="hidden md:col-span-4 md:col-start-9 md:flex md:flex-col md:items-center md:justify-center">
                      <DotGlyph variant={s.glyph} energy={energy} />
                      <p className="mt-4 font-mono text-[10px] uppercase tracking-[0.3em] text-[var(--text-secondary)]">
                        Fig. {String(i + 1).padStart(2, "0")} — {s.figCaption}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
