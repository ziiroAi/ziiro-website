/**
 * ── THE SECURITY POSTURE, AND THE RULE THAT GOVERNS IT ────────────────
 *
 * Every row on /security lives here, and every row carries a status and, when
 * it claims something, a `source` naming where that claim is substantiated.
 *
 * THE RULE: nothing is stated as fact unless it was verified against the live
 * site or this repository. A false security claim is not marketing
 * exaggeration. A healthcare buyer can rely on it and be harmed by it, and a
 * security reviewer running a questionnaire will find it. An honestly
 * incomplete page survives that review; a fluent one does not.
 *
 * WHAT THIS SITE ACTUALLY IS, because it sets the ceiling on what can be
 * claimed: a static marketing site on Vercel with two edge functions, no
 * database, no accounts, no sessions and no payments. The consulting
 * engagements may well involve customer systems, but nothing in this
 * repository evidences what controls exist there. So most topics below are
 * honestly "not established" rather than any of the positive statuses, and
 * that is the correct answer rather than a gap in the writing.
 *
 * ADDING A ROW: if you cannot fill in `source` with something a reviewer could
 * check, the status is not `implemented`. There is a dev-time assertion at the
 * bottom of this file that enforces exactly that, so the rule cannot rot.
 */

export type Status =
  | "implemented"
  | "available"
  | "configurable"
  | "in-progress"
  | "not-offered"
  | "not-applicable"
  | "not-established";

/**
 * How each status is labelled and drawn.
 *
 * `solid` is TRUE for exactly one status. Implemented is the only thing that
 * gets filled ink; everything else is an outline, so no unverified row can
 * read as a confirmation at a glance. There are deliberately no ticks and no
 * colour anywhere in this system: the site is monochrome, and a tick is the
 * single most over-read mark on a security page.
 */
export const STATUS_META: Record<Status, { label: string; solid: boolean; note: string }> = {
  implemented: {
    label: "Implemented",
    solid: true,
    note: "In place today and verifiable.",
  },
  available: {
    label: "Available",
    solid: false,
    note: "Offered, on request.",
  },
  configurable: {
    label: "Customer configurable",
    solid: false,
    note: "Decided per engagement, with you.",
  },
  "in-progress": {
    label: "In progress",
    solid: false,
    note: "Being worked on. Not in place yet, and not to be relied on.",
  },
  "not-offered": {
    label: "Not currently offered",
    solid: false,
    note: "We do not do this today.",
  },
  "not-applicable": {
    label: "Not applicable",
    solid: false,
    note: "Does not apply to how this is built.",
  },
  "not-established": {
    label: "Not established",
    solid: false,
    note: "We hold no evidence either way, so we make no claim. Ask us and we will answer honestly.",
  },
};

export interface PostureItem {
  /** The control or topic, as a reviewer would name it. */
  topic: string;
  status: Status;
  /** The honest answer. Plain, and never wider than the evidence. */
  detail: string;
  /** Where this is substantiated. Required whenever status is implemented. */
  source?: string;
}

export interface PostureSection {
  id: string;
  title: string;
  lead: string;
  items: PostureItem[];
}

