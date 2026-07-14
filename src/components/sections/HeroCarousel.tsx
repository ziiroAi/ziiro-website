import { Link } from "react-router-dom";
import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { createTimeline, stagger } from "animejs";
import {
  LayoutDashboard,
  Code,
  MapPin,
  AlignLeft,
  Globe,
  Mail,
  Brain,
  Workflow,
} from "lucide-react";
import DotGlyph from "@/components/ui/dot-glyph";
import TextReveal from "@/components/motion/TextReveal";

function IconCircle({
  Icon,
  size = "lg",
}: {
  Icon: typeof Brain;
  size?: "sm" | "lg";
}) {
  const dim =
    size === "lg"
      ? "w-[90px] h-[90px] md:w-[130px] md:h-[130px]"
      : "w-[70px] h-[70px] md:w-[100px] md:h-[100px]";
  const iconSize = size === "lg" ? 28 : 22;

  return (
    <div
      data-hero-icon
      style={{ opacity: 0 }}
      className={`${dim} rounded-full border border-black/15 dark:border-white/15 flex items-center justify-center shrink-0`}
    >
      <Icon
        size={iconSize}
        strokeWidth={1}
        className="text-black/40 dark:text-white/40"
      />
    </div>
  );
}

function Connector() {
  return (
    <div
      data-hero-connector
      style={{ opacity: 0 }}
      className="flex items-center shrink-0 mx-1 origin-left"
    >
      <div className="w-[5px] h-[5px] rotate-45 bg-black/40 dark:bg-white/40" />
      <div className="w-8 md:w-14 h-[1px] bg-black/15 dark:bg-white/15" />
      <div className="w-[5px] h-[5px] rotate-45 bg-black/40 dark:bg-white/40" />
    </div>
  );
}

function DotGrid() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const w = 400;
    const h = 400;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.scale(dpr, dpr);

    const cols = 20;
    const rows = 20;
    const spacing = w / cols;
    let frame = 0;
    let raf: number;

    function draw() {
      ctx!.clearRect(0, 0, w, h);
      for (let i = 0; i < cols; i++) {
        for (let j = 0; j < rows; j++) {
          const x = i * spacing + spacing / 2;
          const y = j * spacing + spacing / 2;
          const dist = Math.sqrt((x - w / 2) ** 2 + (y - h / 2) ** 2);
          const wave = Math.sin(dist * 0.03 - frame * 0.02) * 0.5 + 0.5;
          const radius = 1.5 + wave * 2.5;
          const alpha = 0.15 + wave * 0.4;
          ctx!.beginPath();
          ctx!.arc(x, y, radius, 0, Math.PI * 2);
          ctx!.fillStyle = `rgba(255, 255, 255, ${alpha})`;
          ctx!.fill();
        }
      }
      frame++;
      raf = requestAnimationFrame(draw);
    }

    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute bottom-0 right-0 w-[300px] h-[300px] md:w-[400px] md:h-[400px] opacity-40 pointer-events-none"
      style={{ width: 400, height: 400 }}
    />
  );
}

