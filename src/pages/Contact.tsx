import {
  useEffect,
  useRef,
  useState,
  type FocusEvent,
  type FormEvent,
  type ReactNode,
} from "react";
import { animate, createAnimatable, createTimeline, cubicBezier, utils } from "animejs";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import SEO from "@/shared/components/SEO";
import DotGlyph from "@/shared/ui/dot-glyph";
import {
  CSS_EASE,
  DURATION,
  EASE_OUT_EXPO,
  MS,
  STAGGER,
  TRAVEL,
} from "@/shared/motion/tokens";
import {
  emptyContactForm,
  validateContactForm,
} from "@/features/contact/entities/contactForm";
import { sendContactMessage } from "@/features/contact/services/contactService";

/** The house expo-out, handed to anime.js. Built from the token control points
 *  rather than retyped, so this page cannot drift the next time the curve is
 *  tuned. */
const expoOut = cubicBezier(...EASE_OUT_EXPO);

/** anime.js counts in milliseconds and the tokens in seconds; converting once
 *  here keeps the arithmetic out of the timeline. */
const RISE_STAGGER_MS = Math.round(STAGGER.card * 1000);

/** Everything that merely changes colour or opacity on this page settles at the
 *  micro duration. It is stated rather than left to Tailwind's default so the
 *  form's timing comes from the same file as the rest of the site — and because
 *  this is the value that decides whether a field feels attached to the caret
 *  or a beat behind it. */
const microTransition = {
  transitionDuration: `${DURATION.micro}s`,
  transitionTimingFunction: CSS_EASE.out,
} as const;

const fieldTransition = {
  transitionProperty: "border-color, color",
  ...microTransition,
} as const;

const buttonTransition = {
  transitionProperty: "opacity",
  ...microTransition,
} as const;

