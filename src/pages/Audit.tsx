import { useState, useEffect, useRef } from "react";
import AnimatedSection from "@/components/AnimatedSection";
import { supabase } from "@/integrations/supabase/client";
import SEO from "@/components/SEO";

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

  const inputCls =
    "w-full bg-white/[0.04] border text-white text-sm px-4 py-3 rounded-lg outline-none transition-colors placeholder:text-white/20 focus:border-white/30";

  return (
    <div className="relative" style={{ zIndex: 1 }}>
      <SEO
        title="Free Agentic Systems Audit - Find Your Agentic Leverage"
        description="Take Ziiro's free Agentic Systems Audit and discover where agents, self-optimizing growth loops, UGC ads management, and role diagnostics can create realistic first-pass leverage."
        canonical="/audit"
      />
      <div className="min-h-screen pt-28 pb-24 px-6">
        <div className="container mx-auto max-w-7xl">

          {/* Header */}
          <AnimatedSection>
            <div className="mb-10">
              <span className="inline-block bg-gradient-to-r from-[#A8B4C8] to-white/60 text-[#060610] text-xs font-bold px-3 py-1 tracking-widest uppercase mb-5">
                Free Assessment
              </span>
              <h1 className="display-font text-white leading-none mb-4" style={{ fontSize: "clamp(2.8rem, 6vw, 5.5rem)" }}>
                AGENTIC SYSTEMS<br /><span className="gradient-text">AUDIT</span>
              </h1>
              <p className="text-white/45 text-sm max-w-md leading-relaxed">
                Find where your business needs agents, self-improving growth loops, website optimization, UGC ad management, and clearer roles. Get a practical leverage roadmap instantly.
              </p>
            </div>
          </AnimatedSection>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-px items-stretch" style={{ background: "rgba(255,255,255,0.06)" }}>

            {/* LEFT — Form */}
            <div className="bg-[#060610] p-8 lg:p-10 flex flex-col">
              <form onSubmit={handleSubmit} noValidate>
                <p className="section-label mb-8">Tell us about your business</p>

                {/* Name */}
                <div className="mb-6">
                  <label className="block text-white/40 text-xs tracking-widest uppercase mb-2">Business Name</label>
                  <input
                    type="text"
                    placeholder="Acme Corp"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className={inputCls}
                    style={{ borderColor: errors.name ? "#ff4444" : "rgba(255,255,255,0.1)" }}
                    disabled={submitted}
                  />
                  {errors.name && <p className="text-red-400 text-xs mt-1">{errors.name}</p>}
                </div>

                {/* Email */}
                <div className="mb-6">
                  <label className="block text-white/40 text-xs tracking-widest uppercase mb-2">Your Email</label>
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
                      className={inputCls}
                      style={{
                        borderColor: errors.email
                          ? "#ff4444"
                          : emailChecking
                          ? "rgba(255,255,255,0.2)"
                          : emailStatus?.valid
                          ? "#22c55e"
                          : emailStatus && !emailStatus.valid && form.email.length > 4
                          ? "#ff4444"
                          : "rgba(255,255,255,0.1)",
                        fontFamily: "Inter, sans-serif",
                        paddingRight: "2.5rem",
                      }}
                      disabled={submitted}
                    />
                    {emailChecking && (
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 text-xs tracking-widest animate-pulse">
                        ...
                      </span>
                    )}
                    {!emailChecking && emailStatus && form.email.length > 4 && (
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm" style={{ color: emailStatus.valid ? "#22c55e" : "#ff4444" }}>
                        {emailStatus.valid ? "✓" : "✗"}
                      </span>
                    )}
                  </div>
                  {(errors.email || (emailStatus && !emailStatus.valid && form.email.length > 4)) && (
                    <p className="text-red-400 text-xs mt-1">{errors.email || emailStatus?.message}</p>
                  )}
                  {emailStatus?.valid && !errors.email && (
                    <p className="text-xs mt-1" style={{ color: "#22c55e" }}>✓ {emailStatus.message}</p>
                  )}
                </div>

                {/* Industry + Employees */}
                <div className="grid grid-cols-2 gap-4 mb-8">
                  <div>
                    <label className="block text-white/40 text-xs tracking-widest uppercase mb-2">Industry</label>
                    <select
                      value={form.industry}
                      onChange={(e) => setForm({ ...form, industry: e.target.value })}
                      className="w-full bg-[#0d0d1a] border text-sm px-4 py-3 rounded-lg outline-none appearance-none cursor-pointer"
                      style={{ borderColor: errors.industry ? "#ff4444" : "rgba(255,255,255,0.1)", color: form.industry ? "white" : "rgba(255,255,255,0.3)" }}
                      disabled={submitted}
                    >
                      <option value="" disabled>Select...</option>
                      {industries.map((i) => <option key={i} value={i} style={{ color: "white", background: "#0d0d1a" }}>{i}</option>)}
                    </select>
                    {errors.industry && <p className="text-red-400 text-xs mt-1">{errors.industry}</p>}
                  </div>
                  <div>
                    <label className="block text-white/40 text-xs tracking-widest uppercase mb-2">Employees</label>
                    <select
                      value={form.size}
                      onChange={(e) => setForm({ ...form, size: e.target.value })}
                      className="w-full bg-[#0d0d1a] border text-sm px-4 py-3 rounded-lg outline-none appearance-none cursor-pointer"
                      style={{ borderColor: errors.size ? "#ff4444" : "rgba(255,255,255,0.1)", color: form.size ? "white" : "rgba(255,255,255,0.3)" }}
                      disabled={submitted}
                    >
                      <option value="" disabled>Select...</option>
                      {employeeSizes.map((s) => <option key={s} value={s} style={{ color: "white", background: "#0d0d1a" }}>{s}</option>)}
                    </select>
                    {errors.size && <p className="text-red-400 text-xs mt-1">{errors.size}</p>}
                  </div>
                </div>

                {/* Pain Ratings */}
                <div className="mb-8">
                  <p className="section-label mb-1">Rate Your Pain</p>
                  <p className="text-white/30 text-xs mb-6">Tap 1–5 for each area. The estimate uses conservative first-pass time savings, not a best-case automation fantasy.</p>
                  <div className="space-y-5">
                    {painAreas.map((area) => (
                      <div key={area.key}>
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="text-white text-sm font-semibold">{area.label}</span>
                            <span className="text-white/30 text-xs ml-2">{area.sub}</span>
                          </div>
                          <div className="flex gap-1.5">
                            {[1, 2, 3, 4, 5].map((n) => (
                              <button
                                key={n}
                                type="button"
                                onClick={() => !submitted && setRatings({ ...ratings, [area.key]: n })}
                                className="w-8 h-8 text-xs font-bold rounded transition-all"
                                style={{
                                  background: ratings[area.key] >= n ? "rgba(168,180,200,0.9)" : "rgba(255,255,255,0.04)",
                                  color: ratings[area.key] >= n ? "#060610" : "rgba(255,255,255,0.4)",
                                  border: `1px solid ${ratings[area.key] >= n ? "transparent" : "rgba(255,255,255,0.1)"}`,
                                  cursor: submitted ? "default" : "pointer",
                                }}
                              >
                                {n}
                              </button>
                            ))}
                          </div>
                        </div>
                        {errors[area.key] && <p className="text-red-400 text-xs mt-1">{errors[area.key]}</p>}
                      </div>
                    ))}
                  </div>
                </div>

                {!submitted ? (
                  <button
                    type="submit"
                    disabled={loading}
                    className="btn-primary-gradient w-full font-bold text-sm py-4 tracking-widest disabled:opacity-60"
                  >
                    {loading ? "CALCULATING..." : "GET YOUR AUDIT →"}
                  </button>
                ) : (
                  <div className="space-y-3">
                    <div className="w-full py-4 text-center text-xs tracking-widest border border-white/10 rounded-lg" style={{ color: "#A8B4C8" }}>
                      &#10003; AUDIT COMPLETE
                    </div>
                    <button
                      type="button"
                      onClick={() => calendlyRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}
                      className="btn-primary-gradient w-full font-bold text-sm py-4 tracking-widest"
                    >
                      BOOK YOUR FREE MEETING →
                    </button>
                  </div>
                )}
              </form>
            </div>

            {/* RIGHT — Results */}
            <div ref={resultsRef} className="bg-[#060610] p-8 lg:p-10 flex flex-col">
              {!submitted ? (
                <div className="flex-1 flex items-center justify-center">
                  <p className="section-label text-center">Your results will appear here</p>
                </div>
              ) : (
                <AnimatedSection>
                  <p className="section-label mb-2">Your Results</p>
                  <p className="text-white/40 text-xs mb-8">{form.name}</p>

                  {/* Big metrics */}
                  <div className="mb-2">
                    <div className="display-font gradient-text leading-none" style={{ fontSize: "clamp(3rem, 6vw, 5rem)" }}>
                      {results!.totalHrs} HRS/WK
                    </div>
                    <p className="text-white/40 text-xs tracking-widest uppercase mt-1 mb-6">Estimated Weekly Time Reclaimed</p>

                    <div className="display-font leading-none" style={{ fontSize: "clamp(2rem, 4vw, 3.5rem)", color: "#A8B4C8" }}>
                      ${results!.totalAnnual.toLocaleString()}
                    </div>
                    <p className="text-white/40 text-xs tracking-widest uppercase mt-1 mb-4">Estimated Annual Value</p>

                    <p className="text-white/30 text-xs italic mb-8">
                      A realistic first build would usually target {Math.max(1, Math.round(results!.totalHrs * 0.6))}–{Math.max(1, Math.round(results!.totalHrs * 1.05))} hours/week first, then expand after proof.
                    </p>
                  </div>

                  {submitError && (
                    <div className="mb-8 rounded-lg border border-[#A8B4C8]/30 bg-[#A8B4C8]/10 px-4 py-3 text-xs leading-relaxed text-white/60">
                      {submitError}
                    </div>
                  )}

                  <div className="border-t border-white/[0.06] pt-8 mb-8">
                    <p className="section-label mb-5">Priority Systems</p>
                    <div className="space-y-3">
                      {results!.sorted.map((area, i) => (
                        <div key={area.key} className="flex items-start gap-3">
                          <span className="display-font gradient-text text-sm w-6 shrink-0">
                            {String(i + 1).padStart(2, "0")}
                          </span>
                          <div className="flex-1">
                            <span className="text-white text-sm font-semibold">{area.label}</span>
                            <span className="text-white/35 text-xs ml-2">({area.sub})</span>
                            <span className="text-white/30 text-xs ml-2">
                              — {area.hrs} hrs/wk, ${area.annual.toLocaleString()}/yr
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="border-t border-white/[0.06] pt-8">
                    <p className="section-label mb-5">Recommendations</p>
                    <div className="space-y-5">
                      {results!.sorted.map((area) => (
                        <div key={area.key}>
                          <p className="text-white text-sm font-bold mb-1">
                            {area.label} <span className="text-white/35 font-normal">({area.sub})</span>
                          </p>
                          <p className="text-white/45 text-xs leading-relaxed">{area.recommendation}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </AnimatedSection>
              )}
            </div>
          </div>

          {/* CALENDLY */}
          {submitted && (
            <AnimatedSection delay={100}>
              <div ref={calendlyRef} className="mt-px" style={{ background: "rgba(255,255,255,0.06)" }}>
                <div className="bg-[#060610] p-8 lg:p-12">
                  <div className="text-center mb-8">
                    <p className="section-label mb-3">Next Step</p>
                    <h2 className="display-font text-white mb-3" style={{ fontSize: "clamp(1.8rem, 3.5vw, 3rem)" }}>
                      BOOK YOUR FREE<br /><span className="gradient-text">STRATEGY CALL</span>
                    </h2>
                    <p className="text-white/40 text-sm max-w-md mx-auto">
                      30 minutes. We&apos;ll walk you through the first agentic system worth building and what it would look like for your business.
                    </p>
                  </div>
                  <div
                    className="calendly-inline-widget rounded-xl overflow-hidden"
                    data-url="https://calendly.com/ziiro-work/30min?hide_gdpr_banner=1&background_color=060610&text_color=ffffff&primary_color=A8B4C8"
                    style={{ minWidth: "320px", height: "700px" }}
                  />
                </div>
              </div>
            </AnimatedSection>
          )}

        </div>
      </div>
    </div>
  );
};

export default Audit;
