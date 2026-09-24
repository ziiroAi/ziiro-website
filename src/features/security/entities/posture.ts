/**
 * ── SECURITY ARCHITECTURE, AND THE RULE THAT GOVERNS EVERY LINE ───────
 *
 * WHAT THIS PAGE IS ABOUT, after a correction that changed its subject: the
 * security architecture Ziiro applies when it designs, builds and runs systems
 * FOR A CLIENT. It is not about ziiroai.com. A CTO evaluating us does not care
 * what response headers a brochure sets; they care what happens to their data
 * inside a system we build and operate. The website-posture material that used
 * to live here was not too long, it was the wrong subject, and it is gone.
 *
 * ── THE THREE KINDS OF STATEMENT, AND WHICH ONE THIS FILE IS MADE OF ──
 *
 *   1. A CERTIFICATION CLAIM. "SOC 2 certified", "HIPAA certified". These need
 *      an audit or an issuing body. We hold none. NEVER write one. There is
 *      also no such thing as a generic HIPAA certification, so that phrasing
 *      is wrong in principle as well as false here.
 *
 *   2. A PRESENT-TENSE OPERATIONAL CLAIM about a running fleet. "All customer
 *      data is encrypted at rest across every environment." Never write one of
 *      these either: nothing evidences a fleet of running environments for it
 *      to be true of.
 *
 *   3. A STATEMENT OF ENGINEERING PRACTICE AND ARCHITECTURE. "Systems are
 *      designed so that an agent receives only the permissions its task
 *      requires." Legitimate, checkable inside an engagement, and what this
 *      whole file is written in.
 *
 * THE TENSE CARRIES THE HONESTY. "Systems are designed so that X" is true and
 * verifiable when you engage us. "All our systems do X" is a claim about
 * deployments nobody can check. Write the first. If you find yourself reaching
 * for the second, the status is wrong, not the wording.
 *
 * ADDING A ROW: `implemented` is reserved for something a reader could verify
 * today, from outside an engagement. On this page that is currently nothing,
 * and the count in the legend says so out loud. The dev-time assertion at the
 * bottom of this file still enforces that anything claiming it carries a
 * source, so the rule cannot rot if that ever changes.
 */

export type Status =
  | "implemented"
  | "design"
  | "available"
  | "configurable"
  | "in-progress"
  | "not-offered"
  | "not-applicable"
  | "not-established";

/**
 * How each status is labelled and drawn.
 *
 * `solid` is true for exactly one status, and it is deliberately the one this
 * page does not currently use. Implemented means "you could check this today
 * without engaging us". A security architecture is checked inside an
 * engagement, so almost nothing here qualifies, and pretending otherwise by
 * moving the fill onto Design practice would be exactly the over-reading this
 * system exists to prevent. No ticks, no colour, no badges anywhere.
 */
export const STATUS_META: Record<Status, { label: string; solid: boolean; note: string }> = {
  implemented: {
    label: "Implemented",
    solid: true,
    note: "Verifiable today, from outside an engagement.",
  },
  design: {
    label: "Design practice",
    solid: false,
    note: "How systems are designed and built. Checkable inside an engagement, not a claim about a fleet already running.",
  },
  configurable: {
    label: "Agreed per engagement",
    solid: false,
    note: "Set with you, in the contract, before work starts.",
  },
  available: {
    label: "Available",
    solid: false,
    note: "A capability we will enable for qualifying engagements. Not a claim that it is running today, and any conditions are printed beside the offer.",
  },
  "in-progress": {
    label: "In progress",
    solid: false,
    note: "Being worked on. Not in place, and not to be relied on.",
  },
  "not-offered": {
    label: "Not currently offered",
    solid: false,
    note: "We do not do this, by design.",
  },
  "not-applicable": {
    label: "Not applicable",
    solid: false,
    note: "Does not apply to how this is built.",
  },
  "not-established": {
    label: "Not established",
    solid: false,
    note: "We hold no evidence either way, so we make no claim. Ask and we will answer honestly.",
  },
};

export interface PostureItem {
  topic: string;
  status: Status;
  detail: string;
  /** Where this is checkable. Required whenever status is implemented. */
  source?: string;
  /**
   * The conditions an offer depends on, rendered beside it rather than in a
   * subsection somewhere else.
   *
   * This exists because of the BAA. An unconditional "BAA available" would be
   * exactly the overstatement this page is built to avoid: it is available for
   * qualifying healthcare engagements, where Ziiro is genuinely acting as a
   * business associate, and where every downstream subprocessor touching the
   * data is itself contracted and configured for it. Those conditions are not
   * small print, they are what makes the offer credible to a buyer who knows
   * what a BAA actually obliges. Keep them next to the offer.
   */
  conditions?: string[];
}

