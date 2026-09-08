import { useState, useEffect, useRef, type ReactNode } from "react";
import { useTheme } from "next-themes";
import { animate, createTimeline, cubicBezier, stagger, utils } from "animejs";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import SEO from "@/shared/components/SEO";
import DotGlyph from "@/shared/ui/dot-glyph";
import MotionReveal from "@/shared/motion/MotionReveal";
import { scrollTo } from "@/shared/motion/SmoothScroll";
import {
  CSS_EASE,
  DURATION,
  EASE_OUT_EXPO,
  MS,
  STAGGER,
  TRAVEL,
} from "@/shared/motion/tokens";
import {
  painAreas,
  industries,
  employeeSizes,
  calcResults,
  validateEmail,
} from "@/features/audit/entities/audit";
import { sendAuditEmail, domainHasMX } from "@/features/audit/services/auditService";

const PROGRESS_DOTS = 30;

/** The house expo-out, handed to anime.js. Built from the token control points
 *  rather than retyped, so this page cannot drift the next time the curve is
 *  tuned. */
const expoOut = cubicBezier(...EASE_OUT_EXPO);

/** anime.js counts in milliseconds and the tokens in seconds; converting once
 *  here keeps the arithmetic out of the timelines. */
const RISE_STAGGER_MS = Math.round(STAGGER.card * 1000);

/** Everything on this page that merely changes colour or opacity settles at the
 *  micro duration. It is stated rather than left to Tailwind's default so the
 *  form's timing comes from the same file as the rest of the site — and because
 *  this is the value that decides whether a pill or a field feels attached to
 *  the pointer or a beat behind it. */
const microTransition = {
  transitionDuration: `${DURATION.micro}s`,
  transitionTimingFunction: CSS_EASE.out,
} as const;

const fieldTransition = {
  transitionProperty: "border-color, color",
  ...microTransition,
} as const;

const pillTransition = {
  transitionProperty: "background-color, border-color, color",
  ...microTransition,
} as const;

const opacityTransition = {
  transitionProperty: "opacity",
  ...microTransition,
} as const;

/**
 * A validation or status line that arrives rather than appears.
 *
 * A message snapping into existence under a field reads as a fault in the page.
 * Three pixels over the micro duration reads as the form answering you, and it
 * is deliberately the shortest motion here: an error the reader has to wait for
 * is worse than one that pops. Under reduced motion it is simply present.
 *
 * Falsy children render nothing, so this preserves the `errors.x && ...`
 * semantics of the markup it replaced — what the validator decides and what the
 * reader is told are untouched.
 */
function FieldMessage({
  children,
  className,
}: {
  children?: ReactNode;
  className?: string;
}) {
  const shouldReduce = useReducedMotion();

  return (
    <AnimatePresence initial={false}>
      {children ? (
        <motion.p
          key="message"
          className={className}
          initial={shouldReduce ? false : { opacity: 0, y: -TRAVEL.nudge }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: shouldReduce ? 0 : -TRAVEL.nudge }}
          transition={{
            duration: shouldReduce ? 0 : DURATION.micro,
            ease: EASE_OUT_EXPO,
          }}
        >
          {children}
        </motion.p>
      ) : null}
    </AnimatePresence>
  );
}

/**
 * A button label swapped without the button changing size.
 *
 * Both labels sit in the same grid cell so the button never renders empty
 * mid-swap: a `mode="wait"` crossfade collapses the button's height for a
 * frame, which is more distracting than the pop it was meant to smooth.
 */
