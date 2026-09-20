import { Link } from "react-router-dom";
import SEO from "@/shared/components/SEO";
import SplitHeadline from "@/shared/components/SplitHeadline";
import ArrowFillLink from "@/shared/ui/arrow-fill-link";
import MotionReveal, { MotionRevealItem } from "@/shared/motion/MotionReveal";
import { STAGGER } from "@/shared/motion/tokens";
import DataFlow from "@/features/security/DataFlow";
import {
  ALL_ITEMS,
  LAST_REVIEWED,
  RISK_BANDS,
  RISK_MODEL_RULE,
  SECTIONS,
  SECURITY_CONTACTS,
  STATUS_META,
  countBy,
  type PostureItem,
  type Status,
} from "@/features/security/entities/posture";

/**
 * ── SECURITY AND TRUST ────────────────────────────────────────────────
 *
 * The quietest page on the site, deliberately. No orb, no beam, no canvas, no
 * WebGL, no shields and no padlocks. A security page that performs security is
 * a security page a reviewer stops believing, and every flourish here would be
 * decorating claims that are mostly "not established".
 *
 * WHAT MAKES THIS PAGE UNUSUAL: most of it says no. That is the point. The
 * site is a static marketing site with two edge functions and no database, so
 * the honest posture is a short list of real controls and a long list of
 * things we will not assert. A reviewer reads an absent topic as evasion, so
 * every topic is present and carries its status, including the ones where the
 * status is that we hold no evidence.
 *
 * THE RULE, enforced in the entity file rather than trusted here: anything
 * marked Implemented carries a source a reviewer could check. See
 * features/security/entities/posture.ts, which throws in development if that
 * invariant is ever broken.
 *
 * Do not add: a certification logo, a tick, a green mark, a percentage, a
 * "bank-grade" or "military-grade" anything, or the security@ alias, which
 * does not exist and would send reports into a void.
 */

/**
 * The status chip.
 *
 * Exactly one status is filled: Implemented. Everything else is an outline in
 * muted ink, so nothing unverified can read as a confirmation at a glance, and
 * In progress cannot be mistaken for done. There is no tick anywhere in this
 * system, which is a decision rather than an omission: a tick is the most
 * over-read mark on a security page and it survives being skimmed in a way
 * that a word does not.
 */
function StatusChip({ status }: { status: Status }) {
  const meta = STATUS_META[status];
  return (
    <span
      className={`inline-block shrink-0 whitespace-nowrap rounded-full border px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.18em] ${
        meta.solid
          ? "border-[var(--text-primary)] bg-[var(--text-primary)] text-[var(--background)]"
          : "border-[var(--border-strong)] text-[var(--text-secondary)]"
      }`}
    >
      {meta.label}
    </span>
  );
}

/** One control row: topic, status, the honest answer, and where it is checkable. */
function Row({ item }: { item: PostureItem }) {
  return (
    <div className="border-t border-[var(--border)] py-5">
      <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-2">
        {/* h4: an item sits UNDER its section's h3, which sits under the
            page-level h2. Both were h3 first, which made every statement a
            sibling of the section that contains it and flattened the outline a
            screen reader builds for a page that is almost entirely outline. */}
        <h4 className="max-w-lg font-semibold text-[var(--text-primary)]">
          {item.topic}
        </h4>
        <StatusChip status={item.status} />
      </div>
      <p className="mt-2.5 max-w-2xl leading-relaxed text-[var(--text-secondary)]">
        {item.detail}
      </p>
      {item.source && (
        <p className="mt-2.5 max-w-2xl font-mono text-[10px] uppercase leading-relaxed tracking-[0.18em] text-[var(--text-muted)]">
          Checkable at: {item.source}
        </p>
      )}
    </div>
  );
}