export interface PostureSection {
  id: string;
  title: string;
  lead: string;
  items: PostureItem[];
}

export const SECTIONS: PostureSection[] = [
  {
    id: "approach",
    title: "How systems are designed",
    lead: "The frame for everything below. These are statements about how we build, not about a fleet already running somewhere.",
    items: [
      {
        topic: "What this page describes",
        status: "design",
        detail:
          "The architecture applied when we design, build and operate a system for a client: who can reach data, how it is isolated, how it moves through models, what an agent may do, and what is agreed before any of it starts.",
      },
      {
        topic: "Least privilege as a starting position",
        status: "design",
        detail:
          "Systems are designed so that every component, human and agent alike, receives the narrowest permission its task requires. Access is granted to a specific job rather than to a system, and widened deliberately rather than by default.",
      },
      {
        topic: "Data minimisation",
        status: "design",
        detail:
          "A system is designed to hold and move the least data that makes it work. Where a field is not needed for the outcome, the design leaves it where it is rather than copying it.",
      },
      {
        topic: "Traceability",
        status: "design",
        detail:
          "Systems are designed so that a consequential action can be reconstructed afterwards: what was requested, what context was used, what the model returned, what was validated, and what was written back.",
      },
      {
        topic: "Ownership at the end",
        status: "configurable",
        detail:
          "What you keep, what is returned and what is destroyed when an engagement ends is written into the contract before it begins, rather than discovered at the end of it.",
      },
    ],
  },
  {
    id: "ai",
    title: "AI and model security",
    lead: "The centre of this page, because it is where the risk that is specific to this kind of work actually lives.",
    items: [
      {
        topic: "Approved providers only",
        status: "design",
        detail:
          "Production work uses a named set of model providers agreed for that engagement. A model is not swapped in because it is cheaper or newer without that agreement, and a provider outside the set does not receive client data.",
      },
      {
        topic: "Minimum necessary context",
        status: "design",
        detail:
          "A model receives the portion of data the task needs, not a whole dataset for convenience. Retrieval is scoped to the question rather than pointed at everything the client has.",
      },
      {
        topic: "Redaction before submission",
        status: "design",
        detail:
          "Sensitive fields are redacted or replaced with tokens before a prompt leaves the system, so identifiers that the task does not need are never submitted. Where a value must round-trip, the mapping stays inside the client's boundary.",
      },
      {
        topic: "Training on your data",
        status: "configurable",
        detail:
          "Stated per provider, because providers genuinely differ and a single blanket sentence would be wrong for some of them. The position for each provider in scope is written down for the engagement before data moves, rather than assumed from a marketing page.",
      },
      {
        topic: "Isolation between clients",
        status: "design",
        detail:
          "One client's prompts, files and vector indexes are designed to be logically separated from another's. There is no global semantic search spanning clients, because an index that can answer across tenants is a breach waiting for the right question.",
      },
      {
        topic: "Prompt injection treated as a given",
        status: "design",
        detail:
          "Retrieved content and third-party documents are treated as hostile input rather than as instructions. System instruction, client instruction, retrieved content and tool permission are kept separate, so text that arrives inside a document cannot inherit the authority of the system that read it.",
      },
      {
        topic: "The model is one component",
        status: "design",
        detail:
          "Permission, context, validation, logging, business rules and human control live in the system around the model, not in the prompt. A model is replaceable; that surrounding structure is what actually makes the system safe to run.",
      },
    ],
  },
  {
    id: "agents",
    title: "Agent permissions and control",
    lead: "What an agent is allowed to do on its own, and where a person stays in the path.",
    items: [
      {
        topic: "Scoped tool permissions",
        status: "design",
        detail:
          "Each tool an agent can call is granted separately. An agent that reads email does not thereby gain permission to send it, and one that reads a record does not gain permission to delete it.",
      },
      {
        topic: "Human approval for high-impact actions",
        status: "design",
        detail:
          "Actions that are irreversible, externally visible or financially material are designed to stop at a person. Which actions those are is decided with you rather than assumed.",
      },
      {
        topic: "Deterministic validation of output",
        status: "design",
        detail:
          "Model output is checked by ordinary code against the rules of the destination before it is written into a business-critical system. A value that fails validation does not get written and does not get retried silently.",
      },
      {
        topic: "Credentials for agents",
        status: "design",
        detail:
          "An agent is designed to use a credential scoped to its task rather than a shared account or a human's login, so what it did is distinguishable from what a person did.",
      },
      {
        topic: "Autonomy level",
        status: "configurable",
        detail:
          "How much an agent does unattended is a decision for the engagement, written down, and revisited as confidence is earned rather than set once at the start.",
      },
    ],
  },
  {
    id: "isolation",
    title: "Data isolation and tenancy",
    lead: "How one client's data is kept away from another's, and from us.",
    items: [
      {
        topic: "Separation between engagements",
        status: "design",
        detail:
          "Each engagement's data, credentials and indexes are designed to sit in their own boundary. Nothing is designed to require that two clients' data share a store to work.",
      },
      {
        topic: "Where data lives",
        status: "configurable",
        detail:
          "Whether a system runs inside your infrastructure, in an environment we operate for you, or in a mix of the two is decided per engagement and affects nearly everything else on this page.",
      },
      {
        topic: "Ziiro's own access to client data",
        status: "configurable",
        detail:
          "Who on our side can reach what, for how long, and under what logging, is agreed in the contract. The design position is that access is scoped to the work and removed when the work ends.",
      },
      {
        topic: "Cross-client analytics",
        status: "not-offered",
        detail:
          "We do not design systems that learn from one client's data to serve another, and we do not pool client data for our own model training or benchmarking.",
      },
    ],
  },
  {
    id: "access",
    title: "Identity and access to client systems",
    lead: "The credentials an engagement needs, and how they are designed to be handled.",
    items: [
      {
        topic: "Scoped credentials rather than shared logins",
        status: "design",
        detail:
          "Integrations are designed to use purpose-scoped credentials, so access can be attributed and revoked without disturbing anyone else's.",
      },
      {
        topic: "Revocation on completion",
        status: "design",
        detail:
          "Access granted for a piece of work is designed to be removable at the end of it, and the handover includes what to revoke.",
      },
      {
        topic: "Multi-factor authentication on Ziiro accounts",
        status: "not-established",
        detail:
          "We hold no evidence we can publish of what is enforced internally, so we make no claim. Ask, and we will answer directly.",
      },
      {
        topic: "Access reviews and offboarding",
        status: "not-established",
        detail:
          "Whether internal access is reviewed on a schedule and revoked on departure is not something we can currently evidence.",
      },
    ],
  },
  {
    id: "protection",
    title: "Data protection in transit and at rest",
    lead: "Stated as design practice. We will not tell you what every environment does, because we cannot evidence a fleet.",
    items: [
      {
        topic: "Transport",
        status: "design",
        detail:
          "Systems are designed so that data moves over encrypted transport between every component, including to model providers and between an agent and the tools it calls.",
      },
      {
        topic: "Storage",
        status: "design",
        detail:
          "Where a system must persist client data, it is designed to use the platform's encryption at rest and to keep the smallest amount for the shortest time the task allows.",
      },
      {
        topic: "Secrets handling",
        status: "design",
        detail:
          "Credentials are designed to live in a managed secret store rather than in code, configuration files or prompts, and to be rotatable without a rebuild.",
      },
      {
        topic: "Retention and deletion",
        status: "configurable",
        detail:
          "How long anything is kept, and how deletion is requested and confirmed, is agreed per engagement. A system with no agreed retention period is a system nobody can honestly answer questions about.",
      },
      {
        topic: "Encryption across all running environments",
        status: "not-established",
        detail:
          "We will not make a present-tense claim about every environment that exists. What a specific engagement does is written into that engagement and is checkable there.",
      },
    ],
  },
  {
    id: "regulated",
    title: "Regulated workloads, including health data",
    lead: "What changes when the data is regulated, and the conditions that have to be true before such work starts.",
    items: [
      {
        topic: "Administrative safeguards",
        status: "design",
        detail:
          "A regulated engagement is designed around a risk analysis for that workload, a named person responsible for it, explicit authorisation of who may work on it, and an agreed procedure for incidents.",
      },
      {
        topic: "Technical safeguards",
        status: "design",
        detail:
          "Access control, authentication, audit controls, integrity checking and transmission security are designed into the system rather than added to it, and each is specified for the workload rather than assumed.",
      },
      {
        topic: "Physical safeguards",
        status: "design",
        detail:
          "The facility controls sit with the cloud provider under its own terms. The controls we are responsible for are the ones covering our own devices and how work happens on them, and they are specified in the engagement.",
      },
      {
        topic: "Conditions before regulated work starts",
        status: "configurable",
        detail:
          "A regulated workload runs only under a configuration agreed in advance and with the necessary agreements in place. Every downstream service that could touch the data must itself be contracted and configured for it, which rules out sending regulated data to any service not approved for that purpose.",
      },
      {
        topic: "Business Associate Agreement",
        status: "available",
        detail:
          "A BAA is available for qualifying healthcare engagements. Where protected health information is created, received, maintained or transmitted on behalf of a covered entity, a written business associate arrangement is what the rules require, and we will sign one. The conditions below are part of the offer rather than caveats on it: a BAA signed over a stack that cannot honour it would be worth nothing to you.",
        conditions: [
          "The engagement is an approved HIPAA-regulated one, agreed as such before any data moves.",
          "Ziiro is genuinely acting as a business associate for that work, rather than the term being applied loosely.",
          "Every downstream subprocessor that could touch the information is itself contracted and configured for it, which rules out routing protected health information through any service not approved for that purpose.",
        ],
      },
      {
        topic: "HIPAA certification",
        status: "not-applicable",
        detail:
          "There is no such thing as a generic HIPAA certification, so nobody holds one and we will not imply we do. What is real is whether the safeguards above are specified, agreed and operated for your workload, which is a question about your engagement rather than about a badge.",
      },
    ],
  },
  {
    id: "logging",
    title: "Logging, monitoring and incident response",
    lead: "What a system records, and what is agreed to happen when something goes wrong.",
    items: [
      {
        topic: "What is logged",
        status: "design",
        detail:
          "Systems are designed to record the decisions that matter: what an agent was asked, what context it was given, what it returned, what validation did, and what was written back. Logs are designed to avoid carrying the sensitive payload itself where the record of the action is enough.",
      },
      {
        topic: "Who can read the logs",
        status: "configurable",
        detail:
          "Log retention, access and export are part of the engagement rather than a default we impose.",
      },
      {
        topic: "Incident procedure",
        status: "configurable",
        detail:
          "What counts as an incident, who is told, in what time, and through which channel is agreed in the contract. That is the only place a notification commitment means anything.",
      },
      {
        topic: "A rehearsed internal incident runbook",
        status: "not-established",
        detail:
          "We have no written, exercised runbook of our own to show you. Stating it plainly is more useful to you than a paragraph implying one exists.",
      },
      {
        topic: "Continuous monitoring and alerting",
        status: "not-established",
        detail:
          "What is monitored and who receives an alert is not something we can evidence as a standing capability.",
      },
    ],
  },
  {
    id: "resilience",
    title: "Resilience, recovery and exit",
    lead: "What happens when something breaks, and what happens when the engagement ends.",
    items: [
      {
        topic: "Failure behaviour",
        status: "design",
        detail:
          "Systems are designed to fail closed on the path that touches data: when a check cannot complete, the action does not proceed. A degraded model or an unreachable tool stops the work rather than guessing at it.",
      },
      {
        topic: "Backups and recovery objectives",
        status: "configurable",
        detail:
          "Whether a system needs backups, how often, and how quickly it must come back are set for the workload. A system that holds nothing of its own needs a different answer from one that becomes a system of record.",
      },
      {
        topic: "Restore testing",
        status: "not-established",
        detail:
          "We hold no evidence of tested restores as a standing practice, so we make no claim to one.",
      },
      {
        topic: "Exit and handover",
        status: "design",
        detail:
          "A system is designed to be handed over: documented, with its access transferable and its data exportable, so that ending the engagement does not mean losing the work.",
      },
    ],
  },
  {
    id: "assurance",
    title: "Assurance and what is contractually committed",
    lead: "Certifications, audits, and where a real commitment actually lives.",
    items: [
      {
        topic: "SOC 2",
        status: "not-established",
        detail: "No examination has been undertaken and no report exists.",
      },
      {
        topic: "ISO 27001",
        status: "not-established",
        detail: "Not certified, and no certification process is underway.",
      },
      {
        topic: "Independent penetration testing or audit",
        status: "not-established",
        detail:
          "None has been carried out. Nothing on this page has been checked by a third party, and it should be read as self-reported.",
      },
      {
        topic: "NIST and OWASP",
        status: "design",
        detail:
          "Used as benchmarks to check designs against, particularly for AI-specific failure modes. Neither is a certification, neither certifies anyone, and we claim no conformance to either.",
      },
      {
        topic: "Where a commitment becomes binding",
        status: "configurable",
        detail:
          "In the engagement contract. Everything on this page describes how we design; the contract is what obliges us, and it is the document to negotiate against rather than this one.",
      },
      {
        topic: "Security questionnaire, DPA or subprocessor detail",
        status: "available",
        detail:
          "Send it to the address below and we will answer question by question. Where the answer is that something is not in place, it will say so rather than leave a blank, which is faster for you than a document corrected later.",
      },
      {
        topic: "A dedicated security alias",
        status: "in-progress",
        detail:
          "A role-based address for security correspondence does not exist yet, so this page deliberately does not print one. An address that bounces is worse than no address at all, so the published contact address is used everywhere instead.",
      },
    ],
  },
];

