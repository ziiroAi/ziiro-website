import { useState, useEffect, useRef } from "react";
import { animate, createSpring, createTimeline, stagger, utils } from "animejs";
import { supabase } from "@/integrations/supabase/client";
import SEO from "@/components/SEO";
import DotGlyph from "@/components/ui/dot-glyph";

const DISPOSABLE_DOMAINS = new Set([
  "mailinator.com","guerrillamail.com","tempmail.com","throwaway.email","yopmail.com",
  "sharklasers.com","guerrillamailblock.com","grr.la","guerrillamail.info","spam4.me",
  "trashmail.com","trashmail.me","trashmail.net","dispostable.com","maildrop.cc",
  "10minutemail.com","10minutemail.net","10minutemail.org","minutemail.com","temp-mail.org",
  "fakeinbox.com","mailnull.com","spamgourmet.com","spamgourmet.net","discard.email",
  "mailnesia.com","mailnull.com","spamspot.com","spamthisplease.com","byom.de",
  "getnada.com","anonaddy.com","tempinbox.com","tempr.email","emailondeck.com",
  "getairmail.com","filzmail.com","zetmail.com","mohmal.com","owlpic.com",
  "cfl.fr","spamfree24.org","spamfree24.de","spamfree24.eu","spamfree24.info",
  "spaml.de","spaml.com","disigntime.com","no-spam.ws","antispam24.de",
  "wegwerfmail.de","wegwerfmail.net","wegwerfmail.org","abcmail.email","armyspy.com",
]);

const validateEmail = (email: string): { valid: boolean; message: string } => {
  const trimmed = email.trim();
  if (!trimmed) return { valid: false, message: "" };

  const regex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  if (!regex.test(trimmed)) return { valid: false, message: "Enter a valid email address" };

  const domain = trimmed.split("@")[1]?.toLowerCase();
  if (!domain) return { valid: false, message: "Enter a valid email address" };
  if (DISPOSABLE_DOMAINS.has(domain)) return { valid: false, message: "Disposable emails are not allowed" };

  const parts = domain.split(".");
  if (parts.some((p) => p.length === 0)) return { valid: false, message: "Enter a valid email address" };
  if (parts[parts.length - 1].length < 2) return { valid: false, message: "Enter a valid email address" };

  return { valid: true, message: "Looks good" };
};

const painAreas = [
  {
    key: "outreach",
    label: "Self-Optimizing Systems",
    sub: "Marketing, outreach, website, ops",
    recommendation: "A self-optimizing loop can test marketing angles, outreach, website changes, and workflow improvements, then learn from outcomes without guessing forever.",
    hrsPerRating: [0, 0.2, 0.6, 1.2, 2.2, 3.5],
  },
  {
    key: "leadgen",
    label: "Research & Qualification",
    sub: "Prospecting, scoring, context",
    recommendation: "Research agents can identify, enrich, and qualify high-fit leads so founders spend time on conversations instead of list-building.",
    hrsPerRating: [0, 0.2, 0.5, 1.1, 2, 3],
  },
  {
    key: "pipeline",
    label: "UGC Ads & Management",
    sub: "Creators, ads, campaigns",
    recommendation: "A focused UGC system can source creators, organize ad production, and manage campaign iterations without letting content work become the whole business.",
    hrsPerRating: [0, 0.1, 0.4, 0.9, 1.5, 2.2],
  },
  {
    key: "content",
    label: "Role Clarity",
    sub: "Owners, strengths, bottlenecks",
    recommendation: "A role analyzer can reveal who should own which work, where people are miscast, and which responsibilities should move to agents.",
    hrsPerRating: [0, 0.2, 0.5, 1, 1.8, 2.5],
  },
  {
    key: "reporting",
    label: "Control Dashboards",
    sub: "Metrics, insights, reviews",
    recommendation: "A simple command dashboard can show what your agents did, what worked, what failed, and where a human needs to approve next.",
    hrsPerRating: [0, 0.1, 0.4, 0.8, 1.4, 2],
  },
];