export default function HeroCarousel() {
  const heroRef = useRef<HTMLElement>(null);

  // Hero entrance: one sequenced timeline — words rise, annotations fade in,
  // connectors draw, icons pop — instead of a pile of ad-hoc delays.
  useEffect(() => {
    const root = heroRef.current;
    if (!root) return;

    const words = root.querySelectorAll<HTMLElement>("[data-hero-word]");
    const notes = root.querySelectorAll<HTMLElement>("[data-hero-note]");
    const connectors = root.querySelectorAll<HTMLElement>("[data-hero-connector]");
    const icons = root.querySelectorAll<HTMLElement>("[data-hero-icon]");

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      [words, notes, connectors, icons].forEach((list) =>
        list.forEach((el) => {
          el.style.opacity = "1";
        }),
      );
      return;
    }

    const tl = createTimeline({
      defaults: { ease: "out(3)", duration: 700 },
    });

    tl.add(words, { opacity: [0, 1], y: [44, 0], delay: stagger(130) })
      .add(
        notes,
        { opacity: [0, 1], y: [8, 0], duration: 600, delay: stagger(100) },
        "-=420",
      )
      .add(
        connectors,
        { opacity: [0, 1], scaleX: [0, 1], duration: 500, delay: stagger(70) },
        "-=460",
      )
      .add(
        icons,
        { opacity: [0, 1], scale: [0.55, 1], duration: 650, delay: stagger(80) },
        "-=520",
      );

    return () => {
      tl.cancel();
    };
  }, []);

  return (
    <>
      {/* Mercury AI style hero with icon circles + connectors */}
      <section
        ref={heroRef}
        className="relative bg-[var(--background)]/80 dark:bg-transparent pt-28 md:pt-32 pb-0 overflow-hidden"
      >
        {/* Row 1: "Leverage" + 3 icons */}
        <div className="border-b border-black/8 dark:border-white/8">
          <div className="max-w-[1400px] mx-auto px-6 md:px-10 py-5 md:py-7 flex items-center gap-3 md:gap-5 overflow-hidden">
            <span
              data-hero-word
              style={{ opacity: 0 }}
              className="text-[clamp(3rem,8vw,7.5rem)] font-display font-bold leading-[0.9] tracking-[-0.03em] text-[var(--text-primary)] shrink-0"
            >
              Leverage
            </span>
            <span
              data-hero-note
              style={{ opacity: 0 }}
              className="hidden lg:block self-end pb-3 font-mono text-[11px] uppercase tracking-[0.25em] text-[var(--text-secondary)] shrink-0"
            >
              ( a force multiplier — we amplify what's there )
            </span>
            <div className="flex items-center gap-2 md:gap-3 ml-auto">
              <Connector />
              <IconCircle Icon={LayoutDashboard} />
              <Connector />
              <IconCircle Icon={Code} />
              <Connector />
              <IconCircle Icon={MapPin} />
            </div>
          </div>
        </div>

        {/* Row 2: 2 icons + "AI" + 1 icon */}
        <div className="border-b border-black/8 dark:border-white/8">
          <div className="max-w-[1400px] mx-auto px-6 md:px-10 py-5 md:py-7 flex items-center gap-3 md:gap-5 overflow-hidden">
            <div className="flex items-center gap-2 md:gap-3">
              <IconCircle Icon={Brain} size="sm" />
              <Connector />
              <IconCircle Icon={AlignLeft} size="sm" />
            </div>
            <span
              data-hero-word
              style={{ opacity: 0 }}
              className="mx-auto flex items-baseline gap-6 text-[clamp(2.2rem,7vw,7.5rem)] font-display font-bold leading-[0.9] tracking-[-0.03em] text-[var(--text-primary)]"
            >
              AI
              <span
                data-hero-note
                style={{ opacity: 0 }}
                className="hidden self-center font-mono text-[11px] font-normal uppercase tracking-[0.25em] text-[var(--text-secondary)] lg:block"
              >
                ( our core tool, stated plainly )
              </span>
            </span>
            <div className="flex items-center gap-2 md:gap-3">
              <Connector />
              <IconCircle Icon={Workflow} />
            </div>
          </div>
        </div>

        {/* Row 3: "Anywhere" + 2 icons + annotation */}
        <div className="border-b border-black/8 dark:border-white/8">
          <div className="max-w-[1400px] mx-auto px-6 md:px-10 py-5 md:py-7 flex items-center gap-3 md:gap-5 overflow-hidden">
            <span
              data-hero-word
              style={{ opacity: 0 }}
              className="text-[clamp(2.5rem,7vw,6.5rem)] font-display font-bold leading-[0.9] tracking-[-0.03em] text-[var(--text-primary)] shrink-0"
            >
              Anywhere
            </span>
            <div className="flex items-center gap-2 md:gap-3">
              <Connector />
              <IconCircle Icon={Globe} size="sm" />
              <Connector />
              <IconCircle Icon={Mail} size="sm" />
            </div>
            <span
              data-hero-note
              style={{ opacity: 0 }}
              className="ml-auto hidden self-end pb-3 font-mono text-[11px] uppercase tracking-[0.25em] text-[var(--text-secondary)] lg:block"
            >
              ( any industry. any function. any process. )
            </span>
          </div>
        </div>

        {/* Sub-nav links row */}
        <div className="max-w-[1400px] mx-auto px-6 md:px-10 py-6 flex items-center gap-8 md:gap-12">
          {[
            { label: "Our Mission", href: "/mission" },
            { label: "Products", href: "/products" },
            { label: "Process", href: "/process" },
            { label: "Contact Us", href: "/contact" },
          ].map((link) =>
            link.href.startsWith("/") ? (
              <Link
                key={link.label}
                to={link.href}
                className="text-xs md:text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors tracking-wide"
              >
                {link.label}
              </Link>
            ) : (
              <a
                key={link.label}
                href={link.href}
                className="text-xs md:text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors tracking-wide"
              >
                {link.label}
              </a>
            )
          )}
          <span className="ml-auto text-xs text-[var(--text-secondary)] hidden md:block font-mono">
            &copy; 2026
          </span>
        </div>
      </section>

      {/* Dark cinematic section — "The Difference" */}
      <section className="relative py-24 md:py-32 bg-[#0a0a0f]/90 overflow-hidden">
        {/* Radiating lines background */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20">
          <div className="w-[600px] h-[600px] relative">
            {Array.from({ length: 24 }, (_, i) => (
              <div
                key={i}
                className="absolute top-1/2 left-1/2 h-[1px] w-[300px] origin-left"
                style={{
                  transform: `rotate(${i * 15}deg)`,
                  background:
                    "linear-gradient(to right, rgba(255,255,255,0.4), transparent)",
                }}
              />
            ))}
          </div>
        </div>

        <div className="relative z-10 max-w-3xl mx-auto text-center px-6">
          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="mb-6 font-mono text-[11px] uppercase tracking-[0.25em] text-white/40"
          >
            The Difference
          </motion.p>
          <TextReveal
            as="h2"
            text="We don't sell AI for AI's sake."
            className="mb-8 font-display font-semibold text-white leading-[1.08]"
            style={{ fontSize: "clamp(2rem, 5vw, 4rem)", letterSpacing: "-0.03em" }}
          />
          <motion.p
            initial={{ y: 20, opacity: 0 }}
            whileInView={{ y: 0, opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2, duration: 0.6 }}
            className="text-white/50 text-base md:text-lg leading-relaxed max-w-xl mx-auto"
          >
            We start with business intelligence — how your company actually
            operates — and only recommend technology when the numbers prove
            it's worth building. Most AI consultants skip the understanding
            phase. It's the only place we start.
          </motion.p>
        </div>

        {/* Animated dot grid */}
        <div className="hidden dark:block">
          <DotGrid />
        </div>
      </section>

      {/* What Powers Our AI — 3 cards */}
      <section
        id="capabilities"
        className="relative py-24 md:py-32 bg-[#0a0a0f]/90 px-6 md:px-10"
      >
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            whileInView={{ y: 0, opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="mb-14"
          >
            <p className="mb-4 font-mono text-[11px] uppercase tracking-[0.25em] text-white/40">
              Platform
            </p>
            <h2
              className="font-display font-semibold leading-tight text-white"
              style={{ fontSize: "clamp(1.8rem, 4vw, 3rem)", letterSpacing: "-0.03em" }}
            >
              <span className="text-white/50">What Powers </span>
              Our AI
            </h2>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {[
              {
                num: "01",
                title: "Agentic Systems",
                desc: "Agents that run real workflows — research, routing, follow-ups, reporting — under your rules, with your context.",
                glyph: "agents" as const,
              },
              {
                num: "02",
                title: "Self-Optimizing Loops",
                desc: "Systems that track their own outcomes and tune themselves, so performance improves week over week.",
                glyph: "loops" as const,
              },
              {
                num: "03",
                title: "Data Environments",
                desc: "Your data, connected at the source and served to every agent in the right context at the right time.",
                glyph: "bars" as const,
              },
            ].map((card, i) => (
              <motion.div
                key={card.num}
                initial={{ y: 30, opacity: 0 }}
                whileInView={{ y: 0, opacity: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1, duration: 0.6, ease: [0.25, 0.4, 0.25, 1] }}
                className="relative bg-[#111118] rounded-2xl p-7 overflow-hidden group hover:-translate-y-1 transition-transform duration-300 border border-white/5 min-h-[280px] flex flex-col justify-end"
              >
                {/* Living dot-matrix background — same language as the hero world */}
                <div className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 opacity-30 transition-opacity duration-300 group-hover:opacity-50">
                  <DotGlyph variant={card.glyph} className="text-white" />
                </div>
                <div className="relative z-10">
                  <p className="text-white/40 text-xs mb-2 font-mono tracking-wider">
                    {card.num}. {card.title}
                  </p>
                  <p className="text-white/70 text-sm leading-relaxed">
                    {card.desc}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA — "Let's Build Together" with input bar */}
      <section className="relative py-24 md:py-32 bg-[#0a0a0f]/90 overflow-hidden">
        <div className="absolute inset-0 flex items-end justify-center pointer-events-none opacity-20">
          <div
            className="w-[800px] h-[300px]"
            style={{
              background:
                "radial-gradient(ellipse at 50% 100%, rgba(255,255,255,0.1) 0%, transparent 60%)",
            }}
          />
        </div>

        <div className="relative z-10 max-w-2xl mx-auto text-center px-6">
          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="mb-6 font-mono text-[11px] uppercase tracking-[0.25em] text-white/40"
          >
            Connect
          </motion.p>
          <TextReveal
            as="h2"
            text="Let's Build Together"
            className="mb-10 font-display font-semibold text-white leading-[1.08]"
            style={{ fontSize: "clamp(2rem, 5vw, 3.5rem)", letterSpacing: "-0.03em" }}
          />

          <motion.div
            initial={{ y: 20, opacity: 0 }}
            whileInView={{ y: 0, opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2, duration: 0.6 }}
          >
            <Link
              to="/contact"
              className="inline-flex items-center gap-4 bg-white/5 border border-white/10 rounded-full px-6 py-4 hover:bg-white/10 transition-all group"
            >
              <span className="text-white/70 text-sm md:text-base">
                Talk to an Expert
              </span>
              <span className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center group-hover:bg-white/20 transition-colors">
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="white"
                  strokeWidth="2"
                >
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </span>
            </Link>
          </motion.div>

          <p className="text-white/30 text-xs mt-6">
            One call. We'll tell you whether AI is even worth it for your
            workflows — and what the numbers say.
          </p>
        </div>
      </section>
    </>
  );
}