/**
 * ── THE RISK MODEL ────────────────────────────────────────────────────
 *
 * Ziiro's clients are not one industry. A law firm brings privilege, a design
 * studio brings unreleased work, an engineering team brings source code and
 * production credentials, a healthcare client brings regulated data. One
 * blanket posture would be overstated for most engagements and understated for
 * a few, so what is published is the MODEL.
 *
 * These are NOT certified tiers and NOT published control checklists. Do not
 * add thresholds or authoritative-sounding names: the controls for an
 * engagement are set in its contract, and a web page is the wrong place to
 * promise them in advance.
 */
export interface RiskBand {
  data: string;
  examples: string;
  position: string;
}

export const RISK_BANDS: RiskBand[] = [
  {
    data: "Public or already published",
    examples:
      "Marketing copy, public documentation, published content, anything already visible to anyone.",
    position:
      "The lightest architecture. Nothing here is confidential, so the design is scoped on usefulness rather than on handling.",
  },
  {
    data: "Internal business operations",
    examples:
      "Process maps, operational metrics, workflow and cost data, general business records.",
    position:
      "Most engagements sit here. Isolation, scoped credentials and logging apply, under the engagement's confidentiality terms.",
  },
  {
    data: "Confidential third-party material",
    examples:
      "Client intellectual property, unreleased work, privileged or confidential legal material, source code, production credentials.",
    position:
      "Adds redaction before anything reaches a model, tighter tool scoping, and approval gates on actions that leave the system. Agreed in writing before work starts.",
  },
  {
    data: "Regulated categories",
    examples:
      "Health information, regulated financial records, and other special-category personal data.",
    position:
      "A BAA is available for qualifying healthcare engagements, where Ziiro is genuinely acting as a business associate and every downstream subprocessor touching the data is itself contracted and configured for it. Work runs only under a configuration agreed before any data moves. We hold no certification or audit for this category and will not imply one.",
  },
];