export const SECTIONS: PostureSection[] = [
  {
    id: "overview",
    title: "Security overview",
    lead: "What this system actually is, because it sets the ceiling on every other answer below.",
    items: [
      {
        topic: "What ziiro.work is",
        status: "implemented",
        detail:
          "A static marketing site rendered at build time and served by Vercel, plus two edge functions. There is no database, no user account, no login, no session and no payment taken anywhere on it.",
        source: "Repository: no data layer, no auth, no payment integration. Verified against the codebase.",
      },
      {
        topic: "Edge functions in production",
        status: "implemented",
        detail:
          "Two. A country lookup used for regional pricing, and a contact endpoint that forwards a message to a team mailbox.",
        source: "api/geo.ts and api/send-contact.ts with its shared library api/_lib.ts.",
      },
      {
        topic: "Controls inside consulting engagements",
        status: "not-established",
        detail:
          "This page describes the website. It does not describe controls inside client systems, because nothing we can publish evidences them. If you are evaluating us for work that touches your data, ask directly and we will answer question by question rather than pointing you at a page.",
      },
      {
        topic: "Independent assurance of anything on this page",
        status: "not-established",
        detail:
          "No external audit, penetration test or documented risk assessment has been carried out. Everything marked implemented below is self-reported and checkable by you.",
      },
    ],
  },
  {
    id: "identity",
    title: "Identity and access",
    lead: "Who can reach what. Most of this concerns internal accounts, and most of it we cannot yet evidence.",
    items: [
      {
        topic: "Visitor accounts, logins and sessions",
        status: "not-applicable",
        detail:
          "There are none to secure. The site has no account system, sets no authentication cookie and holds no session.",
        source: "Repository: no auth, no session handling anywhere in the codebase.",
      },
      {
        topic: "Source code access control",
        status: "implemented",
        detail:
          "The default branch requires a pull request. Force pushes and branch deletion are blocked, linear history is required, and static analysis is a required status check before a merge.",
        source: "GitHub branch protection on the default branch, verified on the repository.",
      },
      {
        topic: "Multi-factor authentication on internal accounts",
        status: "not-established",
        detail: "We hold no evidence of what is enforced, so we claim nothing.",
      },
      {
        topic: "Named individual accounts, access reviews, offboarding",
        status: "not-established",
        detail:
          "Whether access is granted per person, reviewed on a schedule, or revoked on departure is not something we can currently evidence.",
      },
    ],
  },
  {
    id: "data",
    title: "Data protection",
    lead: "What is collected, where it goes, and how long it is kept. On this site the honest answer is: very little, and not for long.",
    items: [
      {
        topic: "Transport encryption",
        status: "implemented",
        detail:
          "HTTPS is enforced. HSTS is set with a two-year max-age, includeSubDomains and preload, so a browser that has seen the site once will refuse to talk to it over plain HTTP.",
        source: "Response headers on the production domain: Strict-Transport-Security max-age=63072000; includeSubDomains; preload.",
      },
      {
        topic: "Contact submissions",
        status: "implemented",
        detail:
          "A submission is forwarded to a team mailbox through an email provider and no copy is kept by the site. There is no database for it to be written to.",
        source: "api/send-contact.ts: the handler forwards and returns. No persistence layer exists.",
      },
      {
        topic: "Country lookup",
        status: "implemented",
        detail:
          "The regional price is chosen from a country code the platform puts on the request. The function stores nothing, never touches the IP address itself, and its response is marked private and no-store so no cache can retain it.",
        source: "api/geo.ts: reads x-vercel-ip-country, returns a country code, sets Cache-Control private, no-store.",
      },
      {
        topic: "Encryption at rest",
        status: "not-established",
        detail:
          "The site stores nothing, so there is nothing of ours at rest to encrypt. What the email provider and the host do with data they hold is theirs to state, not ours, and we have not verified it.",
      },
      {
        topic: "Content-Security-Policy",
        status: "not-established",
        detail:
          "There is no Content-Security-Policy header on this site. It is stated rather than omitted because a reviewer will check, and finding it missing after reading a page that stayed quiet about it is worse than reading it here.",
        source: "Response headers on the production domain: no CSP present. Recorded as a gap.",
      },
    ],
  },
  {
    id: "ai",
    title: "AI and model security",
    lead: "This is the section a buyer should read most carefully, because it is the one where we can evidence least.",
    items: [
      {
        topic: "AI involvement in this website",
        status: "not-applicable",
        detail:
          "No part of ziiro.work sends visitor data to a model. There is no assistant, no chat and no inference on this site.",
        source: "Repository: no model provider SDK or API call exists in the site or its two functions.",
      },
      {
        topic: "Model provider training settings",
        status: "not-established",
        detail:
          "Whether data sent to a provider during an engagement is excluded from training is a real and important question. We hold no published evidence of our settings, so we will not assert an answer here.",
      },
      {
        topic: "Tenant isolation and customer-scoped credentials",
        status: "not-established",
        detail:
          "How engagement systems separate one client's data and credentials from another's is not evidenced by anything we can publish.",
      },
      {
        topic: "Agent permission models and human approval gates",
        status: "not-established",
        detail:
          "What an agent is allowed to do unattended, and where a person must approve, is decided per build. We have no published standard to point you at.",
      },
      {
        topic: "Retrieval store separation",
        status: "not-established",
        detail:
          "How retrieval indexes are partitioned between clients is not something we can currently evidence.",
      },
      {
        topic: "Handling of health or other special-category data",
        status: "not-established",
        detail:
          "We make no claim of any capability, control or safeguard for protected health information. Do not read anything on this page as one.",
      },
    ],
  },
  {
    id: "appsec",
    title: "Application and infrastructure security",
    lead: "The part with the most evidence behind it, because it is the part that lives in a public repository and in response headers you can read yourself.",
    items: [
      {
        topic: "Browser security headers",
        status: "implemented",
        detail:
          "X-Content-Type-Options nosniff, X-Frame-Options SAMEORIGIN, Referrer-Policy strict-origin-when-cross-origin, and a Permissions-Policy denying camera, microphone and geolocation.",
        source: "Response headers on the production domain. Check them yourself with curl -I.",
      },
      {
        topic: "Static analysis",
        status: "implemented",
        detail:
          "CodeQL runs on the repository and is a required check before a merge. Nine runs have completed with no open alerts.",
        source: "GitHub code scanning on the repository: 9 completed runs, 0 open alerts, required status check.",
      },
      {
        topic: "Secret scanning",
        status: "implemented",
        detail:
          "Secret scanning is on, and push protection is on, so a credential is blocked as it is pushed rather than found afterwards.",
        source: "GitHub secret scanning and push protection, both enabled on the repository.",
      },
      {
        topic: "Contact endpoint input handling",
        status: "implemented",
        detail:
          "Input is validated before anything leaves the function, values are HTML-escaped, carriage returns and newlines are stripped from the subject, a JSON content type is required, and the reply address is set only after it validates. Error responses carry no internal detail.",
        source: "api/_lib.ts: escapeHtml, sanitizeText, sanitizeHeader, isValidEmail, and the content-type check in api/send-contact.ts.",
      },
      {
        topic: "Dependency update automation",
        status: "not-established",
        detail:
          "Automated dependency security updates are not enabled on the repository. Stated because it is a fair question and the honest answer is that this one is off.",
        source: "GitHub repository settings: Dependabot security updates disabled. Recorded as a gap.",
      },
      {
        topic: "Penetration testing",
        status: "not-established",
        detail: "None has been carried out on this site or on any engagement system.",
      },
    ],
  },
  {
    id: "monitoring",
    title: "Monitoring and incident response",
    lead: "What happens when something goes wrong. We can point at how to report one; we cannot yet point at a tested process for handling it.",
    items: [
      {
        topic: "Reporting a vulnerability",
        status: "implemented",
        detail:
          "Private vulnerability reporting is enabled on the repository, and a security policy is published telling you what is in scope and how to reach a person.",
        source: "GitHub private vulnerability reporting enabled; SECURITY.md published in the repository.",
      },
      {
        topic: "Documented incident response process",
        status: "not-established",
        detail:
          "There is no written, rehearsed incident response runbook we can show you.",
      },
      {
        topic: "On-call ownership and escalation",
        status: "not-established",
        detail: "No formal rota or escalation path is established.",
      },
      {
        topic: "Breach notification timelines",
        status: "not-established",
        detail:
          "We commit to no specific notification window here, because a number we have not built the process to meet would be worse than silence. Any timeline would need to be agreed in a contract.",
      },
      {
        topic: "Monitoring and alerting",
        status: "not-established",
        detail:
          "What is monitored, what alerts, and who receives it is not something we can evidence.",
      },
    ],
  },
  {
    id: "resilience",
    title: "Resilience and recovery",
    lead: "Backups and restoration. On a site that stores nothing there is little to restore, and beyond the site we have nothing tested to report.",
    items: [
      {
        topic: "Site recovery",
        status: "implemented",
        detail:
          "The entire site is rebuilt from source. The repository is the only thing that needs to survive, and it is version controlled with a protected default branch.",
        source: "Repository: the site is generated at build time from committed source.",
      },
      {
        topic: "Database backups",
        status: "not-applicable",
        detail: "There is no database on this site to back up.",
        source: "Repository: no data layer exists.",
      },
      {
        topic: "Recovery objectives, RPO and RTO",
        status: "not-established",
        detail: "No recovery point or recovery time objective has been defined or agreed.",
      },
      {
        topic: "Restore testing",
        status: "not-established",
        detail: "No restore exercise has been performed or documented.",
      },
    ],
  },
  {
    id: "people",
    title: "People, vendors and subprocessors",
    lead: "Who else can touch data. The vendor list is evidenced from the code; almost everything about internal practice is not.",
    items: [
      {
        topic: "Third parties that may receive data",
        status: "implemented",
        detail:
          "Vercel hosts the site. An email provider delivers contact submissions. Cloudflare Turnstile performs the bot check on the contact form. A geolocation service is used as a fallback country lookup. Calendly handles booking. Google Fonts serves typefaces. YouTube and Vimeo serve embedded video.",
        source: "Read from the codebase: api/_lib.ts, src/features/pricing/services/geoService.ts, rates.ts, videos.ts, vsl-player.tsx and index.html.",
      },
      {
        topic: "Data processing agreements with those vendors",
        status: "not-established",
        detail:
          "We cannot confirm that a data processing agreement is in place with any of them. Ask before relying on one.",
      },
      {
        topic: "Device encryption and endpoint protection",
        status: "not-established",
        detail: "Not evidenced for any machine used to do the work.",
      },
      {
        topic: "Confidentiality agreements, security training, background checks",
        status: "not-established",
        detail:
          "None of these is something we can currently evidence. A confidentiality agreement can be signed as part of an engagement; ask for it.",
      },
    ],
  },
  {
    id: "compliance",
    title: "Privacy and compliance",
    lead: "Read this section as written. Every certification below is honestly unestablished, and nothing here should be read as a substitute for one.",
    items: [
      {
        topic: "SOC 2",
        status: "not-established",
        detail: "No SOC 2 examination has been undertaken and no report exists.",
      },
      {
        topic: "ISO 27001",
        status: "not-established",
        detail: "Not certified, and no certification process is underway.",
      },
      {
        topic: "HIPAA and a Business Associate Agreement",
        status: "not-established",
        detail:
          "We are not in a position to state HIPAA readiness, and we cannot confirm that a BAA would be signed. If your work involves protected health information, treat this as a no until a person tells you otherwise in writing.",
      },
      {
        topic: "Data Processing Agreement",
        status: "not-established",
        detail:
          "No standard DPA is published. If you need one, ask and we will tell you honestly where we are.",
      },
      {
        topic: "GDPR controller and processor roles",
        status: "not-established",
        detail:
          "The roles have not been formally mapped. What the site itself collects is set out in the Privacy Policy.",
      },
      {
        topic: "NIST and OWASP",
        status: "not-established",
        detail:
          "We use them as benchmarks to check our own work against. Neither is a certification, neither certifies anyone, and we make no claim of conformance to either.",
      },
    ],
  },
  {
    id: "resources",
    title: "Security resources",
    lead: "The documents and channels that exist today, and what each one is actually good for.",
    items: [
      {
        topic: "Security policy",
        status: "implemented",
        detail:
          "A published policy setting out what is in scope for a report, what is out of scope, and how to reach a person. It names the two addresses below rather than a security alias, because that alias does not exist yet.",
        source: "SECURITY.md, published in the repository.",
      },
      {
        topic: "Private vulnerability reporting",
        status: "implemented",
        detail:
          "Enabled on the repository, so a report can be opened privately rather than in a public issue.",
        source: "GitHub private vulnerability reporting, enabled on the repository.",
      },
      {
        topic: "Privacy Policy and Terms",
        status: "implemented",
        detail:
          "The Privacy Policy states what the site collects and how deletion is requested. The Terms govern use of the site and the treatment of AI outputs. Both are linked below and both bind; this page does not.",
        source: "Published at /privacy and /terms.",
      },
      {
        topic: "Security questionnaire, DPA, BAA or subprocessor detail",
        status: "available",
        detail:
          "Send it to either address below and we will answer question by question. Where the answer is that something is not in place, it will say so rather than leave a blank, which is faster for you than a document corrected later.",
      },
      {
        topic: "A dedicated security alias",
        status: "in-progress",
        detail:
          "A single role-based address for security correspondence does not exist yet, so this page deliberately does not print one. An address that bounces is worse than no address at all, so the two published personal addresses are used everywhere instead, including in the security policy.",
        source: "Confirmed absent when SECURITY.md was written, which is why that file also points at the two published addresses.",
      },
    ],
  },
];

