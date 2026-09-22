import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { createAnimatable, createTimeline, cubicBezier } from "animejs";
import SEO from "@/shared/components/SEO";
import { CONTACT_EMAIL } from "@/shared/lib/contact";
import SplitHeadline from "@/shared/components/SplitHeadline";
import { CSS_EASE, DURATION, EASE_OUT_EXPO, MS, STAGGER, TRAVEL } from "@/shared/motion/tokens";

/**
 * Contact: general communication with Ziiro, and nothing else.
 *
 * WHAT THIS PAGE IS NOT, because it used to be all of it. Until this rewrite
 * /contact was the booking page: a regional hourly rate, a Calendly button, a
 * three-item "you leave with" list, a beam around the card and an ambient orb.
 * Every one of those is commercial conversion and now belongs to /book-a-call.
 * Keeping a second copy here would mean two pages competing for the same
 * visitor, which is the exact thing this split exists to stop.
 *
 * So this page answers one question: I have something to ask Ziiro. It is a
 * form, one email address and a response expectation. That is the whole page,
 * and the restraint is the design rather than a gap in it.
 *
 * NO ORB, NO SHADER, NO CANVAS, and no decorative motion. The only movement is
 * the site's standard entrance, which carries hierarchy rather than filling
 * space, and it zeroes out under reduced motion like everything else.
 *
 * NOTHING HERE MAY MENTION LOCATION. The old page printed the visitor's region
 * above the rate, and the rate itself came from an IP lookup. Both are gone
 * with the commercial block. If regional logic is ever needed on this page it
 * stays invisible: never tell a visitor their location was identified.
 */

/** The house expo-out, built from the token control points rather than retyped. */
const expoOut = cubicBezier(...EASE_OUT_EXPO);

const RISE_STAGGER_MS = Math.round(STAGGER.card * 1000);

/** One address now, kept as an array because the hover animation below is
 *  built by index off the rendered [data-email-link] nodes. */
const emails = [CONTACT_EMAIL];

/**
 * Why someone is writing. Exactly the six from the brief, in that order, and
 * the value sent to the server is the label: the team inbox reads a word, not
 * a code, and a select cannot submit anything that is not in this list.
 */
const REASONS = [
  "Project inquiry",
  "Partnership",
  "Existing client",
  "Press / Media",
  "General question",
  "Other",
];

/** POST target. Body is { name, email, company, reason, message,
 *  turnstileToken } as JSON, answered with { success: boolean, error?: string }. */
const ENDPOINT = "/api/send-contact";

/**
 * Cloudflare Turnstile, the bot check the restored endpoint requires.
 *
 * The endpoint fails closed: no valid token means no mail, so without this the
 * form could not succeed at all. The secret half lives on the server as
 * TURNSTILE_SECRET_KEY; this is the public half and it is safe in the bundle.
 *
 * THE HUMAN MUST SET `VITE_TURNSTILE_SITE_KEY` in Vercel for the form to work
 * in production. It is read at build time, not at runtime, so setting it
 * requires a redeploy. When it is absent, as it is in local development, the
 * widget does not render, no third-party script is fetched, and a submission
 * fails the server's check and lands in the error state with the email
 * addresses beside it. That is deliberate: a contact form that silently
 * pretends to send is worse than one that says it could not.
 */
const SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY as string | undefined;
const TURNSTILE_SRC =
  "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

interface TurnstileApi {
  render: (el: HTMLElement, opts: Record<string, unknown>) => string;
  reset: (id?: string) => void;
  remove: (id?: string) => void;
}

type Status = "idle" | "sending" | "sent" | "error";

/** One field's chrome. A hairline under the control and nothing else: the
 *  brief asks for thin borders and no unnecessary cards, and a boxed input on
 *  a page this quiet reads as a form from a different site. */
const field =
  "w-full border-b border-[var(--border)] bg-transparent py-3 text-[15px] text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)] hover:border-[var(--border-strong)] focus:border-[var(--text-primary)]";

const fieldLabel =
  "block font-mono text-[10px] uppercase tracking-[0.25em] text-[var(--text-secondary)]";