const industries = [
  "SaaS / Software",
  "Startup",
  "Solo Founder",
  "Founder-led Agency",
  "Consulting / Professional Services",
  "Creator-led Business",
  "Community / Education",
  "AI-first Service Business",
  "Other",
];

const employeeSizes = ["1-5", "6-20", "21-50", "51-200", "200+"];

const HOURLY_VALUE = 30; // conservative $/hr for first-pass time reclaimed

const calcResults = (ratings: Record<string, number>, size: string) => {
  const sized = size === "1-5" ? 0.6 : size === "6-20" ? 0.8 : size === "51-200" ? 1.1 : size === "200+" ? 1.2 : 1;

  const areas = painAreas.map((area) => {
    const rating = ratings[area.key] || 0;
    const hrs = +(area.hrsPerRating[rating] * sized).toFixed(1);
    const annual = Math.round(hrs * 52 * HOURLY_VALUE);
    return { ...area, rating, hrs, annual };
  });

  const sorted = [...areas].sort((a, b) => b.hrs - a.hrs);
  const totalHrs = +areas.reduce((s, a) => s + a.hrs, 0).toFixed(1);
  const totalAnnual = areas.reduce((s, a) => s + a.annual, 0);
  const maxHrs = areas.reduce((s, a) => s + (a.hrsPerRating[5] * sized), 0);
  const score = maxHrs > 0 ? Math.round((totalHrs / maxHrs) * 100) : 0;

  return { sorted, totalHrs, totalAnnual, score };
};

const PROGRESS_DOTS = 30;

// Tactile springs: pill release bounce + form-field focus (transform only)
const pillSpring = createSpring({ stiffness: 420, damping: 16 });
const focusSpring = createSpring({ stiffness: 340, damping: 22 });

const microLabel =
  "mb-2 block font-mono text-[10px] uppercase tracking-[0.25em] text-[var(--text-secondary)]";
const monoError =
  "mt-2 font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--text-primary)]";
const inputCls =
  "w-full rounded-xl border border-[var(--border)] bg-transparent px-4 py-3.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--text-primary)]/40 transition-colors";
const selectCls =
  "w-full appearance-none cursor-pointer rounded-xl border border-[var(--border)] bg-transparent px-4 py-3.5 text-sm focus:outline-none focus:border-[var(--text-primary)]/40 transition-colors";