/**
 * ── THE RISK MODEL ────────────────────────────────────────────────────
 *
 * Ziiro's clients are not one industry. A law firm brings privilege and
 * confidentiality duties, a design studio brings unreleased work and client
 * intellectual property, an engineering team brings source code and
 * production credentials, a healthcare client brings regulated health data.
 * One blanket security posture would therefore be dishonest in both
 * directions at once: overstated for most engagements and understated for a
 * few.
 *
 * So what is published is the MODEL, not a policy dressed up as one. These
 * bands are how a conversation gets scoped. They are NOT a certified
 * framework, they are NOT tiers with published control checklists, and none
 * of them is a claim to hold a control that appears as "not established"
 * elsewhere on this page. Do not add thresholds, control lists or
 * authoritative-sounding names here: the specific controls for an engagement
 * are set in that engagement's contract, and a web page is the wrong place to
 * promise them in advance.
 */
export interface RiskBand {
  /** Described by what the data IS, which is checkable, rather than by an
   *  invented tier name, which would not be. */
  data: string;
  examples: string;
  /** What is actually true today about work of this kind. */
  position: string;
}

export const RISK_BANDS: RiskBand[] = [
  {
    data: "Public or already published",
    examples:
      "Marketing copy, public documentation, published content, anything already visible to anyone.",
    position:
      "The ordinary case. Nothing here is confidential, so the work is scoped on usefulness rather than on handling.",
  },
  {
    data: "Internal business operations",
    examples:
      "Process maps, operational metrics, workflow and cost data, general business records.",
    position:
      "Most engagements sit here. Handling is covered by the engagement's confidentiality terms, agreed before work starts.",
  },
  {
    data: "Confidential third-party material",
    examples:
      "Client intellectual property, unreleased work, privileged or confidential legal material, source code, production credentials.",
    position:
      "Accepted only where the engagement's contract sets out how it is handled, who may access it, and what happens at the end. Credentials are scoped to the work rather than shared wholesale.",
  },
  {
    data: "Regulated categories",
    examples:
      "Health information, regulated financial records, and other special-category personal data.",
    position:
      "Not undertaken on the strength of anything published here. We hold no certification, audit or attestation for this category and will not imply one. If this is your situation, the conversation starts with what you require in writing, and we will tell you plainly where we actually are before you commit to anything.",
  },
];

