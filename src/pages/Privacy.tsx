import { useEffect, useRef, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { animate, stagger } from "animejs";
import SEO from "@/shared/components/SEO";
import SplitHeadline from "@/shared/components/SplitHeadline";

/** Small dot marker for editorial list items, same language as the dot world. */
const Dot = () => (
  <span
    aria-hidden
    className="mt-[0.55em] h-1 w-1 shrink-0 rounded-full bg-[var(--text-primary)] opacity-40"
  />
);

const emailClass =
  "border-b border-[var(--border-strong)] pb-0.5 text-[var(--text-primary)] transition-colors hover:border-[var(--text-primary)]";

/**
 * The Contact section lists addresses as actions on their own line rather than
 * as links inside a sentence, so each anchor owns a 44px target. The rule has
 * to stay tight under the address, so the height is on the anchor and the
 * border on the label inside it. Addresses set mid-sentence keep `emailClass`:
 * WCAG exempts inline links, and padding one would open up the line it sits in.
 */
const emailTargetClass = "group inline-flex min-h-[44px] items-center";
const emailLabelClass =
  "border-b border-[var(--border-strong)] pb-0.5 text-[var(--text-primary)] transition-colors group-hover:border-[var(--text-primary)]";

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

const Privacy = () => {
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
        title="Privacy Policy: Your Data and How We Use It"
        description="How Ziiro AI collects, uses, shares, and protects information you provide through forms, calls, bookings, or SMS on our website or services."
        canonical="/privacy"
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
                ( Ziiro / Privacy )
              </p>
              <p className="hidden font-mono text-[11px] uppercase tracking-[0.25em] text-[var(--text-muted)] md:block">
                [ Legal / 09 sections ]
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
              <SplitHeadline lead="Privacy" tail="policy." />
            </h1>

            <p
              data-hero-line
              style={{ opacity: 0 }}
              className="mt-8 max-w-xl leading-relaxed text-[var(--text-secondary)]"
            >
              Ziiro AI (&quot;Ziiro AI,&quot; &quot;we,&quot; &quot;us,&quot; or
              &quot;our&quot;) respects your privacy. This Privacy Policy explains what
              information we collect when you visit our website, submit a form, book a
              call, or otherwise interact with us, and how we use, share, and protect
              that information.
            </p>

            <p
              data-hero-line
              style={{ opacity: 0 }}
              className="mt-10 font-mono text-[11px] uppercase tracking-[0.25em] text-[var(--text-muted)]"
            >
              Effective date: September 2026
            </p>
          </header>

          {/* ─── Document body ─── */}
          <div ref={bodyRef}>
            <LegalSection index="01" title="Information We Collect">
              <p>We collect the following categories of information:</p>
              <ul className="space-y-3">
                <li className="flex items-start gap-3">
                  <Dot />
                  <span>
                    <strong className="font-semibold text-[var(--text-primary)]">
                      Information you provide:
                    </strong>{" "}
                    name, email address, phone number, business name, industry, company
                    size, use case details, and any free-text responses you submit
                    through forms on our website or services.
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <Dot />
                  <span>
                    <strong className="font-semibold text-[var(--text-primary)]">
                      Communications:
                    </strong>{" "}
                    the content of messages, emails, SMS, phone calls, voicemails, and
                    AI-assisted qualification or support conversations, including
                    transcripts where applicable.
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <Dot />
                  <span>
                    <strong className="font-semibold text-[var(--text-primary)]">
                      Usage data:
                    </strong>{" "}
                    pages visited, referring URLs, device and browser information, IP
                    address, and similar analytics data collected through cookies and
                    standard web technologies.
                  </span>
                </li>
              </ul>
            </LegalSection>

            <LegalSection index="02" title="How We Use Your Information">
              <ul className="space-y-3">
                {[
                  "To provide, operate, and maintain our services",
                  "To respond to inquiries and schedule or conduct calls and demos",
                  "To deliver AI-generated insights, reports, or services you request",
                  "To send transactional, service-related, or marketing communications where permitted by law",
                  "To improve our website, systems, and user experience",
                  "To analyze usage trends and performance",
                  "To comply with legal obligations and enforce our terms",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3">
                    <Dot />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </LegalSection>

            <LegalSection index="03" title="SMS & Phone Communications">
              <p>
                If you provide your phone number, you consent to receive SMS messages
                and calls from Ziiro AI related to your inquiries, bookings, or
                services, including transactional and informational messages. Message
                and data rates may apply. Message frequency may vary. Reply STOP to opt
                out of messages and HELP for assistance. Phone numbers and SMS consent
                data are never sold or shared with third parties for their own
                marketing purposes.
              </p>
            </LegalSection>

            <LegalSection index="04" title="How We Share Information">
              <p>We share information only as needed to operate our business:</p>
              <ul className="space-y-3">
                <li className="flex items-start gap-3">
                  <Dot />
                  <span>
                    <strong className="font-semibold text-[var(--text-primary)]">
                      Service providers:
                    </strong>{" "}
                    email services, CRM platforms, analytics tools, hosting providers,
                    scheduling tools, SMS and voice providers, and AI or automation
                    tools, all of which process data on our behalf.
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <Dot />
                  <span>
                    <strong className="font-semibold text-[var(--text-primary)]">
                      IP geolocation:
                    </strong>{" "}
                    to show the hourly consultation rate for your region, we derive your
                    approximate country from your IP address through our hosting provider
                    or, as a fallback, the geolocation service ipwho.is, which receives
                    your IP address to perform that lookup. We use the country solely to
                    show regional pricing and do not store your IP address for this
                    purpose.
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <Dot />
                  <span>
                    <strong className="font-semibold text-[var(--text-primary)]">
                      Legal compliance:
                    </strong>{" "}
                    when required by law, regulation, subpoena, or legal process.
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <Dot />
                  <span>
                    <strong className="font-semibold text-[var(--text-primary)]">
                      Business transfers:
                    </strong>{" "}
                    in connection with mergers, acquisitions, or sale of assets.
                  </span>
                </li>
              </ul>
              <p className="font-semibold text-[var(--text-primary)]">
                We do not sell your personal information.
              </p>
            </LegalSection>

            <LegalSection index="05" title="Data Retention">
              <p>
                We retain personal information for as long as necessary to provide our
                services, comply with legal obligations, resolve disputes, and enforce
                agreements. You may request deletion of your data at any time by
                contacting{" "}
                <a href="mailto:govind@ziiro.work" className={emailClass}>
                  govind@ziiro.work
                </a>
                .
              </p>
              {/* The companion page. This policy states what is collected and
                  why; the security page states which controls are actually in
                  place around it, and is explicit about the ones that are not. */}
              <p>
                For how that information is protected, which controls are in
                place today and which are honestly not established, see{" "}
                <Link to="/security" className={emailClass}>
                  Security and Trust
                </Link>
                .
              </p>
            </LegalSection>

            <LegalSection index="06" title="Your Rights">
              <p>
                Depending on your jurisdiction, you may have the right to access,
                correct, delete, or port your personal information, and to object to or
                restrict certain processing. To exercise these rights, contact us at
                the email below.
              </p>
            </LegalSection>

            <LegalSection index="07" title="Children">
              <p>
                Our services are not directed to children under 13, and we do not
                knowingly collect personal information from them.
              </p>
            </LegalSection>

            <LegalSection index="08" title="Changes to This Policy">
              <p>
                We may update this Privacy Policy from time to time. The
                &quot;Effective Date&quot; above indicates when it was last revised.
                Continued use of our services after changes constitutes acceptance of
                the updated policy.
              </p>
            </LegalSection>

            <LegalSection index="09" title="Contact">
              <p className="font-semibold text-[var(--text-primary)]">Ziiro AI</p>
              <div className="space-y-2">
                <p>
                  <a href="mailto:govind@ziiro.work" className={emailTargetClass}>
                    <span className={emailLabelClass}>govind@ziiro.work</span>
                  </a>
                </p>
                <p>
                  <a href="mailto:aniket@ziiro.work" className={emailTargetClass}>
                    <span className={emailLabelClass}>aniket@ziiro.work</span>
                  </a>
                </p>
              </div>
            </LegalSection>

            <div className="border-t border-[var(--border)] pt-6">
              <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-[var(--text-muted)]">
                ( End of document / Ziiro AI )
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Privacy;
