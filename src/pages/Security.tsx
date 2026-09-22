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
  STATUS_META,
  countBy,
  type PostureItem,
  type Status,
} from "@/features/security/entities/posture";
import { CONTACT_EMAIL, mailto } from "@/shared/lib/contact";

/**
 * ── SECURITY AND TRUST ────────────────────────────────────────────────
 *
 * The quietest page on the site, deliberately. No orb, no beam, no canvas, no
 * WebGL, no shields and no padlocks. A security page that performs security is
 * a security page a reviewer stops believing, and every flourish here would be
 * decorating claims that are mostly "not established".
 *
 * ITS SUBJECT, after a correction that changed it: the systems Ziiro builds
 * FOR CLIENTS, not ziiro.work. This page used to describe response headers,
 * static analysis and the contact endpoint, which is the security of a
 * brochure. A CTO evaluating us cares what happens to their data inside a
 * system we build and operate. The website material was not too long, it was
 * the wrong subject, and it is gone rather than shortened.
 *
 * THE TENSE IS THE HONESTY. Every statement is either how a system IS
 * DESIGNED or what is AGREED PER ENGAGEMENT. Neither is a certification we do
 * not hold, and neither is a present-tense claim about a fleet of running
 * environments nobody can show you. If a sentence here starts wanting to say
 * "all our systems do X", the status is wrong rather than the wording.
 *
 * THE RULE, enforced in the entity file rather than trusted here: anything
 * marked Implemented carries a source a reviewer could check. Nothing on this
 * page currently claims it, and the legend prints that count so the absence is
 * stated rather than left to be noticed. See
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
      {/* Conditions sit directly under the offer they qualify, never in a
          subsection elsewhere. For the BAA in particular, the conditions are
          what make the offer credible to a buyer who knows what one obliges;
          an unconditional version would be the overstatement this page exists
          to avoid. */}
      {item.conditions && (
        <div className="mt-4 max-w-2xl border-l border-[var(--border-strong)] pl-5">
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--text-muted)]">
            Conditions
          </p>
          <ul className="mt-2.5 space-y-2">
            {item.conditions.map((c) => (
              <li
                key={c}
                className="text-sm leading-relaxed text-[var(--text-secondary)]"
              >
                {c}
              </li>
            ))}
          </ul>
        </div>
      )}
      {item.source && (
        <p className="mt-2.5 max-w-2xl font-mono text-[10px] uppercase leading-relaxed tracking-[0.18em] text-[var(--text-muted)]">
          Checkable at: {item.source}
        </p>
      )}
    </div>
  );
}