export default function Security() {
  const implemented = countBy("implemented");
  const notEstablished = countBy("not-established");

  return (
    <div className="relative">
      <SEO
        title="Security and Trust"
        description="What is actually in place on ziiro.work, what is not, and how engagement controls scale with the data involved. Written to survive a security questionnaire rather than to pass a skim."
        canonical="/security"
      />

      {/* ── Hero ── */}
      <header className="pt-32 pb-12">
        <div className="mx-auto max-w-7xl px-6 md:px-10">
          <MotionReveal stagger={STAGGER.line}>
            <MotionRevealItem>
              <p className="flex items-center gap-3 font-mono text-[11px] font-bold uppercase tracking-[0.25em] text-[var(--text-secondary)]">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-[var(--text-primary)] opacity-70" />
                ( Ziiro / Security )
              </p>
            </MotionRevealItem>

            <MotionRevealItem>
              <h1
                className="mt-8 font-display font-semibold text-[var(--text-primary)]"
                style={{
                  fontSize: "clamp(2.3rem, 4.6vw, 3.7rem)",
                  letterSpacing: "-0.03em",
                  lineHeight: 1.05,
                }}
              >
                <SplitHeadline
                  lead="Security and Trust."
                  tail="Your systems are only useful if your data can be trusted with them."
                />
              </h1>
            </MotionRevealItem>

            <MotionRevealItem>
              <p className="mt-6 max-w-2xl leading-relaxed text-[var(--text-secondary)]">
                We design around controlled access, data minimisation, secure
                infrastructure, traceability and clear ownership. What follows
                is which of those is in place today and which is not, stated
                plainly enough to survive a security questionnaire.
              </p>
            </MotionRevealItem>
          </MotionReveal>
        </div>
      </header>

      {/* ── How to read this page ──
          Ahead of everything, because the page is mostly negative space and a
          reviewer who does not know why will read it as an unfinished draft
          rather than as a deliberately narrow set of claims. */}
      <section aria-labelledby="how-to-read" className="pb-16">
        <div className="mx-auto max-w-7xl px-6 md:px-10">
          <MotionReveal>
            <div className="border-t border-[var(--border)] pt-6">
              <h2
                id="how-to-read"
                className="font-mono text-[11px] font-bold uppercase tracking-[0.25em] text-[var(--text-secondary)]"
              >
                ( How to read this page )
              </h2>
              <div className="mt-6 grid gap-8 md:grid-cols-2">
                <p className="max-w-lg leading-relaxed text-[var(--text-secondary)]">
                  ziiro.work is a static site with two edge functions, no
                  database, no accounts and no payments. That sets a real
                  ceiling on what can honestly be claimed, so{" "}
                  <span className="text-[var(--text-primary)]">
                    {implemented} statements below are marked Implemented and
                    carry a source you can check yourself
                  </span>
                  , and {notEstablished} are marked Not established, meaning we
                  hold no evidence either way and will not assert one.
                </p>
                <p className="max-w-lg leading-relaxed text-[var(--text-secondary)]">
                  Nothing here carries a tick, a certification badge or a
                  percentage. A topic we cannot answer is shown with that
                  answer rather than left out, because an absent topic reads as
                  evasion to anyone doing this properly. If a line matters to
                  your decision, ask and we will answer it directly.
                </p>
              </div>

              {/* The legend. Implemented is the only filled chip on the page. */}
              <dl className="mt-10 flex flex-wrap gap-x-8 gap-y-4">
                {(Object.keys(STATUS_META) as Status[]).map((s) => (
                  <div key={s} className="flex items-center gap-3">
                    <dt className="sr-only">{STATUS_META[s].label}</dt>
                    <StatusChip status={s} />
                    <dd className="max-w-[22ch] text-xs leading-relaxed text-[var(--text-muted)]">
                      {STATUS_META[s].note}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          </MotionReveal>
        </div>
      </section>

      {/* ── The risk model ──
          The page's real argument. Ziiro's clients are not one industry, so a
          single blanket posture would overstate for most engagements and
          understate for a few. What is published is the model, not a policy
          dressed as one. */}
      <section aria-labelledby="risk-model" className="pb-16">
        <div className="mx-auto max-w-7xl px-6 md:px-10">
          <MotionReveal>
            <div className="border-t border-[var(--border)] pt-6">
              <h2
                id="risk-model"
                className="font-mono text-[11px] font-bold uppercase tracking-[0.25em] text-[var(--text-secondary)]"
              >
                ( Controls scale with the data )
              </h2>
              <p className="mt-8 max-w-3xl font-display text-xl font-medium leading-snug text-[var(--text-primary)] md:text-2xl">
                {RISK_MODEL_RULE}
              </p>
              <p className="mt-6 max-w-2xl leading-relaxed text-[var(--text-secondary)]">
                Our clients are engineers, designers, law firms and every other
                kind of business. A law firm brings privilege, a design studio
                brings unreleased work, an engineering team brings source code
                and production credentials. One posture stated for all of them
                would be wrong for nearly all of them, so this is the shape of
                the conversation instead.
              </p>

              <div className="mt-12 border-t border-[var(--border)]">
                {RISK_BANDS.map((band, i) => (
                  <div
                    key={band.data}
                    className="grid grid-cols-12 gap-x-4 gap-y-3 border-b border-[var(--border)] py-6"
                  >
                    <span className="col-span-2 font-mono text-[11px] tracking-[0.2em] text-[var(--text-muted)] md:col-span-1">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <div className="col-span-10 md:col-span-4">
                      <h3 className="font-semibold text-[var(--text-primary)]">
                        {band.data}
                      </h3>
                      <p className="mt-2 text-sm leading-relaxed text-[var(--text-muted)]">
                        {band.examples}
                      </p>
                    </div>
                    <p className="col-span-12 leading-relaxed text-[var(--text-secondary)] md:col-span-6 md:col-start-7">
                      {band.position}
                    </p>
                  </div>
                ))}
              </div>

              <p className="mt-8 max-w-2xl text-sm leading-relaxed text-[var(--text-muted)]">
                These are not certified tiers and they are not published control
                checklists. They describe how the scope of an engagement is
                decided. The controls that actually apply to your work are
                written into that engagement's contract, which is the only place
                a commitment of this kind means anything.
              </p>
            </div>
          </MotionReveal>
        </div>
      </section>

      {/* ── The data flow, the centre of the page ── */}
      <section aria-labelledby="data-flow" className="pb-16">
        <div className="mx-auto max-w-7xl px-6 md:px-10">
          <MotionReveal>
            <div className="border-t border-[var(--border)] pt-6">
              <h2
                id="data-flow"
                className="font-mono text-[11px] font-bold uppercase tracking-[0.25em] text-[var(--text-secondary)]"
              >
                ( Where data actually goes )
              </h2>
              <div className="mt-8 grid gap-10 md:grid-cols-2 md:gap-16">
                <div>
                  <p className="max-w-lg leading-relaxed text-[var(--text-secondary)]">
                    Two paths exist on this site and this is both of them. A
                    contact submission is forwarded to a team mailbox and no
                    copy is kept. A country code is read off a request header so
                    the right rate is shown, and nothing is stored.
                  </p>
                  <p className="mt-6 max-w-lg leading-relaxed text-[var(--text-secondary)]">
                    There is no third path. No database sits behind either one,
                    no account exists to attach anything to, and no part of this
                    site sends what you type to a model. The diagram is small
                    because the system is.
                  </p>
                  <p className="mt-6 max-w-lg text-sm leading-relaxed text-[var(--text-muted)]">
                    This draws the website, not an engagement. What an
                    engagement's architecture looks like is decided per contract,
                    and drawing one here would show a system nobody has audited
                    as though it were running.
                  </p>
                </div>
                <DataFlow />
              </div>
            </div>
          </MotionReveal>
        </div>
      </section>

      {/* ── The ten sections ──
          Native <details>, so every answer stays in the prerendered HTML for a
          crawler and a screen reader whether or not a row is open. The first
          section renders open, so the page proves it has substance without
          asking to be clicked. */}
      <section aria-labelledby="posture" className="pb-16">
        <div className="mx-auto max-w-7xl px-6 md:px-10">
          <MotionReveal>
            <div className="flex items-center justify-between gap-4 border-t border-[var(--border)] pt-6">
              <h2
                id="posture"
                className="font-mono text-[11px] font-bold uppercase tracking-[0.25em] text-[var(--text-secondary)]"
              >
                ( The detail )
              </h2>
              <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-[var(--text-muted)]">
                [ {String(SECTIONS.length).padStart(2, "0")} sections /{" "}
                {ALL_ITEMS.length} statements ]
              </p>
            </div>
          </MotionReveal>

          <div className="mt-10">
            {SECTIONS.map((section, i) => (
              <details
                key={section.id}
                id={section.id}
                open={i === 0}
                className="group border-b border-[var(--border)]"
              >
                <summary className="cursor-pointer list-none py-6 [&::-webkit-details-marker]:hidden">
                  <div className="flex items-baseline gap-4 group-hover:text-[var(--text-secondary)]">
                    <span className="font-mono text-[11px] font-bold tracking-[0.2em] text-[var(--accent)]">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <h3
                      className="flex-1 font-display font-semibold text-[var(--text-primary)]"
                      style={{ fontSize: "clamp(1.2rem, 2vw, 1.5rem)", letterSpacing: "-0.02em" }}
                    >
                      {section.title}
                    </h3>
                    <span className="hidden font-mono text-[10px] uppercase tracking-[0.25em] text-[var(--text-muted)] sm:block">
                      {String(section.items.length).padStart(2, "0")}
                    </span>
                    <span
                      aria-hidden="true"
                      className="font-mono text-[13px] leading-none text-[var(--text-muted)] group-open:rotate-45"
                    >
                      +
                    </span>
                  </div>
                  <p className="mt-3 max-w-2xl pl-[2.1rem] leading-relaxed text-[var(--text-secondary)]">
                    {section.lead}
                  </p>
                </summary>
                <div className="pb-8 pl-[2.1rem] pr-2">
                  {section.items.map((item) => (
                    <Row key={item.topic} item={item} />
                  ))}
                </div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ── Resources, the request path, and the review date ── */}
      <section aria-labelledby="resources" className="pb-28">
        <div className="mx-auto max-w-7xl px-6 md:px-10">
          <MotionReveal stagger={STAGGER.card}>
            <MotionRevealItem>
              <h2
                id="resources"
                className="border-t border-[var(--border)] pt-6 font-mono text-[11px] font-bold uppercase tracking-[0.25em] text-[var(--text-secondary)]"
              >
                ( Asking us something )
              </h2>
            </MotionRevealItem>

            <MotionRevealItem>
              <div className="mt-8 grid gap-10 md:grid-cols-2 md:gap-16">
                <div>
                  <h3 className="font-semibold text-[var(--text-primary)]">
                    A questionnaire, a DPA, a BAA, or subprocessor detail
                  </h3>
                  <p className="mt-3 max-w-lg leading-relaxed text-[var(--text-secondary)]">
                    Email either address below with what you need and the
                    deadline you are working to. We will answer question by
                    question, and where the answer is that something is not in
                    place we will say so rather than leaving a blank. That is
                    faster for you than a document that has to be corrected
                    later.
                  </p>
                  <ul className="mt-6 flex flex-col gap-2">
                    {SECURITY_CONTACTS.map((email) => (
                      <li key={email}>
                        <a
                          href={`mailto:${email}`}
                          className="inline-flex min-h-[44px] items-center font-mono text-sm tracking-wide text-[var(--text-primary)] underline decoration-[color:var(--border-strong)] underline-offset-4 transition-opacity hover:opacity-70"
                        >
                          {email}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h3 className="font-semibold text-[var(--text-primary)]">
                    Reporting a vulnerability
                  </h3>
                  <p className="mt-3 max-w-lg leading-relaxed text-[var(--text-secondary)]">
                    Private vulnerability reporting is enabled on our
                    repository, and the published security policy sets out what
                    is in scope and what to expect. Either address above also
                    reaches a person directly.
                  </p>
                  <p className="mt-6 max-w-lg text-sm leading-relaxed text-[var(--text-muted)]">
                    Please do not test against live systems in ways that could
                    affect availability or reach anyone else's data.
                  </p>
                  <div className="mt-6 flex flex-wrap gap-x-8 gap-y-3">
                    <ArrowFillLink to="/privacy">Privacy Policy</ArrowFillLink>
                    <ArrowFillLink to="/terms">Terms</ArrowFillLink>
                  </div>
                </div>
              </div>
            </MotionRevealItem>

            <MotionRevealItem>
              <div className="mt-16 border-t border-[var(--border)] pt-6">
                <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-[var(--text-muted)]">
                  [ Last reviewed {LAST_REVIEWED.date} ]
                </p>
                <p className="mt-3 max-w-2xl text-sm leading-relaxed text-[var(--text-muted)]">
                  {LAST_REVIEWED.scope} This date moves when a person re-checks
                  those things, not when the site is rebuilt, so it means
                  something specific. If it has aged past your comfort, ask and
                  we will re-verify rather than tell you it is still current.
                </p>
              </div>
            </MotionRevealItem>
          </MotionReveal>
        </div>
      </section>

      {/* A plain link rather than a CTA band. This page is not selling. */}
      <section className="pb-24">
        <div className="mx-auto max-w-7xl px-6 md:px-10">
          <p className="text-sm text-[var(--text-secondary)]">
            Evaluating us for work that touches sensitive data?{" "}
            <Link
              to="/contact"
              className="text-[var(--text-primary)] underline underline-offset-4 transition-opacity hover:opacity-70"
            >
              Start with a conversation
            </Link>{" "}
            and bring the questions this page did not answer.
          </p>
        </div>
      </section>
    </div>
  );
}
