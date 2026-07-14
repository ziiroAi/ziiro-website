import { useEffect, useRef, type ReactNode } from "react";
import { animate, stagger } from "animejs";
import SEO from "@/shared/components/SEO";

/** Small dot marker for editorial list items — same language as the dot world. */
const Dot = () => (
  <span
    aria-hidden
    className="mt-[0.55em] h-1 w-1 shrink-0 rounded-full bg-[var(--text-primary)] opacity-40"
  />
);

const emailClass =
  "border-b border-[var(--text-primary)]/25 pb-0.5 text-[var(--text-primary)] transition-colors hover:border-[var(--text-primary)]";

/** Numbered editorial document section: mono index, Inter title, hairline above. */
function LegalSection({
  index,
  title,
  children,
}: {
  index: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section
      data-legal-section
      style={{ opacity: 0 }}
      className="border-t border-[var(--border)] py-10 md:py-12"
    >
      <div className="grid gap-3 md:grid-cols-[4.5rem_1fr] md:gap-6">
        <p className="font-mono text-[11px] font-bold uppercase tracking-[0.25em] text-[var(--text-muted)] md:pt-1.5">
          {index}
        </p>
        <div>
          <h2
            className="font-display text-xl font-semibold text-[var(--text-primary)] md:text-2xl"
            style={{ letterSpacing: "-0.02em", lineHeight: 1.15 }}
          >
            {title}
          </h2>
          <div className="mt-5 space-y-4 text-[15px] leading-relaxed text-[var(--text-secondary)]">
            {children}
          </div>
        </div>
      </div>
    </section>
  );
}