const primaryBtn =
  "rounded-full bg-[var(--text-primary)] text-[var(--background)] px-8 py-3.5 font-mono text-xs font-semibold uppercase tracking-wide transition-opacity hover:opacity-90";

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

  useEffect(() => {
    if (!submitted) return;
    const script = document.createElement("script");
    script.src = "https://assets.calendly.com/assets/external/widget.js";
    script.async = true;
    document.body.appendChild(script);
    return () => { script.parentNode?.removeChild(script); };
  }, [submitted]);

  useEffect(() => {
    if (submitted && resultsRef.current) {
      setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 200);
    }
  }, [submitted]);

  // Entrance: hero label -> headline -> sub -> panels, sequenced on a timeline
  useEffect(() => {
    reduced.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const root = rootRef.current;
    if (!root) return;
    const els = [...root.querySelectorAll<HTMLElement>("[data-rise]")];
    if (!els.length) return;
    const tl = createTimeline({
      defaults: { ease: "out(3)", duration: reduced.current ? 0 : 750 },
    });
    els.forEach((el, i) => {
      tl.add(el, { opacity: [0, 1], y: [24, 0] }, reduced.current ? 0 : i * 90);
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
      y: [24, 0],
      delay: stagger(80),
      duration: reduced.current ? 0 : 700,
      ease: "out(3)",
    });
    return () => anim.revert();
  }, [submitted]);

  // Spring press feedback on rating pills: quick dip on press, springy
  // bounce back on release. utils.remove() keeps rapid taps interruption-safe.
  const pressPill = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (submitted || reduced.current) return;
    const el = e.currentTarget;
    utils.remove(el);
    animate(el, { scale: 0.88, duration: 150, ease: "out(2)" });
  };
  const releasePill = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (reduced.current) return;
    const el = e.currentTarget;
    utils.remove(el);
    animate(el, { scale: 1, ease: pillSpring });
  };

  // Spring focus micro-interaction on inputs/selects — transform only, no layout shift
  const fieldFocus = (e: React.FocusEvent<HTMLElement>) => {
    if (submitted || reduced.current) return;
    const el = e.currentTarget;
    utils.remove(el);
    animate(el, { scale: 1.012, ease: focusSpring });
  };
  const fieldBlur = (e: React.FocusEvent<HTMLElement>) => {
    if (reduced.current) return;
    const el = e.currentTarget;
    utils.remove(el);
    animate(el, { scale: 1, duration: 320, ease: "out(4)" });
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = "Required";
    if (emailChecking) { e.email = "Please wait — checking email..."; }
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
      const { data, error } = await supabase.functions.invoke("send-audit-email", {
        body: {
          name: form.name,
          email: form.email,
          industry: form.industry,
          size: form.size,
          ratings,
        },
      });
      if (error || data?.success === false) throw error ?? new Error("Audit email failed");
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
        title="Free Agentic Systems Audit - Find Your Agentic Leverage"
        description="Take Ziiro's free Agentic Systems Audit and discover where agents, self-optimizing growth loops, UGC ads management, and role diagnostics can create realistic first-pass leverage."
        canonical="/audit"
      />
      <div className="min-h-screen pb-24">
        <div className="mx-auto max-w-7xl px-6 md:px-10">

          {/* ── Page hero ── */}
          <header className="border-b border-[var(--border)] pt-36 pb-16">
            <div data-rise style={{ opacity: 0 }} className="mb-10 flex items-center justify-between gap-4">
              <p className="flex items-center gap-3 font-mono text-[11px] font-bold uppercase tracking-[0.25em] text-[var(--text-secondary)]">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-[var(--text-primary)] opacity-70" />
                ( ZIIRO — SELF-AUDIT )
              </p>
              <p className="hidden font-mono text-[11px] uppercase tracking-[0.25em] text-[var(--text-secondary)]/70 md:block">
                [ FREE ASSESSMENT ]
              </p>
            </div>

            <h1
              data-rise
              style={{ opacity: 0, fontSize: "clamp(2.6rem, 6vw, 4.8rem)", letterSpacing: "-0.03em", lineHeight: 1.04 }}
              className="font-display font-semibold text-[var(--text-primary)]"
            >
              Agentic systems
              <br />
              <span className="text-[var(--text-secondary)]">audit.</span>
            </h1>

            <p data-rise style={{ opacity: 0 }} className="mt-6 max-w-xl leading-relaxed text-[var(--text-secondary)]">
              Find where your business needs agents, self-improving growth loops, website
              optimization, UGC ad management, and clearer roles. Rate five areas and get a
              practical, conservative estimate of hours and value reclaimed — instantly.
            </p>
          </header>

          {/* ── Form / Results ── */}
          <div className="grid grid-cols-1 lg:grid-cols-2">

            {/* LEFT — Form */}
            <div data-rise style={{ opacity: 0 }} className="py-12 lg:border-r lg:border-[var(--border)] lg:pr-12">
              <form onSubmit={handleSubmit} noValidate>
                <p className="mb-8 flex items-center gap-3 font-mono text-[11px] font-bold uppercase tracking-[0.25em] text-[var(--text-secondary)]">
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-[var(--text-primary)] opacity-70" />
                  01 — Tell us about your business
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
                    style={{ borderColor: errors.name ? "var(--text-primary)" : undefined }}
                    disabled={submitted}
                  />
                  {errors.name && <p className={monoError}>{errors.name}</p>}
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
                          try {
                            const domain = val.split("@")[1];
                            const res = await fetch(
                              `https://cloudflare-dns.com/dns-query?name=${domain}&type=MX`,
                              { headers: { Accept: "application/dns-json" } }
                            );
                            const data = await res.json();
                            const hasMX = data.Answer && data.Answer.length > 0;
                            setEmailStatus(
                              hasMX
                                ? { valid: true, message: "Looks good" }
                                : { valid: false, message: "This domain cannot receive emails" }
                            );
                          } catch {
                            // If DNS check fails, fall back to format check
                            setEmailStatus({ valid: true, message: "Looks good" });
                          } finally {
                            setEmailChecking(false);
                          }
                        }, 600);
                      }}
                      onFocus={fieldFocus}
                      onBlur={fieldBlur}
                      className={`${inputCls} pr-10`}
                      style={{
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
                    {emailChecking && (
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 animate-pulse font-mono text-xs tracking-widest text-[var(--text-muted)]">
                        ...
                      </span>
                    )}
                    {!emailChecking && emailStatus && form.email.length > 4 && (
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-[var(--text-primary)]">
                        {emailStatus.valid ? "✓" : "✗"}
                      </span>
                    )}
                  </div>
                  {(errors.email || (emailStatus && !emailStatus.valid && form.email.length > 4)) && (
                    <p className={monoError}>{errors.email || emailStatus?.message}</p>
                  )}
                  {emailStatus?.valid && !errors.email && (
                    <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--text-muted)]">
                      &#10003; {emailStatus.message}
                    </p>
                  )}
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
                    {errors.industry && <p className={monoError}>{errors.industry}</p>}
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
                    {errors.size && <p className={monoError}>{errors.size}</p>}
                  </div>
                </div>

                {/* Pain Ratings */}
                <div className="mb-10">
                  <div className="flex items-center justify-between gap-4">
                    <p className="flex items-center gap-3 font-mono text-[11px] font-bold uppercase tracking-[0.25em] text-[var(--text-secondary)]">
                      <span className="inline-block h-1.5 w-1.5 rounded-full bg-[var(--text-primary)] opacity-70" />
                      02 — Rate your pain
                    </p>
                    <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-[var(--text-secondary)]/70">
                      AREA {String(ratedCount).padStart(2, "0")} / {String(painAreas.length).padStart(2, "0")}
                    </p>
                  </div>

                  {/* Dot-matrix progress strip */}
                  <div className="mt-4 flex gap-1.5" aria-hidden>
                    {Array.from({ length: PROGRESS_DOTS }).map((_, i) => (
                      <span
                        key={i}
                        className="h-1 w-1 rounded-full bg-[var(--text-primary)] transition-opacity duration-300"
                        style={{ opacity: i < filledDots ? 0.85 : 0.15 }}
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
                                  className={`h-9 w-9 rounded-full font-mono text-xs transition-colors ${
                                    selected
                                      ? "bg-[var(--text-primary)] font-semibold text-[var(--background)]"
                                      : "border border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--text-primary)]/40 hover:text-[var(--text-primary)]"
                                  }`}
                                  style={{ cursor: submitted ? "default" : "pointer" }}
                                >
                                  {n}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                        {errors[area.key] && <p className={monoError}>{errors[area.key]}</p>}
                      </div>
                    ))}
                  </div>
                </div>

                {!submitted ? (
                  <button
                    type="submit"
                    disabled={loading}
                    className={`${primaryBtn} w-full disabled:opacity-60`}
                  >
                    {loading ? "Calculating..." : "Get your audit →"}
                  </button>
                ) : (
                  <div className="space-y-3">
                    <div className="w-full rounded-full border border-[var(--border)] py-3.5 text-center font-mono text-xs uppercase tracking-[0.25em] text-[var(--text-secondary)]">
                      &#10003; Audit complete
                    </div>
                    <button
                      type="button"
                      onClick={() => calendlyRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}
                      className={`${primaryBtn} w-full`}
                    >
                      Book your free meeting →
                    </button>
                  </div>
                )}
              </form>
            </div>

            {/* RIGHT — Results */}
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
                    <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-[var(--text-secondary)]/70">
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
                className="calendly-inline-widget overflow-hidden rounded-2xl border border-[var(--border)]"
                data-url="https://calendly.com/ziiro-work/30min?hide_gdpr_banner=1&background_color=060610&text_color=ffffff&primary_color=A8B4C8"
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
