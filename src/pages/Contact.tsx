import { useState, FormEvent } from "react";
import SEO from "@/components/SEO";
import AnimatedSection from "@/components/AnimatedSection";
import { Mail } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const Contact = () => {
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    company: "",
    message: "",
    consent: false,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = "Required";
    if (!form.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = "Valid email required";
    if (!form.company.trim()) e.company = "Required";
    if (!form.message.trim()) e.message = "Required";
    if (!form.consent) e.consent = "Required";
    return e;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const v = validate();
    setErrors(v);
    if (Object.keys(v).length > 0) return;
    setLoading(true);
    try {
      // Save to DB (best-effort, don't block email on failure)
      try {
        await supabase.from("contact_submissions").insert({
          name: form.name,
          email: form.email,
          company: form.company,
          message: form.message,
        });
      } catch {}

      // Always send email notification
      await supabase.functions.invoke("send-contact-email", {
        body: { name: form.name, email: form.email, phone: form.phone, company: form.company, message: form.message },
      });

      setSubmitted(true);
    } catch (err) {
      console.error(err);
      // Still show success so user isn't left hanging
      setSubmitted(true);
    } finally {
      setLoading(false);
    }
  };

  const inputClass =
    "w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-4 py-3.5 text-white text-sm placeholder:text-white/25 focus:outline-none focus:border-[rgba(160,168,196,0.4)] focus:bg-white/[0.06] transition-all";

  if (submitted) {
    return (
      <div className="relative min-h-screen flex items-center justify-center px-6" style={{ zIndex: 1 }}>
        <AnimatedSection>
          <div className="text-center">
            <div className="display-font text-[8rem] gradient-text leading-none mb-6">&#10003;</div>
            <h2 className="display-font text-white mb-4" style={{ fontSize: "clamp(2rem, 5vw, 4rem)" }}>
              MESSAGE SENT.
            </h2>
            <p className="text-white/45 text-lg">
              Expect a reply within 24 hours.
            </p>
          </div>
        </AnimatedSection>
      </div>
    );
  }

  return (
    <div className="relative" style={{ zIndex: 1 }}>
      <SEO
        title="Book a Free Consultation - Talk to Ziiro AI"
        description="Book a free 30-minute call with Ziiro AI. We'll audit your biggest time-wasters and show you exactly how AI fixes them. No commitment required."
        canonical="/contact"
      />
      <div className="min-h-screen pt-32 pb-28 px-6">
        <div className="container mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-start max-w-5xl mx-auto">

            {/* Left - headline */}
            <AnimatedSection>
              <h1 className="display-font text-white leading-none mb-6" style={{ fontSize: "clamp(3.5rem, 7vw, 7rem)" }}>
                LET&apos;S<br /><span className="gradient-text">TALK.</span>
              </h1>
              <p className="text-white/45 text-lg leading-relaxed mb-12">
                Free 30-minute consultation. We&apos;ll audit your biggest time-wasters and show you exactly how AI fixes them.
              </p>

              <div className="space-y-4">
                <div className="flex items-center gap-3 text-white/45 text-sm">
                  <span className="text-[#A8B4C8]">&#10003;</span> No commitment required
                </div>
                <div className="flex items-center gap-3 text-white/45 text-sm">
                  <span className="text-[#A8B4C8]">&#10003;</span> Clear, actionable takeaways
                </div>
                <div className="flex items-center gap-3 text-white/45 text-sm">
                  <span className="text-[#A8B4C8]">&#10003;</span> Response within 24 hours
                </div>
              </div>

              <div className="mt-12 pt-12 border-t border-white/[0.06] space-y-3">
                <a href="mailto:aniket@ziiro.work" className="flex items-center gap-3 text-white/40 text-sm hover:text-white transition-colors">
                  <Mail size={14} className="text-[#A8B4C8]" /> aniket@ziiro.work
                </a>
                <a href="mailto:govind@ziiro.work" className="flex items-center gap-3 text-white/40 text-sm hover:text-white transition-colors">
                  <Mail size={14} className="text-[#A8B4C8]" /> govind@ziiro.work
                </a>
              </div>
            </AnimatedSection>

            {/* Right - form */}
            <AnimatedSection delay={150}>
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <input
                      className={inputClass}
                      placeholder="Your Name"
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                    />
                    {errors.name && <p className="text-xs text-[#A8B4C8] mt-1">{errors.name}</p>}
                  </div>
                  <div>
                    <input
                      className={inputClass}
                      type="email"
                      placeholder="Email Address"
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                    />
                    {errors.email && <p className="text-xs text-[#A8B4C8] mt-1">{errors.email}</p>}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <input
                      className={inputClass}
                      placeholder="Company Name"
                      value={form.company}
                      onChange={(e) => setForm({ ...form, company: e.target.value })}
                    />
                    {errors.company && <p className="text-xs text-[#A8B4C8] mt-1">{errors.company}</p>}
                  </div>
                  <div>
                    <input
                      className={inputClass}
                      type="tel"
                      placeholder="Phone (optional)"
                      value={form.phone}
                      onChange={(e) => setForm({ ...form, phone: e.target.value })}
                      style={{ fontFamily: "Inter, sans-serif" }}
                    />
                  </div>
                </div>

                <div>
                  <textarea
                    className={`${inputClass} min-h-[140px] resize-none`}
                    placeholder="What's your biggest operational bottleneck right now?"
                    value={form.message}
                    onChange={(e) => setForm({ ...form, message: e.target.value })}
                  />
                  {errors.message && <p className="text-xs text-[#A8B4C8] mt-1">{errors.message}</p>}
                </div>

                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    className="mt-0.5 w-4 h-4 shrink-0"
                    style={{ accentColor: "#C0C8D8" }}
                    checked={form.consent}
                    onChange={(e) => setForm({ ...form, consent: e.target.checked })}
                  />
                  <span className="text-xs text-white/35 leading-relaxed">
                    I agree to receive communications from Ziiro regarding my enquiry.
                  </span>
                </label>
                {errors.consent && <p className="text-xs text-[#A8B4C8]">{errors.consent}</p>}

                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary-gradient w-full text-base font-bold disabled:opacity-50"
                >
                  {loading ? "Sending..." : "Send Message"}
                </button>
              </form>
            </AnimatedSection>

          </div>
        </div>
      </div>
    </div>
  );
};

export default Contact;