/** The one sentence the risk model exists to make true. */
export const RISK_MODEL_RULE =
  "What an engagement touches decides what it needs. A system reading public marketing copy should not be built like one handling regulated records, and the controls for any particular engagement are written into its contract rather than promised in advance on a web page.";

/** The two published addresses. Deliberately the real ones.
 *
 *  There is no security@ziiro.work mailbox. It does not exist, so printing it
 *  would send a vulnerability report into a void, which is worse than having
 *  no alias at all. When the alias is created, swap it in here and in
 *  SECURITY.md together. */
export const SECURITY_CONTACTS = ["aniket@ziiro.work", "govind@ziiro.work"];

/**
 * When the statements on this page were last checked against the live site and
 * the repository.
 *
 * MAINTAINED, NOT AUTOMATIC. Do not wire this to the build date. A build
 * happens when anything on the site changes and would silently assert that
 * somebody re-verified these controls, which is the exact species of false
 * security claim this page exists to avoid. Move it only when a person has
 * actually re-checked the rows above, and say who.
 */
export const LAST_REVIEWED = {
  date: "2026-09-21",
  /** What was re-checked, so the date means something specific. */
  scope: "Response headers on the production domain, repository security settings, and the two edge functions.",
};

/** Every section flattened, for counting and for the summary row. */
export const ALL_ITEMS = SECTIONS.flatMap((s) => s.items);

export const countBy = (status: Status) =>
  ALL_ITEMS.filter((i) => i.status === status).length;

/**
 * The invariant, enforced rather than trusted: anything claiming to be
 * implemented must say where that can be checked. Dev only, and loud, so the
 * rule fails at the moment somebody breaks it rather than at a customer's
 * security review. Production and the prerender never evaluate this.
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