function ButtonLabel({
  swapKey,
  children,
}: {
  swapKey: string;
  children: ReactNode;
}) {
  const shouldReduce = useReducedMotion();

  return (
    <span className="grid">
      <AnimatePresence initial={false}>
        <motion.span
          key={swapKey}
          style={{ gridArea: "1 / 1" }}
          initial={shouldReduce ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{
            duration: shouldReduce ? 0 : DURATION.micro,
            ease: EASE_OUT_EXPO,
          }}
        >
          {children}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

const microLabel =
  "mb-2 block font-mono text-[10px] uppercase tracking-[0.25em] text-[var(--text-secondary)]";
const monoError =
  "mt-2 font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--text-primary)]";
const inputCls =
  "w-full rounded-xl border border-[var(--border)] bg-transparent px-4 py-3.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)]";
const selectCls =
  "w-full appearance-none cursor-pointer rounded-xl border border-[var(--border)] bg-transparent px-4 py-3.5 text-sm focus:outline-none focus:border-[var(--accent)]";
const primaryBtn =
  "rounded-full bg-[var(--text-primary)] text-[var(--background)] px-8 py-3.5 font-mono text-xs font-semibold uppercase tracking-wide hover:opacity-90";

const Audit = () => {
  const [form, setForm] = useState({ name: "", email: "", industry: "", size: "" });
  const [ratings, setRatings] = useState<Record<string, number>>({});
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState("");
  const [emailStatus, setEmailStatus] = useState<{ valid: boolean; message: string } | null>(null);
  const [emailChecking, setEmailChecking] = useState(false);
  const emailDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  const calendlyRef = useRef<HTMLDivElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const reduced = useRef(false);
  // `reduced` is a ref filled in an effect, which is too late for anything the
  // first render has to decide. The hook is the render-time answer to the same
  // question; both exist because the anime.js handlers cannot read a hook.
  const shouldReduce = useReducedMotion();

  /**
   * The Calendly embed used to bake the retired palette into its query string
   * — the old blue-black ground, pure white text, and a grey-blue accent that
   * no longer exists on the site — which left a cold slab inside a themed
   * frame, and a black panel dropped onto warm paper in light mode.
   *
   * Calendly reads these parameters once, when the widget mounts, so the
   * element is keyed on the theme to force a remount when it changes.
   */
  const { resolvedTheme } = useTheme();
  const calendlyTheme =
    resolvedTheme === "light"
      ? { key: "light", bg: "F6F2EC", text: "17131b", accent: "D2531A" }
      : { key: "dark", bg: "0a0710", text: "f2eee9", accent: "ff8a3d" };

  useEffect(() => {
    if (!submitted) return;
    const script = document.createElement("script");
    script.src = "https://assets.calendly.com/assets/external/widget.js";
    script.async = true;
    document.body.appendChild(script);
    return () => { script.parentNode?.removeChild(script); };
  }, [submitted]);

  // The results block is rendered in the same commit that flips `submitted`, so
  // the scroll waits a beat for it to lay out — commanding the scroller against
  // the old page height lands short. It goes through scrollTo() rather than
  // scrollIntoView because a raw scroll call fights Lenis mid-animation and the
  // page visibly stutters.
  useEffect(() => {
    if (!submitted) return;
    const t = setTimeout(() => {
      if (resultsRef.current) scrollTo(resultsRef.current);
    }, MS.quick);
    return () => clearTimeout(t);
  }, [submitted]);

  // Entrance: hero label -> headline -> sub -> panels, sequenced on a timeline
  useEffect(() => {
    reduced.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const root = rootRef.current;
    if (!root) return;
    const els = [...root.querySelectorAll<HTMLElement>("[data-rise]")];
    if (!els.length) return;
    const tl = createTimeline({
      defaults: { ease: expoOut, duration: reduced.current ? 0 : MS.reveal },
    });
    els.forEach((el, i) => {
      tl.add(
        el,
        { opacity: [0, 1], y: [TRAVEL.reveal, 0] },
        reduced.current ? 0 : i * RISE_STAGGER_MS,
      );
    });
    return () => tl.revert();
  }, []);

  // Results blocks rise in once the audit is submitted
  useEffect(() => {
    if (!submitted) return;
    const root = rootRef.current;
    if (!root) return;
    const els = root.querySelectorAll<HTMLElement>("[data-results-rise]");
    if (!els.length) return;
    const anim = animate(els, {
      opacity: [0, 1],
      y: [TRAVEL.reveal, 0],
      delay: stagger(RISE_STAGGER_MS),
      duration: reduced.current ? 0 : MS.reveal,
      ease: expoOut,
    });
    return () => anim.revert();
  }, [submitted]);

  // Press feedback on rating pills: a dip on press, a settle on release, both
  // on the micro/quick pair. The release used to overshoot on a spring, which
  // is the wrong grammar here — overshoot belongs to motion that inherited
  // momentum from a flick or a drag, and a tap gives it none; on a five-pill
  // row it read as the interface wobbling rather than answering.
  // utils.remove() keeps rapid taps interruption-safe (no stuck scales).
  const pressPill = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (submitted || reduced.current) return;
    const el = e.currentTarget;
    utils.remove(el);
    animate(el, { scale: 0.88, duration: MS.micro, ease: expoOut });
  };
  const releasePill = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (reduced.current) return;
    const el = e.currentTarget;
    utils.remove(el);
    animate(el, { scale: 1, duration: MS.quick, ease: expoOut });
  };

  // Focus micro-interaction on inputs/selects: transform only, so nothing below
  // the field re-lays-out. It runs on the micro duration because focus has to
  // land with the caret — a field still moving while the first characters are
  // typed is the failure mode this replaced.
  const fieldFocus = (e: React.FocusEvent<HTMLElement>) => {
    if (submitted || reduced.current) return;
    const el = e.currentTarget;
    utils.remove(el);
    animate(el, { scale: 1.012, duration: MS.micro, ease: expoOut });
  };
  const fieldBlur = (e: React.FocusEvent<HTMLElement>) => {
    if (reduced.current) return;
    const el = e.currentTarget;
    utils.remove(el);
    animate(el, { scale: 1, duration: MS.quick, ease: expoOut });
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = "Required";
    if (emailChecking) { e.email = "Please wait, checking email..."; }
    else if (!emailStatus?.valid) { e.email = emailStatus?.message || "Enter a valid email address"; }
    if (!form.industry) e.industry = "Required";
    if (!form.size) e.size = "Required";
    painAreas.forEach((p) => { if (!ratings[p.key]) e[p.key] = "Rate this area"; });
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    setSubmitError("");
    try {
      await sendAuditEmail({ ...form, ratings });
    } catch (err) {
      console.error("Audit email error:", err);
      setSubmitError("Your results are ready, but we could not email them. You can still book the strategy call below.");
    } finally {
      setLoading(false);
      setSubmitted(true);
    }
  };

  const results = submitted ? calcResults(ratings, form.size) : null;

  const ratedCount = painAreas.filter((p) => ratings[p.key]).length;
  const filledDots = Math.round((ratedCount / painAreas.length) * PROGRESS_DOTS);

  return (
    <div ref={rootRef} className="relative" style={{ zIndex: 1 }}>
      <SEO
        title="Free Agentic Systems Audit for Your Business"
        description="Take Ziiro's free Agentic Systems Audit to find where agents, self-optimizing loops, and clearer roles create real, first-pass leverage for your business."
        canonical="/audit"
      />
      <div className="min-h-screen pb-24">
        <div className="mx-auto max-w-7xl px-6 md:px-10">

          {/* ── Page hero ── */}
          <header className="border-b border-[var(--border)] pt-36 pb-16">
            <div data-rise style={{ opacity: 0 }} className="mb-10 flex items-center justify-between gap-4">
              <p className="flex items-center gap-3 font-mono text-[11px] font-bold uppercase tracking-[0.25em] text-[var(--text-secondary)]">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-[var(--text-primary)] opacity-70" />
                ( ZIIRO / SELF-AUDIT )
              </p>
              <p className="hidden font-mono text-[11px] uppercase tracking-[0.25em] text-[var(--text-muted)] md:block">
                [ FREE ASSESSMENT ]
              </p>
            </div>

            <h1
              data-rise
              style={{ opacity: 0, fontSize: "clamp(2.6rem, 6vw, 4.8rem)", letterSpacing: "-0.03em", lineHeight: 1.04 }}
              className="font-display font-semibold text-[var(--text-primary)]"
            >
              Agentic systems{" "}
              <br />
              <span className="text-[var(--text-secondary)]">audit.</span>
            </h1>

            <p data-rise style={{ opacity: 0 }} className="mt-6 max-w-xl leading-relaxed text-[var(--text-secondary)]">
              Find where your business needs agents, self-improving growth loops, website
              optimization, UGC ad management, and clearer roles. Rate five areas and get a
              practical, conservative estimate of hours and value reclaimed, instantly.
            </p>
          </header>

          {/* ── Form / Results ── */}
          <div className="grid grid-cols-1 lg:grid-cols-2">

            {/* LEFT: Form */}
            <div data-rise style={{ opacity: 0 }} className="py-12 lg:border-r lg:border-[var(--border)] lg:pr-12">
              <form onSubmit={handleSubmit} noValidate>
                <p className="mb-8 flex items-center gap-3 font-mono text-[11px] font-bold uppercase tracking-[0.25em] text-[var(--text-secondary)]">
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-[var(--text-primary)] opacity-70" />
                  01 / Tell us about your business
                </p>

                {/* Name */}
                <div className="mb-6">
                  <label className={microLabel}>Business Name</label>
                  <input
                    type="text"
                    placeholder="Acme Corp"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    onFocus={fieldFocus}
                    onBlur={fieldBlur}
                    className={inputCls}
                    style={{
                      ...fieldTransition,
                      borderColor: errors.name ? "var(--text-primary)" : undefined,
                    }}
                    disabled={submitted}
                  />
                  <FieldMessage className={monoError}>{errors.name}</FieldMessage>
                </div>

                {/* Email */}
                <div className="mb-6">
                  <label className={microLabel}>Your Email</label>
                  <div className="relative">
                    <input
                      type="email"
                      placeholder="you@company.com"
                      value={form.email}
                      onChange={(e) => {
                        const val = e.target.value;
                        setForm({ ...form, email: val });
                        if (errors.email) setErrors({ ...errors, email: "" });

                        if (emailDebounceRef.current) clearTimeout(emailDebounceRef.current);

                        if (val.length <= 4) { setEmailStatus(null); return; }

                        const basic = validateEmail(val);
                        if (!basic.valid) { setEmailStatus(basic); return; }

                        // MX record check via Cloudflare DNS-over-HTTPS
                        setEmailChecking(true);
                        setEmailStatus(null);
                        emailDebounceRef.current = setTimeout(async () => {
                          const hasMX = await domainHasMX(val.split("@")[1]);
                          setEmailStatus(
                            hasMX
                              ? { valid: true, message: "Looks good" }
                              : { valid: false, message: "This domain cannot receive emails" }
                          );
                          setEmailChecking(false);
                        }, 600);
                      }}
                      onFocus={fieldFocus}
                      onBlur={fieldBlur}
                      className={`${inputCls} pr-10`}
                      style={{
                        ...fieldTransition,
                        borderColor: errors.email
                          ? "var(--text-primary)"
                          : emailChecking
                          ? "var(--border-strong)"
                          : emailStatus?.valid
                          ? "var(--border-strong)"
                          : emailStatus && !emailStatus.valid && form.email.length > 4
                          ? "var(--text-primary)"
                          : undefined,
                      }}
                      disabled={submitted}
                    />
                    {/* The MX check flips this indicator between three states
                        while the reader is still typing, so the swap is a
                        crossfade rather than a cut. Only opacity is animated —
                        writing a transform here would override the
                        -translate-y-1/2 that centres it. The fade lives on the
                        wrapper because a CSS animation (animate-pulse) outranks
                        an inline opacity and would swallow it. */}
                    <AnimatePresence mode="wait" initial={false}>
                      {emailChecking ? (
                        <motion.span
                          key="checking"
                          className="absolute right-3 top-1/2 -translate-y-1/2"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          transition={{
                            duration: shouldReduce ? 0 : DURATION.micro,
                            ease: EASE_OUT_EXPO,
                          }}
                        >
                          <span className="animate-pulse font-mono text-xs tracking-widest text-[var(--text-muted)]">
                            ...
                          </span>
                        </motion.span>
                      ) : emailStatus && form.email.length > 4 ? (
                        <motion.span
                          key={emailStatus.valid ? "valid" : "invalid"}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-[var(--text-primary)]"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          transition={{
                            duration: shouldReduce ? 0 : DURATION.micro,
                            ease: EASE_OUT_EXPO,
                          }}
                        >
                          {emailStatus.valid ? "✓" : "✗"}
                        </motion.span>
                      ) : null}
                    </AnimatePresence>
                  </div>
                  <FieldMessage className={monoError}>
                    {errors.email ||
                      (emailStatus && !emailStatus.valid && form.email.length > 4
                        ? emailStatus.message
                        : "")}
                  </FieldMessage>
                  <FieldMessage className="mt-2 font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--text-muted)]">
                    {emailStatus?.valid && !errors.email ? (
                      <>&#10003; {emailStatus.message}</>
                    ) : null}
                  </FieldMessage>
                </div>

                {/* Industry + Employees */}
                <div className="mb-10 grid grid-cols-2 gap-4">
                  <div>
                    <label className={microLabel}>Industry</label>
                    <select
                      value={form.industry}
                      onChange={(e) => setForm({ ...form, industry: e.target.value })}
                      onFocus={fieldFocus}
                      onBlur={fieldBlur}
                      className={selectCls}
                      style={{
                        ...fieldTransition,
                        borderColor: errors.industry ? "var(--text-primary)" : undefined,
                        color: form.industry ? "var(--text-primary)" : "var(--text-muted)",
                      }}
                      disabled={submitted}
                    >
                      <option value="" disabled>Select...</option>
                      {industries.map((i) => (
                        <option key={i} value={i} style={{ color: "var(--text-primary)", background: "var(--surface)" }}>{i}</option>
                      ))}
                    </select>
                    <FieldMessage className={monoError}>{errors.industry}</FieldMessage>
                  </div>
                  <div>
                    <label className={microLabel}>Employees</label>
                    <select
                      value={form.size}
                      onChange={(e) => setForm({ ...form, size: e.target.value })}
                      onFocus={fieldFocus}
                      onBlur={fieldBlur}
                      className={selectCls}
                      style={{
                        ...fieldTransition,
                        borderColor: errors.size ? "var(--text-primary)" : undefined,
                        color: form.size ? "var(--text-primary)" : "var(--text-muted)",
                      }}
                      disabled={submitted}
                    >
                      <option value="" disabled>Select...</option>
                      {employeeSizes.map((s) => (
                        <option key={s} value={s} style={{ color: "var(--text-primary)", background: "var(--surface)" }}>{s}</option>
                      ))}
                    </select>
                    <FieldMessage className={monoError}>{errors.size}</FieldMessage>
                  </div>
                </div>

                {/* Pain Ratings. This section starts a screen and a half below
                    the fold, so it gets its own reveal instead of riding the
                    page's mount timeline — that entrance would otherwise play
                    to nobody and the block would simply be sitting there when
                    the reader finally arrives. once:true comes from VIEWPORT,
                    so it never re-hides on the way back up. */}
                <MotionReveal className="mb-10">
                  <div className="flex items-center justify-between gap-4">
                    <p className="flex items-center gap-3 font-mono text-[11px] font-bold uppercase tracking-[0.25em] text-[var(--text-secondary)]">
                      <span className="inline-block h-1.5 w-1.5 rounded-full bg-[var(--text-primary)] opacity-70" />
                      02 / Rate your pain
                    </p>
                    <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-[var(--text-muted)]">
                      AREA {String(ratedCount).padStart(2, "0")} / {String(painAreas.length).padStart(2, "0")}
                    </p>
                  </div>

                  {/* Dot-matrix progress strip */}
                  <div className="mt-4 flex gap-1.5" aria-hidden>
                    {Array.from({ length: PROGRESS_DOTS }).map((_, i) => (
                      <span
                        key={i}
                        className="h-1 w-1 rounded-full bg-[var(--text-primary)]"
                        style={{ ...opacityTransition, opacity: i < filledDots ? 0.85 : 0.15 }}
                      />
                    ))}
                  </div>

                  <p className="mt-4 mb-2 max-w-md text-xs leading-relaxed text-[var(--text-muted)]">
                    Tap 1&ndash;5 for each area. The estimate uses conservative first-pass time
                    savings, not a best-case automation fantasy.
                  </p>

                  <div>
                    {painAreas.map((area, idx) => (
                      <div key={area.key} className="border-b border-[var(--border)] py-5">
                        <div className="flex flex-wrap items-center justify-between gap-4">
                          <div className="flex items-baseline gap-4">
                            <span className="font-mono text-xs text-[var(--text-muted)]">
                              {String(idx + 1).padStart(2, "0")}
                            </span>
                            <div>
                              <p className="font-sans text-sm font-semibold tracking-tight text-[var(--text-primary)]">
                                {area.label}
                              </p>
                              <p className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--text-muted)]">
                                {area.sub}
                              </p>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            {[1, 2, 3, 4, 5].map((n) => {
                              const selected = ratings[area.key] >= n;
                              return (
                                <button
                                  key={n}
                                  type="button"
                                  onClick={() => !submitted && setRatings({ ...ratings, [area.key]: n })}
                                  onPointerDown={pressPill}
                                  onPointerUp={releasePill}
                                  onPointerLeave={releasePill}
                                  aria-pressed={selected}
                                  className={`h-9 w-9 rounded-full font-mono text-xs ${
                                    selected
                                      ? "bg-[var(--text-primary)] font-semibold text-[var(--background)]"
                                      : "border border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]"
                                  }`}
                                  style={{ ...pillTransition, cursor: submitted ? "default" : "pointer" }}
                                >
                                  {n}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                        <FieldMessage className={monoError}>{errors[area.key]}</FieldMessage>
                      </div>
                    ))}
                  </div>
                </MotionReveal>

                {!submitted ? (
                  <button
                    type="submit"
                    disabled={loading}
                    style={opacityTransition}
                    className={`${primaryBtn} w-full disabled:opacity-60`}
                  >
                    <ButtonLabel swapKey={loading ? "calculating" : "idle"}>
                      {loading ? "Calculating..." : "Get your audit →"}
                    </ButtonLabel>
                  </button>
                ) : (
                  // The completed state arrives rather than replacing the button
                  // outright. There is no exit animation on the button it
                  // supersedes: crossfading them would leave the form's footer
                  // empty for a frame and drop everything below it.
                  <motion.div
                    className="space-y-3"
                    initial={shouldReduce ? false : { opacity: 0, y: TRAVEL.nudge }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{
                      duration: shouldReduce ? 0 : DURATION.swap,
                      ease: EASE_OUT_EXPO,
                    }}
                  >
                    <div className="w-full rounded-full border border-[var(--border)] py-3.5 text-center font-mono text-xs uppercase tracking-[0.25em] text-[var(--text-secondary)]">
                      &#10003; Audit complete
                    </div>
                    <button
                      type="button"
                      onClick={() => calendlyRef.current && scrollTo(calendlyRef.current)}
                      style={opacityTransition}
                      className={`${primaryBtn} w-full`}
                    >
                      Book your free meeting →
                    </button>
                  </motion.div>
                )}
              </form>
            </div>

            {/* RIGHT: Results */}
            <div ref={resultsRef} data-rise style={{ opacity: 0 }} className="border-t border-[var(--border)] py-12 lg:border-t-0 lg:pl-12">
              {!submitted ? (
                <div className="flex h-full min-h-[320px] flex-col items-center justify-center gap-6">
                  <DotGlyph variant="bars" className="text-[var(--text-primary)] opacity-60" />
                  <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-[var(--text-secondary)]">
                    ( Your results will appear here )
                  </p>
                </div>
              ) : (
                <div>
                  <div data-results-rise style={{ opacity: 0 }} className="mb-10 flex items-center justify-between gap-4">
                    <p className="flex items-center gap-3 font-mono text-[11px] font-bold uppercase tracking-[0.25em] text-[var(--text-secondary)]">
                      <span className="inline-block h-1.5 w-1.5 rounded-full bg-[var(--text-primary)] opacity-70" />
                      Your results
                    </p>
                    <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-[var(--text-muted)]">
                      [ {form.name} ]
                    </p>
                  </div>

                  {/* Big metrics */}
                  <div data-results-rise style={{ opacity: 0 }} className="mb-2">
                    <p
                      className="font-display font-semibold text-[var(--text-primary)]"
                      style={{ fontSize: "clamp(3rem, 6vw, 4.8rem)", letterSpacing: "-0.03em", lineHeight: 1 }}
                    >
                      {results!.totalHrs}
                      <span className="text-[var(--text-secondary)]" style={{ fontSize: "0.38em" }}> hrs / wk</span>
                    </p>
                    <p className="mt-2 mb-8 font-mono text-[10px] uppercase tracking-[0.25em] text-[var(--text-muted)]">
                      Estimated weekly time reclaimed
                    </p>

                    <p
                      className="font-display font-semibold text-[var(--text-primary)]"
                      style={{ fontSize: "clamp(2rem, 4vw, 3.2rem)", letterSpacing: "-0.03em", lineHeight: 1 }}
                    >
                      ${results!.totalAnnual.toLocaleString()}
                      <span className="text-[var(--text-secondary)]" style={{ fontSize: "0.45em" }}> / yr</span>
                    </p>
                    <p className="mt-2 mb-6 font-mono text-[10px] uppercase tracking-[0.25em] text-[var(--text-muted)]">
                      Estimated annual value
                    </p>

                    <p className="mb-10 max-w-md text-xs italic leading-relaxed text-[var(--text-muted)]">
                      A realistic first build would usually target {Math.max(1, Math.round(results!.totalHrs * 0.6))}&ndash;{Math.max(1, Math.round(results!.totalHrs * 1.05))} hours/week first, then expand after proof.
                    </p>
                  </div>

                  {submitError && (
                    <div data-results-rise style={{ opacity: 0 }} className="mb-10 rounded-xl border border-[var(--border-strong)] px-4 py-3 font-mono text-[11px] leading-relaxed tracking-wide text-[var(--text-secondary)]">
                      {submitError}
                    </div>
                  )}

                  {/* Priority systems */}
                  <div data-results-rise style={{ opacity: 0 }} className="mb-10 border-t border-[var(--border)] pt-8">
                    <p className="mb-5 font-mono text-[11px] font-bold uppercase tracking-[0.25em] text-[var(--text-secondary)]">
                      Priority systems
                    </p>
                    <div>
                      {results!.sorted.map((area, i) => (
                        <div key={area.key} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-[var(--border)] py-3.5">
                          <div className="flex items-baseline gap-4">
                            <span className="font-mono text-xs text-[var(--text-muted)]">
                              {String(i + 1).padStart(2, "0")}
                            </span>
                            <div>
                              <span className="font-sans text-sm font-semibold tracking-tight text-[var(--text-primary)]">
                                {area.label}
                              </span>
                              <span className="ml-2 font-mono text-[10px] uppercase tracking-[0.15em] text-[var(--text-muted)]">
                                {area.sub}
                              </span>
                            </div>
                          </div>
                          <span className="font-mono text-[10px] uppercase tracking-[0.15em] text-[var(--text-secondary)]">
                            {area.hrs} hrs/wk &middot; ${area.annual.toLocaleString()}/yr
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Recommendations */}
                  <div data-results-rise style={{ opacity: 0 }} className="border-t border-[var(--border)] pt-8">
                    <p className="mb-6 font-mono text-[11px] font-bold uppercase tracking-[0.25em] text-[var(--text-secondary)]">
                      Recommendations
                    </p>
                    <div className="space-y-7">
                      {results!.sorted.map((area) => (
                        <div key={area.key}>
                          <div className="mb-2 flex flex-wrap items-center gap-3">
                            <p className="font-sans text-sm font-semibold tracking-tight text-[var(--text-primary)]">
                              {area.label}
                            </p>
                            <span className="neo-inset rounded-full px-3 py-1 font-mono text-[10px] tracking-wide text-[var(--text-secondary)]">
                              {area.sub}
                            </span>
                          </div>
                          <p className="max-w-md text-xs leading-relaxed text-[var(--text-secondary)]">
                            {area.recommendation}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* CALENDLY */}
          {submitted && (
            <div ref={calendlyRef} data-results-rise style={{ opacity: 0 }} className="mt-8 border-t border-[var(--border)] pt-16">
              <div className="mb-10 text-center">
                <p className="mb-6 flex items-center justify-center gap-3 font-mono text-[11px] font-bold uppercase tracking-[0.25em] text-[var(--text-secondary)]">
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-[var(--text-primary)] opacity-70" />
                  ( Next step )
                </p>
                <h2
                  className="font-display font-semibold text-[var(--text-primary)]"
                  style={{ fontSize: "clamp(1.9rem, 3.5vw, 3rem)", letterSpacing: "-0.03em", lineHeight: 1.04 }}
                >
                  Book your free
                  <br />
                  <span className="text-[var(--text-secondary)]">strategy call.</span>
                </h2>
                <p className="mx-auto mt-5 max-w-md text-sm leading-relaxed text-[var(--text-secondary)]">
                  30 minutes. We&apos;ll walk you through the first agentic system worth building and what it would look like for your business.
                </p>
              </div>
              <div
                key={calendlyTheme.key}
                className="calendly-inline-widget overflow-hidden rounded-2xl border border-[var(--border)]"
                data-url={`https://calendly.com/ziiro-work/30min?hide_gdpr_banner=1&background_color=${calendlyTheme.bg}&text_color=${calendlyTheme.text}&primary_color=${calendlyTheme.accent}`}
                style={{ minWidth: "320px", height: "700px" }}
              />
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default Audit;