/**
 * A validation line that arrives rather than appears.
 *
 * A message snapping into existence under a field reads as a fault in the page.
 * Three pixels over the micro duration reads as the form answering you, and it
 * is deliberately the shortest motion here: an error the reader has to wait for
 * is worse than one that pops. Under reduced motion it is simply present.
 *
 * Falsy children render nothing, so this keeps the `errors.x && ...` semantics
 * of the markup it replaced — the message is still driven entirely by the
 * validator, and nothing about what the reader is told has changed.
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
 * The submit button's label, swapped without the button changing size.
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

const inputClass =
  "w-full rounded-xl border border-[var(--border)] bg-transparent px-4 py-3.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)]";

const labelClass =
  "mb-2 block font-mono text-[10px] uppercase tracking-[0.25em] text-[var(--text-secondary)]";

const errorClass =
  "mt-2 font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--text-primary)]";

const emails = ["aniket@ziiro.work", "govind@ziiro.work"];

const metas = ["[ RESPONSE < 24H ]", "[ FREE 30 MIN ]", "[ NO PITCH ]"];

const Contact = () => {
  const [form, setForm] = useState(emptyContactForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const rootRef = useRef<HTMLDivElement>(null);
  const emailAnims = useRef<ReturnType<typeof createAnimatable>[]>([]);
  const reduced = useRef(false);

  // Sequenced entrance: label -> headline -> sub -> columns rise in order
  useEffect(() => {
    reduced.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const root = rootRef.current;
    if (!root) return;
    const els = [...root.querySelectorAll<HTMLElement>("[data-rise]")];
    if (els.length === 0) return;
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
  }, [submitted]);

  // Hover-follow micro-interaction on the direct email links
  useEffect(() => {
    if (submitted) return;
    const root = rootRef.current;
    if (!root) return;
    const links = [...root.querySelectorAll<HTMLElement>("[data-email-link]")];
    emailAnims.current = links.map((el) =>
      createAnimatable(el, { x: MS.micro, ease: expoOut }),
    );
    return () => {
      emailAnims.current.forEach((a) => a.revert());
      emailAnims.current = [];
    };
  }, [submitted]);

  // Focus micro-interaction: the field lifts subtly and settles back on blur.
  // It runs on the micro duration because focus has to land with the caret —
  // a spring whose settle time we cannot state left the field still moving
  // while the first characters were being typed. Transform only, so nothing
  // below the field re-lays-out. utils.remove() keeps rapid focus/blur
  // interruption-safe (no stuck scales).
  const fieldFocus = (e: FocusEvent<HTMLElement>) => {
    if (reduced.current) return;
    const el = e.currentTarget;
    utils.remove(el);
    animate(el, { scale: 1.012, duration: MS.micro, ease: expoOut });
  };
  const fieldBlur = (e: FocusEvent<HTMLElement>) => {
    if (reduced.current) return;
    const el = e.currentTarget;
    utils.remove(el);
    animate(el, { scale: 1, duration: MS.quick, ease: expoOut });
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const v = validateContactForm(form);
    setErrors(v);
    if (Object.keys(v).length > 0) return;
    setLoading(true);
    setSubmitError("");
    try {
      await sendContactMessage(form);
      setSubmitted(true);
    } catch (err) {
      console.error(err);
      setSubmitError("We could not send your message. Please email aniket@ziiro.work or govind@ziiro.work directly.");
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div ref={rootRef} className="relative flex min-h-screen items-center justify-center px-6" style={{ zIndex: 1 }}>
        <SEO
          title="Message Sent"
          description="Thanks for contacting Ziiro AI. We'll reply within 24 hours."
          canonical="/contact"
        />
        <div className="flex flex-col items-center text-center">
          <div data-rise style={{ opacity: 0 }}>
            <DotGlyph variant="loops" />
          </div>
          <p
            data-rise
            className="mt-8 flex items-center justify-center gap-3 font-mono text-[11px] font-bold uppercase tracking-[0.25em] text-[var(--text-secondary)]"
            style={{ opacity: 0 }}
          >
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-[var(--text-primary)] opacity-70" />
            {"( ZIIRO / CONTACT )"}
          </p>
          <h2
            data-rise
            className="mt-6 font-display font-semibold text-[var(--text-primary)]"
            style={{
              fontSize: "clamp(2.2rem, 5vw, 4rem)",
              letterSpacing: "-0.03em",
              lineHeight: 1.04,
              opacity: 0,
            }}
          >
            Message sent.
            <br />
            <span className="text-[var(--text-secondary)]">Expect a reply within 24 hours.</span>
          </h2>
          <p
            data-rise
            className="mt-8 font-mono text-[11px] uppercase tracking-[0.25em] text-[var(--text-muted)]"
            style={{ opacity: 0 }}
          >
            [ RESPONSE &lt; 24H ]
          </p>
        </div>
      </div>
    );
  }

  return (
    <div ref={rootRef} className="relative" style={{ zIndex: 1 }}>
      <SEO
        title="Book a Free Agentic Systems Call"
        description="Book a free 30-minute call with Ziiro AI. We'll identify the first agentic system worth building for your startup, solo founder workflow, or lean team."
        canonical="/contact"
      />

      <div className="mx-auto max-w-7xl px-6 md:px-10">
        {/* ─── Page hero ─── */}
        <header className="border-b border-[var(--border)] pb-16 pt-36">
          <p
            data-rise
            className="flex items-center gap-3 font-mono text-[11px] font-bold uppercase tracking-[0.25em] text-[var(--text-secondary)]"
            style={{ opacity: 0 }}
          >
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-[var(--text-primary)] opacity-70" />
            {"( ZIIRO / CONTACT )"}
          </p>
          <h1
            data-rise
            className="mt-10 font-display font-semibold text-[var(--text-primary)]"
            style={{
              fontSize: "clamp(2.6rem, 6vw, 4.8rem)",
              letterSpacing: "-0.03em",
              lineHeight: 1.04,
              opacity: 0,
            }}
          >
            Let&apos;s talk.
            <br />
            <span className="text-[var(--text-secondary)]">One call. Real numbers.</span>
          </h1>
          <p
            data-rise
            className="mt-6 max-w-xl leading-relaxed text-[var(--text-secondary)]"
            style={{ opacity: 0 }}
          >
            A free 30-minute consultation. We&apos;ll identify the first agentic
            system worth building for your business, and you leave with a clear
            roadmap, no commitment required.
          </p>
        </header>

        {/* ─── Two-column body ─── */}
        <div className="grid grid-cols-1 gap-16 pb-28 pt-16 lg:grid-cols-12">
          {/* Left: pitch, direct lines, metas */}
          <div className="lg:col-span-5">
            <p
              data-rise
              className="max-w-md leading-relaxed text-[var(--text-secondary)]"
              style={{ opacity: 0 }}
            >
              Tell us where the hours go. We&apos;ll tell you which agent,
              website, marketing loop, or workflow to fix first, with real
              numbers attached.
            </p>

            <div
              data-rise
              className="mt-12 border-t border-[var(--border)] pt-8"
              style={{ opacity: 0 }}
            >
              <p className="mb-5 font-mono text-[10px] uppercase tracking-[0.25em] text-[var(--text-secondary)]">
                {"( DIRECT )"}
              </p>
              <div className="flex flex-col gap-3">
                {emails.map((email, i) => (
                  <a
                    key={email}
                    data-email-link
                    href={`mailto:${email}`}
                    onMouseEnter={() => emailAnims.current[i]?.x(TRAVEL.nudge)}
                    onMouseLeave={() => emailAnims.current[i]?.x(0)}
                    style={fieldTransition}
                    className="inline-block w-fit font-mono text-sm tracking-wide text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                  >
                    {email}
                  </a>
                ))}
              </div>
            </div>

            <div
              data-rise
              className="mt-12 border-t border-[var(--border)] pt-8"
              style={{ opacity: 0 }}
            >
              <div className="flex flex-col gap-3">
                {metas.map((m) => (
                  <p
                    key={m}
                    className="font-mono text-[11px] uppercase tracking-[0.25em] text-[var(--text-muted)]"
                  >
                    {m}
                  </p>
                ))}
              </div>
            </div>
          </div>

          {/* Right: form */}
          <div className="lg:col-span-6 lg:col-start-7">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div data-rise style={{ opacity: 0 }}>
                  <label htmlFor="contact-name" className={labelClass}>
                    Name
                  </label>
                  <input
                    id="contact-name"
                    className={inputClass}
                    style={fieldTransition}
                    placeholder="Your name"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    onFocus={fieldFocus}
                    onBlur={fieldBlur}
                  />
                  <FieldMessage className={errorClass}>{errors.name}</FieldMessage>
                </div>
                <div data-rise style={{ opacity: 0 }}>
                  <label htmlFor="contact-email" className={labelClass}>
                    Email
                  </label>
                  <input
                    id="contact-email"
                    className={inputClass}
                    style={fieldTransition}
                    type="email"
                    placeholder="you@company.com"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    onFocus={fieldFocus}
                    onBlur={fieldBlur}
                  />
                  <FieldMessage className={errorClass}>{errors.email}</FieldMessage>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div data-rise style={{ opacity: 0 }}>
                  <label htmlFor="contact-company" className={labelClass}>
                    Company
                  </label>
                  <input
                    id="contact-company"
                    className={inputClass}
                    style={fieldTransition}
                    placeholder="Company name"
                    value={form.company}
                    onChange={(e) => setForm({ ...form, company: e.target.value })}
                    onFocus={fieldFocus}
                    onBlur={fieldBlur}
                  />
                  <FieldMessage className={errorClass}>{errors.company}</FieldMessage>
                </div>
                <div data-rise style={{ opacity: 0 }}>
                  <label htmlFor="contact-phone" className={labelClass}>
                    Phone (optional)
                  </label>
                  <input
                    id="contact-phone"
                    className={inputClass}
                    style={fieldTransition}
                    type="tel"
                    placeholder="+1 000 000 0000"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    onFocus={fieldFocus}
                    onBlur={fieldBlur}
                  />
                </div>
              </div>

              <div data-rise style={{ opacity: 0 }}>
                <label htmlFor="contact-message" className={labelClass}>
                  Message
                </label>
                <textarea
                  id="contact-message"
                  className={`${inputClass} min-h-[140px] resize-none`}
                  style={fieldTransition}
                  placeholder="What agent, website, marketing loop, UGC ad system, or team bottleneck should we improve first?"
                  value={form.message}
                  onChange={(e) => setForm({ ...form, message: e.target.value })}
                  onFocus={fieldFocus}
                  onBlur={fieldBlur}
                />
                <FieldMessage className={errorClass}>{errors.message}</FieldMessage>
              </div>

              <div data-rise style={{ opacity: 0 }}>
                <label className="flex cursor-pointer items-start gap-3">
                  <input
                    type="checkbox"
                    className="mt-0.5 h-4 w-4 shrink-0"
                    style={{ accentColor: "var(--text-primary)" }}
                    checked={form.consent}
                    onChange={(e) => setForm({ ...form, consent: e.target.checked })}
                  />
                  <span className="text-xs leading-relaxed text-[var(--text-muted)]">
                    I agree to receive communications from Ziiro regarding my enquiry.
                  </span>
                </label>
                <FieldMessage className={errorClass}>{errors.consent}</FieldMessage>
              </div>

              <div data-rise style={{ opacity: 0 }}>
                <button
                  type="submit"
                  disabled={loading}
                  style={buttonTransition}
                  className="w-full rounded-full bg-[var(--text-primary)] px-8 py-3.5 font-mono text-xs font-semibold uppercase tracking-wide text-[var(--background)] hover:opacity-90 disabled:opacity-50"
                >
                  <ButtonLabel swapKey={loading ? "sending" : "idle"}>
                    {loading ? "Sending..." : "Send Message"}
                  </ButtonLabel>
                </button>
                <FieldMessage className="mt-4 text-xs leading-relaxed text-[var(--text-secondary)]">
                  {submitError}
                </FieldMessage>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Contact;