const Contact = () => {
  const rootRef = useRef<HTMLDivElement>(null);
  const emailAnims = useRef<ReturnType<typeof createAnimatable>[]>([]);
  const reduced = useRef(false);

  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);

  /** The Turnstile token, and the widget id so it can be reset. A token is
   *  single use, so a second message needs a fresh one. */
  const [token, setToken] = useState("");
  const widgetHost = useRef<HTMLDivElement>(null);
  const widgetId = useRef<string | null>(null);

  // Load the Turnstile script and render the widget, but only when a site key
  // is configured. No key means no third-party request from this page at all,
  // which is why this is not in index.html: the quietest page on the site
  // should not fetch Cloudflare for a visitor who is only reading it.
  useEffect(() => {
    if (!SITE_KEY) return;
    const host = widgetHost.current;
    if (!host) return;
    let cancelled = false;

    const render = () => {
      const api = (window as unknown as { turnstile?: TurnstileApi }).turnstile;
      if (cancelled || !api || widgetId.current) return;
      widgetId.current = api.render(host, {
        sitekey: SITE_KEY,
        theme: "light",
        callback: (t: string) => setToken(t),
        // A token expires. Clearing it here means the next submit fails the
        // server check honestly rather than sending something already stale.
        "expired-callback": () => setToken(""),
        "error-callback": () => setToken(""),
      });
    };

    let script = document.querySelector<HTMLScriptElement>(
      `script[src="${TURNSTILE_SRC}"]`,
    );
    if (!script) {
      script = document.createElement("script");
      script.src = TURNSTILE_SRC;
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);
    }
    script.addEventListener("load", render);
    // Already loaded from a previous visit to this route in the same session.
    render();

    return () => {
      cancelled = true;
      script?.removeEventListener("load", render);
      const api = (window as unknown as { turnstile?: TurnstileApi }).turnstile;
      if (api && widgetId.current) api.remove(widgetId.current);
      widgetId.current = null;
    };
  }, []);

  // Sequenced entrance: label, headline, sub, then the form and the aside.
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
    return () => {
      tl.revert();
    };
  }, []);

  // The direct addresses nudge on hover, the same as they did before. It is
  // the one micro-interaction kept from the old page, because it marks the
  // addresses as actions rather than as text.
  useEffect(() => {
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
  }, []);

  /**
   * Submit. The fetch lives here rather than anywhere near render, because the
   * page is prerendered at build time and a render body must not touch the
   * network or the browser.
   *
   * The endpoint is being restored and hardened by another worker in parallel,
   * so it may legitimately 404 for a window. That is handled the same as any
   * other failure: the form says so and the email address is sitting
   * directly beside it, unaffected, so the page is never a dead end.
   */
  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (status === "sending") return;
    const form = e.currentTarget;
    const data = new FormData(form);
    setStatus("sending");
    setError(null);

    try {
      const res = await fetch(ENDPOINT, {
        method: "POST",
        // Required, and not incidental: the endpoint rejects anything else on
        // purpose. A JSON body sent as text/plain is a CORS-simple request
        // that skips preflight, which is how another site could make its own
        // visitors send mail from their addresses.
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: data.get("name"),
          email: data.get("email"),
          company: data.get("company"),
          reason: data.get("reason"),
          message: data.get("message"),
          turnstileToken: token,
        }),
      });
      const body = (await res.json().catch(() => null)) as
        | { success?: boolean; error?: string }
        | null;
      if (!res.ok || !body?.success) {
        throw new Error(body?.error || "That did not send.");
      }
      setStatus("sent");
      form.reset();
      // Single-use token: without this a second message reuses a spent one
      // and the server correctly refuses it.
      const api = (window as unknown as { turnstile?: TurnstileApi }).turnstile;
      if (api && widgetId.current) api.reset(widgetId.current);
      setToken("");
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "That did not send.");
    }
  };

  return (
    <div ref={rootRef} className="relative" style={{ zIndex: 1 }}>
      <SEO
        title="Contact Ziiro"
        description="Ask a question, propose a partnership, or send us something to look at. We usually reply within 24 hours. To explore working together, book a call instead."
        canonical="/contact"
      />

      <div className="mx-auto max-w-7xl px-6 md:px-10">
        {/* ─── Hero ───
            Short, and deliberately not a statement of philosophy. Mission owns
            why Ziiro works the way it does; this page owns "send it over". */}
        <header className="border-b border-[var(--border)] pb-14 clears-nav-page">
          <p
            data-rise
            data-reveal
            className="flex items-center gap-3 font-mono text-[11px] font-bold uppercase tracking-[0.25em] text-[var(--text-secondary)]"
            style={{ opacity: 0 }}
          >
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-[var(--text-primary)] opacity-70" />
            {"( ZIIRO / CONTACT )"}
          </p>
          <h1
            data-rise
            data-reveal
            className="mt-10 font-display font-semibold text-[var(--text-primary)]"
            style={{
              fontSize: "clamp(2.6rem, 6vw, 4.8rem)",
              letterSpacing: "-0.03em",
              lineHeight: 1.04,
              opacity: 0,
            }}
          >
            <SplitHeadline lead="Contact Ziiro." tail="Send it over." />
          </h1>
          <p
            data-rise
            data-reveal
            className="mt-6 max-w-xl leading-relaxed text-[var(--text-secondary)]"
            style={{ opacity: 0 }}
          >
            Have a question, partnership idea, or something you want us to look at?
          </p>
        </header>

        <div className="grid grid-cols-1 gap-14 pb-28 pt-14 lg:grid-cols-12 lg:gap-16">
          {/* ─── The form ───
              A real <form> with real labels, so the prerendered HTML a crawler
              or a reader without JavaScript receives is the actual form rather
              than an empty shell. */}
          <section
            data-rise
            data-reveal
            aria-labelledby="form-heading"
            className="lg:col-span-7"
            style={{ opacity: 0 }}
          >
            <h2 id="form-heading" className="sr-only">
              Send a message
            </h2>

            <form onSubmit={onSubmit}>
              <div className="grid grid-cols-1 gap-x-10 gap-y-8 sm:grid-cols-2">
                <div>
                  <label className={fieldLabel} htmlFor="name">
                    Name
                  </label>
                  <input
                    id="name"
                    name="name"
                    type="text"
                    required
                    autoComplete="name"
                    maxLength={100}
                    className={field}
                    style={{ transitionProperty: "border-color", transitionDuration: `${DURATION.micro}s`, transitionTimingFunction: CSS_EASE.out }}
                  />
                </div>

                <div>
                  <label className={fieldLabel} htmlFor="email">
                    Work email
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    required
                    autoComplete="email"
                    maxLength={254}
                    className={field}
                    style={{ transitionProperty: "border-color", transitionDuration: `${DURATION.micro}s`, transitionTimingFunction: CSS_EASE.out }}
                  />
                </div>

                <div>
                  {/* REQUIRED, matching the server, not because I think it
                      should be. The restored endpoint rejects a submission
                      with no company, so a form that let it through would 400
                      on the visitor. I argued in requests.md that it should be
                      optional, since "Press / Media" and "General question"
                      are two of the six reasons below and neither implies a
                      company; if that lands, drop `required` here and restore
                      the optional hint. Marking it required is the version
                      that works today. */}
                  <label className={fieldLabel} htmlFor="company">
                    Company
                  </label>
                  <input
                    id="company"
                    name="company"
                    type="text"
                    required
                    autoComplete="organization"
                    maxLength={120}
                    className={field}
                    style={{ transitionProperty: "border-color", transitionDuration: `${DURATION.micro}s`, transitionTimingFunction: CSS_EASE.out }}
                  />
                </div>

                <div>
                  <label className={fieldLabel} htmlFor="reason">
                    Reason for reaching out
                  </label>
                  {/* The native select. A custom listbox here would be a
                      component to maintain, a keyboard model to reimplement and
                      a thing that does not render without JavaScript, for six
                      fixed options on the quietest page on the site. */}
                  <select
                    id="reason"
                    name="reason"
                    defaultValue={REASONS[0]}
                    className={`${field} cursor-pointer appearance-none rounded-none`}
                    style={{ transitionProperty: "border-color", transitionDuration: `${DURATION.micro}s`, transitionTimingFunction: CSS_EASE.out }}
                  >
                    {REASONS.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="mt-8">
                <label className={fieldLabel} htmlFor="message">
                  Message
                </label>
                <textarea
                  id="message"
                  name="message"
                  required
                  rows={5}
                  maxLength={2000}
                  className={`${field} resize-y`}
                  style={{ transitionProperty: "border-color", transitionDuration: `${DURATION.micro}s`, transitionTimingFunction: CSS_EASE.out }}
                />
              </div>

              {/* The bot check. Empty and invisible when no site key is
                  configured, so nothing shifts and nothing is fetched. */}
              <div ref={widgetHost} className="mt-8 empty:mt-0" />

              <div className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-4">
                {/* THE LABEL SWAPS BUT THE BUTTON DOES NOT RESIZE.
                    "Sending" is shorter than "Send message", and this button
                    sizes to its content, so swapping the text used to shrink
                    the primary control at the exact moment it was clicked.
                    Review item 20 names an inserted loading state as one of
                    the things that may never make the interface jump.

                    Both labels are stacked in the same grid cell, so the
                    button is always as wide as the longest of them and the
                    swap is opacity alone. This also survives either label
                    being reworded later, which a min-width would not. The
                    hidden one is taken out of the accessibility tree so the
                    name is whichever is actually showing. */}
                <button
                  type="submit"
                  disabled={status === "sending"}
                  className="rounded-full bg-[var(--text-primary)] px-8 py-4 font-mono text-xs font-semibold uppercase tracking-wide text-[var(--background)] hover:opacity-90 disabled:opacity-60"
                  style={{ transitionProperty: "opacity", transitionDuration: `${DURATION.micro}s`, transitionTimingFunction: CSS_EASE.out }}
                >
                  <span className="grid place-items-center">
                    <span
                      style={{ gridArea: "1 / 1", opacity: status === "sending" ? 0 : 1 }}
                      aria-hidden={status === "sending"}
                    >
                      Send message
                    </span>
                    <span
                      style={{ gridArea: "1 / 1", opacity: status === "sending" ? 1 : 0 }}
                      aria-hidden={status !== "sending"}
                    >
                      Sending
                    </span>
                  </span>
                </button>

                {/* One live region for the whole form, polite, so a screen
                    reader hears the outcome once rather than on every keypress.
                    It holds nothing at rest, so it announces nothing at rest. */}
                <p
                  role="status"
                  aria-live="polite"
                  className="text-sm leading-relaxed text-[var(--text-secondary)]"
                >
                  {status === "sent" && "Sent. We'll reply to the address you gave us."}
                  {status === "error" &&
                    `${error} You can email us directly instead, below.`}
                </p>
              </div>
            </form>
          </section>

          {/* ─── Secondary: the direct addresses ───
              Beside the form from lg up and under it below, so on a phone the
              form is what the reader meets first. Deliberately quieter than
              the form: smaller type, no button, no card. */}
          <aside
            data-rise
            data-reveal
            aria-labelledby="direct-heading"
            className="lg:col-span-4 lg:col-start-9"
            style={{ opacity: 0 }}
          >
            <h2
              id="direct-heading"
              className="font-mono text-[10px] uppercase tracking-[0.25em] text-[var(--text-secondary)]"
            >
              Prefer email?
            </h2>
            <div className="mt-5 flex flex-col">
              {emails.map((email, i) => (
                <a
                  key={email}
                  data-email-link
                  href={`mailto:${email}`}
                  onMouseEnter={() => emailAnims.current[i]?.x(TRAVEL.nudge)}
                  onMouseLeave={() => emailAnims.current[i]?.x(0)}
                  className="flex min-h-[44px] w-fit items-center font-mono text-sm tracking-wide text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                  style={{
                    transitionProperty: "color",
                    transitionDuration: `${DURATION.micro}s`,
                    transitionTimingFunction: CSS_EASE.out,
                  }}
                >
                  {email}
                </a>
              ))}
            </div>
            <p className="mt-5 font-mono text-[10px] uppercase tracking-[0.25em] text-[var(--text-muted)]">
              Usually within 24 hours
            </p>

            {/* The one pointer to the other page. Someone who wants a session
                rather than an answer should not be filling in this form, and
                this is the only place the two pages touch. */}
            <p className="mt-12 border-t border-[var(--border)] pt-8 text-sm leading-relaxed text-[var(--text-secondary)]">
              Looking to explore working together?{" "}
              <Link
                to="/book-a-call"
                className="border-b border-[var(--border-strong)] pb-0.5 text-[var(--text-primary)] hover:border-[var(--text-primary)]"
                style={{
                  transitionProperty: "border-color",
                  transitionDuration: `${DURATION.micro}s`,
                  transitionTimingFunction: CSS_EASE.out,
                }}
              >
                Book a call
              </Link>{" "}
              instead.
            </p>
          </aside>
        </div>
      </div>
    </div>
  );
};

export default Contact;