export const RISK_MODEL_RULE =
  "What an engagement touches decides what it needs. A system reading public marketing copy is not built like one handling health records, and the controls for any particular engagement are written into its contract rather than promised in advance on a web page.";

/* SECURITY_CONTACTS was here: a one-element array holding the published
 * address, mapped into a <ul> by Security.tsx. With a single address the list
 * and the array were both wrapping one item, and the address was defined here
 * as well as in shared/lib/contact.ts, which is the duplication that file was
 * created to end.
 *
 * The page now reads CONTACT_EMAIL from shared/lib/contact.ts, the same import
 * Privacy and Terms use, so the address has exactly one definition site. This
 * file stays a pure data module with no imports, which is why the constant was
 * removed rather than re-pointed at the shared one.
 *
 * The note about there being no security@ alias moved to Security.tsx, beside
 * the address it is about. */

/**
 * When this page was last checked.
 *
 * MAINTAINED, NOT AUTOMATIC. Do not wire this to the build date: a build
 * happens whenever anything on the site changes and would silently assert that
 * somebody re-verified this, which is the exact species of false claim this
 * page exists to avoid. Move it only when a person has re-read the statements
 * above and still stands behind them.
 */
export const LAST_REVIEWED = {
  date: "2026-09-21",
  scope:
    "The architecture statements below, re-read against what is actually designed and what is only aspired to.",
};

export const ALL_ITEMS = SECTIONS.flatMap((s) => s.items);

export const countBy = (status: Status) =>
  ALL_ITEMS.filter((i) => i.status === status).length;

/**
 * The invariant, enforced rather than trusted: anything claiming to be
 * implemented must say where that is checkable. Dev only, and loud, so the
 * rule fails when somebody breaks it rather than at a customer's security
 * review. Production and the prerender never evaluate this.
 */
if (import.meta.env.DEV) {
  const unsourced = ALL_ITEMS.filter((i) => i.status === "implemented" && !i.source);
  if (unsourced.length > 0) {
    throw new Error(
      `posture.ts: ${unsourced.length} item(s) claim "implemented" with no source: ` +
        unsourced.map((i) => i.topic).join(", "),
    );
  }
}