export default function Security() {
  const design = countBy("design");
  const notEstablished = countBy("not-established");

  return (
    <div className="relative">
      <SEO
        title="Security and Trust"
        description="How Ziiro designs, builds and runs systems that handle client data: model security, agent permissions, isolation between clients, and what is agreed before regulated work starts. Written as engineering practice, not as certifications we do not hold."
        canonical="/security"
      />

      {/* ── Hero ── */}
      <header className="clears-nav-page [--nav-clear:8rem] pb-12">
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
                infrastructure, traceability and clear ownership. This page is
                about the systems we build for you, not about this website, and
                it is written in the tense that can be kept: how systems are
                designed, and what is agreed before work starts.
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
                  There are three kinds of security statement, and only one of
                  them is honest here. A certification claim needs an issuing
                  body, and we hold none. A present-tense claim about every
                  running environment needs a fleet nobody can show you. What
                  is left is{" "}
                  <span className="text-[var(--text-primary)]">
                    how systems are designed and what is agreed per engagement
                  </span>
                  , which is checkable when you engage us. {design} statements
                  below are written that way.
                </p>
                <p className="max-w-lg leading-relaxed text-[var(--text-secondary)]">
                  {notEstablished} more are marked Not established, meaning we
                  hold no evidence either way and will not assert one.{" "}
                  <span className="text-[var(--text-primary)]">
                    Nothing on this page is marked Implemented
                  </span>
                  , because that status is reserved for something you could
                  verify today without engaging us, and an architecture is
                  verified inside an engagement rather than on a web page.
                  Nothing carries a tick or a badge.
                </p>
              </div>

              {/* The legend, with a count beside each status.
                  The count is the honest part: it makes an unused status
                  visibly zero instead of leaving a reader to assume the page
                  is full of them. Implemented reads 0, which is the single
                  most useful number on the page. */}
              <dl className="mt-10 grid gap-x-10 gap-y-5 sm:grid-cols-2 lg:grid-cols-4">
                {(Object.keys(STATUS_META) as Status[]).map((s) => (
                  <div key={s} className="flex items-start gap-3">
                    <dt className="sr-only">{STATUS_META[s].label}</dt>
                    <StatusChip status={s} />
                    {/* 13px at phone width. These eight notes are what the
                        status words actually mean, so on a due-diligence page
                        they are load-bearing prose, not a caption. */}
                    <dd className="text-[13px] leading-relaxed text-[var(--text-muted)] md:text-xs">
                      <span className="font-mono text-[var(--text-secondary)]">
                        {String(countBy(s)).padStart(2, "0")}
                      </span>{" "}
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
                ( How client data moves )
              </h2>
              <div className="mt-8 grid gap-10 md:grid-cols-2 md:gap-16">
                <div>
                  <p className="max-w-lg leading-relaxed text-[var(--text-secondary)]">
                    The shape of every system we build. Data is minimised and
                    redacted before it goes anywhere, the action is checked
                    against what the agent is scoped to do, and only then does
                    anything reach a model. What comes back is validated by
                    ordinary code, and by a person where the action is
                    irreversible or externally visible.
                  </p>
                  <p className="mt-6 max-w-lg leading-relaxed text-[var(--text-secondary)]">
                    The point of drawing it this way is that the model sits in
                    the middle of the path rather than at the end of it. It is
                    one component, and the only stage that leaves your
                    boundary. Permission, context, validation, logging and
                    human control are supplied by the system around it.
                  </p>
                  <p className="mt-6 max-w-lg text-sm leading-relaxed text-[var(--text-muted)]">
                    This is how systems are designed. It is not a picture of a
                    certified running deployment, and no box in it has been
                    audited by anyone outside Ziiro. What your engagement
                    actually does is written into your engagement.
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
                ( The architecture )
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
                    Email the address below with what you need and the
                    deadline you are working to. We will answer question by
                    question, and where the answer is that something is not in
                    place we will say so rather than leaving a blank. That is
                    faster for you than a document that has to be corrected
                    later.
                  </p>
                  {/* One address, so no list. The <ul>, the <li> and the map
                      over SECURITY_CONTACTS existed only because there were two
                      addresses; `flex-col gap-2` was the space between them.
                      The `mt-6` moved onto the anchor, which is inline-flex and
                      takes a vertical margin, so the rendered position is
                      unchanged.

                      THERE IS STILL NO security@ ALIAS on any domain. That note
                      used to live beside SECURITY_CONTACTS in posture.ts; it
                      moved here with the address it is about. Printing one
                      would send a vulnerability report into a void, so if one
                      is ever created, change it in SECURITY.md and in
                      shared/lib/contact.ts together. */}
                  <a
                    href={mailto()}
                    className="mt-6 inline-flex min-h-[44px] items-center font-mono text-sm tracking-wide text-[var(--text-primary)] underline decoration-[color:var(--border-strong)] underline-offset-4 transition-opacity hover:opacity-70"
                  >
                    {CONTACT_EMAIL}
                  </a>
                </div>

                <div>
                  <h3 className="font-semibold text-[var(--text-primary)]">
                    Reporting a vulnerability
                  </h3>
                  <p className="mt-3 max-w-lg leading-relaxed text-[var(--text-secondary)]">
                    Private vulnerability reporting is enabled on our
                    repository, and the published security policy sets out what
                    is in scope and what to expect. The address above also
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