const Terms = () => {
  const heroRef = useRef<HTMLElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const cleanups: (() => void)[] = [];

    // Hero lines rise in on mount
    const hero = heroRef.current;
    if (hero) {
      const lines = hero.querySelectorAll<HTMLElement>("[data-hero-line]");
      const anim = animate(lines, {
        opacity: [0, 1],
        y: [24, 0],
        delay: stagger(90),
        duration: reduced ? 0 : 800,
        ease: "out(3)",
      });
      cleanups.push(() => anim.cancel());
    }

    // Document sections rise in once as they enter the viewport
    const body = bodyRef.current;
    if (body) {
      const sections = body.querySelectorAll<HTMLElement>("[data-legal-section]");
      const anims: ReturnType<typeof animate>[] = [];
      const io = new IntersectionObserver(
        (entries) => {
          entries
            .filter((e) => e.isIntersecting)
            .forEach((entry, i) => {
              io.unobserve(entry.target);
              anims.push(
                animate(entry.target as HTMLElement, {
                  opacity: [0, 1],
                  y: [24, 0],
                  delay: reduced ? 0 : i * 90,
                  duration: reduced ? 0 : 700,
                  ease: "out(3)",
                }),
              );
            });
        },
        { threshold: 0.12, rootMargin: "0px 0px -8% 0px" },
      );
      sections.forEach((s) => io.observe(s));
      cleanups.push(() => {
        io.disconnect();
        anims.forEach((a) => a.cancel());
      });
    }

    return () => cleanups.forEach((fn) => fn());
  }, []);

  return (
    <div className="relative" style={{ zIndex: 1 }}>
      <SEO
        title="Terms of Service"
        description="The terms that govern your use of the Ziiro AI website and services."
        canonical="/terms"
      />
      <div className="min-h-screen pb-28">
        <div className="mx-auto max-w-3xl px-6 md:px-10">
          {/* ─── Page hero ─── */}
          <header ref={heroRef} className="pt-36 pb-16">
            <div
              data-hero-line
              style={{ opacity: 0 }}
              className="flex items-center justify-between gap-4"
            >
              <p className="flex items-center gap-3 font-mono text-[11px] font-bold uppercase tracking-[0.25em] text-[var(--text-secondary)]">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-[var(--text-primary)] opacity-70" />
                ( Ziiro — Terms )
              </p>
              <p className="hidden font-mono text-[11px] uppercase tracking-[0.25em] text-[var(--text-secondary)]/70 md:block">
                [ Legal — 12 sections ]
              </p>
            </div>

            <h1
              data-hero-line
              className="mt-10 font-display font-semibold text-[var(--text-primary)]"
              style={{
                opacity: 0,
                fontSize: "clamp(2.6rem, 6vw, 4.8rem)",
                letterSpacing: "-0.03em",
                lineHeight: 1.04,
              }}
            >
              Terms &amp;
              <br />
              <span className="text-[var(--text-secondary)]">conditions.</span>
            </h1>

            <p
              data-hero-line
              style={{ opacity: 0 }}
              className="mt-8 max-w-xl leading-relaxed text-[var(--text-secondary)]"
            >
              These Terms &amp; Conditions (&quot;Terms&quot;) govern your access to
              and use of Ziiro AI and any related services, content, AI systems,
              communications, and websites (collectively, the &quot;Services&quot;)
              provided by Ziiro AI (&quot;Ziiro AI,&quot; &quot;we,&quot;
              &quot;us,&quot; or &quot;our&quot;). By using the Services, you agree to
              these Terms. If you do not agree, you must not use the Services.
            </p>

            <p
              data-hero-line
              style={{ opacity: 0 }}
              className="mt-10 font-mono text-[11px] uppercase tracking-[0.25em] text-[var(--text-muted)]"
            >
              Effective date — January 30, 2026
            </p>
          </header>

          {/* ─── Document body ─── */}
          <div ref={bodyRef}>
            <LegalSection index="01" title="Use of the Services">
              <p>
                You may use the Services only for lawful purposes and in accordance
                with these Terms, and you agree not to misuse the Services, attempt to
                gain unauthorized access, interfere with system performance or
                security, or use the Services to transmit unlawful, harmful, or
                infringing content.
              </p>
            </LegalSection>

            <LegalSection index="02" title="AI Services & Outputs">
              <p>
                Any AI-generated outputs, insights, recommendations, reports, or
                responses provided through Ziiro AI are for informational purposes
                only, and are based on the data and inputs provided by you or collected
                through system interactions. These outputs do not constitute
                professional, legal, financial, or medical advice, and should not be
                solely relied upon for critical decision-making.
              </p>
            </LegalSection>

            <LegalSection index="03" title="Calls, Communication & AI Assistance">
              <p>
                When you interact with Ziiro AI through forms, bookings, or
                consultations, you may receive automated, AI-assisted, or
                human-supported communications via email, phone, or SMS, including
                scheduling, qualification, and follow-ups. Calls and messages may be
                recorded, transcribed, and analyzed for service improvement and quality
                assurance, and by engaging with our Services you consent to such
                processing.
              </p>
            </LegalSection>

            <LegalSection index="04" title="SMS Program Terms">
              <ul className="space-y-3">
                {[
                  "Our SMS program may include transactional and, where permitted, informational or service-related messages from Ziiro AI.",
                  "Message and data rates may apply. Message frequency may vary.",
                  "You may opt out at any time by replying STOP.",
                  "You may request assistance by replying HELP.",
                  "We do not sell or share SMS opt-in data or phone numbers with third parties for marketing purposes.",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3">
                    <Dot />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </LegalSection>

            <LegalSection index="05" title="Intellectual Property">
              <p>
                All content, branding, software, AI systems, models, text, designs, and
                materials provided through the Services are owned by or licensed to
                Ziiro AI and are protected by applicable intellectual property laws,
                and you may not copy, reproduce, modify, distribute, or create
                derivative works without prior written permission.
              </p>
            </LegalSection>

            <LegalSection index="06" title="Third-Party Services">
              <p>
                The Services may rely on third-party tools and platforms such as
                hosting, analytics, CRM, communication APIs, and AI infrastructure
                providers, and we are not responsible for the availability,
                performance, or practices of such third-party services, which are
                governed by their own terms and policies.
              </p>
            </LegalSection>

            <LegalSection index="07" title="Disclaimer">
              <p className="text-xs uppercase leading-relaxed tracking-wide text-[var(--text-muted)]">
                The Services are provided on an &quot;as is&quot; and &quot;as
                available&quot; basis without warranties of any kind, whether express
                or implied, including but not limited to warranties of accuracy,
                reliability, merchantability, fitness for a particular purpose, or
                non-infringement, and we do not guarantee that the Services will be
                uninterrupted, error-free, or completely secure.
              </p>
            </LegalSection>

            <LegalSection index="08" title="Limitation of Liability">
              <p className="text-xs uppercase leading-relaxed tracking-wide text-[var(--text-muted)]">
                To the maximum extent permitted by law, Ziiro AI shall not be liable
                for any indirect, incidental, special, consequential, or punitive
                damages, including loss of profits, data, or business opportunities,
                arising from or related to your use of the Services, and our total
                liability shall not exceed one hundred U.S. dollars (USD $100).
              </p>
            </LegalSection>

            <LegalSection index="09" title="Indemnification">
              <p>
                You agree to indemnify, defend, and hold harmless Ziiro AI, its
                affiliates, employees, contractors, and partners from any claims,
                liabilities, damages, losses, or expenses arising from your use of the
                Services or violation of these Terms.
              </p>
            </LegalSection>

            <LegalSection index="10" title="Governing Law">
              <p>
                These Terms are governed by the laws of India, without regard to
                conflict of law principles, and any disputes arising from these Terms
                shall be subject to the exclusive jurisdiction of courts located in
                Uttar Pradesh, India.
              </p>
            </LegalSection>

            <LegalSection index="11" title="Changes to These Terms">
              <p>
                We may update these Terms from time to time, and the &quot;Effective
                Date&quot; above reflects the latest version, and continued use of the
                Services after updates constitutes acceptance of the revised Terms.
              </p>
            </LegalSection>

            <LegalSection index="12" title="Contact">
              <p className="font-semibold text-[var(--text-primary)]">Ziiro AI</p>
              <div className="space-y-2">
                <p>
                  <a href="mailto:govind@ziiro.work" className={emailClass}>
                    govind@ziiro.work
                  </a>
                </p>
                <p>
                  <a href="mailto:aniket@ziiro.work" className={emailClass}>
                    aniket@ziiro.work
                  </a>
                </p>
              </div>
            </LegalSection>

            <div className="border-t border-[var(--border)] pt-6">
              <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-[var(--text-muted)]">
                ( End of document — Ziiro AI )
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Terms;
