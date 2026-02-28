import { useState, FormEvent } from "react";
import AnimatedSection from "@/components/AnimatedSection";
import GlassCard from "@/components/GlassCard";
import { Mail, Clock } from "lucide-react";

const Contact = () => {
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    company: "",
    industry: "",
    service: "",
    budget: "",
    timeline: "",
    message: "",
    consent: false,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = "Name is required";
    if (!form.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = "Valid email required";
    if (form.phone && !/^[\d\s\-+()]{7,20}$/.test(form.phone)) e.phone = "Invalid phone format";
    if (!form.company.trim()) e.company = "Company is required";
    if (!form.industry) e.industry = "Select an industry";
    if (!form.message.trim() || form.message.trim().length < 50) e.message = "Minimum 50 characters";
    if (!form.consent) e.consent = "Consent is required";
    return e;
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const v = validate();
    setErrors(v);
    if (Object.keys(v).length > 0) return;
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setSubmitted(true);
    }, 1500);
  };

  const inputClass =
    "w-full bg-[hsl(var(--input))] border border-[hsl(var(--glass-border))] rounded-lg px-4 py-3 text-foreground text-sm placeholder:text-[hsl(var(--text-muted-alpha))] focus:outline-none focus:ring-2 focus:ring-accent/50 transition-all";
  const labelClass = "block text-sm font-medium text-foreground mb-1.5";
  const errorClass = "text-xs text-accent mt-1";

  if (submitted) {
    return (
      <div className="relative z-10 min-h-screen flex items-center justify-center px-4 pt-20">
        <AnimatedSection>
          <GlassCard hover={false} className="text-center max-w-md py-16 px-10">
            <div className="text-5xl mb-4">🎉</div>
            <h2 className="text-2xl font-bold text-foreground mb-3">Thank You!</h2>
            <p className="text-muted-alpha text-sm">
              We'll contact you within 24 hours to discuss how Ziiro can transform your business.
            </p>
          </GlassCard>
        </AnimatedSection>
      </div>
    );
  }

  return (
    <div className="relative z-10 min-h-screen pt-28 pb-20 px-4">
      <div className="container mx-auto">
        <AnimatedSection>
          <h1 className="text-4xl md:text-6xl font-black text-center mb-4 gradient-text">
            Let's Build Something Amazing
          </h1>
          <p className="text-center text-muted-alpha max-w-2xl mx-auto mb-16">
            Schedule your free consultation and discover how Ziiro can transform your business.
          </p>
        </AnimatedSection>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {/* Form */}
          <AnimatedSection className="lg:col-span-2">
            <GlassCard hover={false}>
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className={labelClass}>Full Name *</label>
                    <input className={inputClass} placeholder="John Doe" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                    {errors.name && <p className={errorClass}>{errors.name}</p>}
                  </div>
                  <div>
                    <label className={labelClass}>Email *</label>
                    <input className={inputClass} type="email" placeholder="john@company.com" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                    {errors.email && <p className={errorClass}>{errors.email}</p>}
                  </div>
                  <div>
                    <label className={labelClass}>Phone</label>
                    <input className={inputClass} placeholder="+1 (555) 123-4567" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                    {errors.phone && <p className={errorClass}>{errors.phone}</p>}
                  </div>
                  <div>
                    <label className={labelClass}>Company *</label>
                    <input className={inputClass} placeholder="Acme Inc." value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} />
                    {errors.company && <p className={errorClass}>{errors.company}</p>}
                  </div>
                  <div>
                    <label className={labelClass}>Industry *</label>
                    <select className={inputClass} value={form.industry} onChange={(e) => setForm({ ...form, industry: e.target.value })}>
                      <option value="">Select industry</option>
                      {["E-commerce", "Real Estate", "Healthcare", "Finance", "SaaS", "Professional Services", "Other"].map((o) => (
                        <option key={o} value={o}>{o}</option>
                      ))}
                    </select>
                    {errors.industry && <p className={errorClass}>{errors.industry}</p>}
                  </div>
                  <div>
                    <label className={labelClass}>Service Interest</label>
                    <select className={inputClass} value={form.service} onChange={(e) => setForm({ ...form, service: e.target.value })}>
                      <option value="">Select service</option>
                      {["AI Chatbots", "Workflow Automation", "Data Analytics", "Content Generation", "Sales & Marketing Automation", "Custom Solution"].map((o) => (
                        <option key={o} value={o}>{o}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className={labelClass}>Monthly Budget</label>
                    <select className={inputClass} value={form.budget} onChange={(e) => setForm({ ...form, budget: e.target.value })}>
                      <option value="">Select budget</option>
                      {["$2,000 - $5,000", "$5,000 - $10,000", "$10,000 - $20,000", "$20,000+"].map((o) => (
                        <option key={o} value={o}>{o}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className={labelClass}>Timeline</label>
                    <select className={inputClass} value={form.timeline} onChange={(e) => setForm({ ...form, timeline: e.target.value })}>
                      <option value="">Select timeline</option>
                      {["Urgent (within 1 month)", "1-3 months", "3-6 months", "6+ months"].map((o) => (
                        <option key={o} value={o}>{o}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div>
                  <label className={labelClass}>Project Details * <span className="text-muted-alpha font-normal">(min 50 chars)</span></label>
                  <textarea className={`${inputClass} min-h-[120px]`} placeholder="Tell us about your project, goals, and current challenges..." value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} />
                  <div className="flex justify-between">
                    {errors.message && <p className={errorClass}>{errors.message}</p>}
                    <span className="text-xs text-muted-alpha ml-auto">{form.message.length}/50</span>
                  </div>
                </div>
                <label className="flex items-start gap-2 cursor-pointer">
                  <input type="checkbox" className="mt-1 accent-accent" checked={form.consent} onChange={(e) => setForm({ ...form, consent: e.target.checked })} />
                  <span className="text-xs text-muted-alpha">I agree to receive communications from Ziiro</span>
                </label>
                {errors.consent && <p className={errorClass}>{errors.consent}</p>}
                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary-gradient w-full text-base disabled:opacity-50"
                >
                  {loading ? "Sending..." : "Send Message"}
                </button>
              </form>
            </GlassCard>
          </AnimatedSection>

          {/* Contact Info */}
          <AnimatedSection delay={200}>
            <GlassCard hover={false} className="h-fit">
              <h3 className="text-lg font-bold text-foreground mb-6">Contact Info</h3>
              <div className="space-y-4 text-sm">
                <a href="mailto:aniket@ziiro.work" className="flex items-center gap-3 text-muted-alpha hover:text-foreground transition-colors">
                  <Mail size={16} className="text-accent" /> aniket@ziiro.work
                </a>
                <a href="mailto:Govind@ziiro.work" className="flex items-center gap-3 text-muted-alpha hover:text-foreground transition-colors">
                  <Mail size={16} className="text-accent" /> Govind@ziiro.work
                </a>
                <div className="flex items-center gap-3 text-muted-alpha">
                  <Clock size={16} className="text-accent" /> Mon–Fri, 9 AM – 6 PM EST
                </div>
              </div>
              <div className="mt-8">
                <h4 className="text-sm font-semibold text-foreground mb-3">Follow Us</h4>
                <div className="flex flex-wrap gap-2">
                  {["LinkedIn", "Twitter", "Instagram", "Facebook"].map((s) => (
                    <a
                      key={s}
                      href="#"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="glass px-3 py-1.5 text-xs text-muted-alpha hover:text-foreground transition-colors"
                    >
                      {s}
                    </a>
                  ))}
                </div>
              </div>
            </GlassCard>
          </AnimatedSection>
        </div>
      </div>
    </div>
  );
};

export default Contact;
