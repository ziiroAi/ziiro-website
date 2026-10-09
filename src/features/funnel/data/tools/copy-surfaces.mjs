// Which copy IDs lane C generates, by surface, and the lines spec §4.5 adds or changes, D37's sp.hero.scroll.one
// among them (plus §8.4's seo.* lines, 00-index §1.3's em.said.chips and D38's r.film.close). These win over
// copy.md until copy.md takes them. A missing line stops the generator.
const OVERLAY = {
  "g.footer": "Your answers are saved to shape your plan. · Privacy",
  "g.noscript": "This page needs JavaScript to build your plan. Rather talk? Book a call.",
  "s7.err.bot": "The spam check didn't go through. Mind trying once more?",
  "sp.save.fail": "I couldn't save your details just now, so no email went out. Your plan is below, and you can still book a call.",
  "sp.save.unsure": "I couldn't confirm your details were saved. Your plan is below, and you can still book a call.",
  "sp.disc.call": "{Department} · {k} of {m}",
  "sp.disc.aria": "{Department}: you need {k} of its {m} agents today.",
  "sp.disc.aria.none": "{Department}: nothing here is needed today.",
  "sp.pilot.note": "This plan is a pilot. Parts of it are still being built. The part that answers questions about your business is live today, and we can show you one in 30 seconds.",
  "em.pilot": "One thing to know: this plan is a pilot. Parts of it are still being built. The part that answers questions about your business is live today, and we can show you one in 30 seconds.",
  "em.said.chips": "You picked: {chips}.",
  "hx.alt.light": "A tall spine of glossy black vertebrae, every disc between them glowing orange.",
  "hx.alt.dark": "A tall spine of dark chrome vertebrae, every disc glowing a cool blue-white.",
  "sp.hero.alt": "A spine of dark metal vertebrae. The discs for the parts of your business that need agents today are lit, and the others are dark.",
  "sp.legend.today": "Lit: this part has agents you need today",
  "sp.legend.later": "Quiet: this part can come later",
  "sp.hint.hover": "Hover a disc to see that part's agents.",
  "sp.later.sub": "Your business will change. When it does, add an agent.",
  "s1b.o5": "Something else",
  "s5.o.other": "Under $250k · $250k–1M · $1–5M · $5–25M · $25M+",
  "s8.l1.chips": "Looking at what you picked…",
  "s8.l3.one": "Sizing it for a team of one…",
  "sp.hero.scroll.one": "Scroll through the one part you need.",
  "r.film.close": "Close",
  "seo.home.title": "Your Business Spine: an AI plan in a minute",
  "seo.home.desc": "Answer a few questions and see which of the 33 agents in a full Business Spine your business needs today. ziiro AI is an AI consultancy based in India.",
  "seo.plan.title": "Your plan",
  "s9.err.sent": "Your plan is on its way to {email}. This page couldn't show it just now, but the email has all of it.",
  "s9.err.unsent": "This page couldn't show your plan just now. Reload to try again, or book a call.",
  "g.reload": "Reload the page",
};

const range = (prefix, from, to) => Array.from({ length: to - from + 1 }, (_, i) => `${prefix}${i + from}`);
const DEPARTMENT_KEYS = ["intelligence", "marketing", "sales", "deals", "customer", "operations", "backoffice"];

const SURFACES = {
  "copy/flow.ts": ["FLOW_COPY", [
    "g.about", "g.back", "g.progress", "g.footer", "g.error", "g.noscript",
    "s0.sub.early", "s0.sub.day", "s0.sub.late", "s0.promise",
    "s1.q", ...range("s1.o", 1, 5),
    "s1b.q", ...range("s1b.o", 1, 5), "s1b.done", "s1b.btn",
    "s2.q", "s2.hint", "s2.o", "s2.other",
    "s3.q", "s3.why", "s3.o", "s4.q", "s4.why", "s4.o",
    "s5.q", "s5.why", "s5.o.IN", "s5.o.other", "s5.skip",
    "s6.bridge", "s6.q", "s6.hint", "s6.text", "s6.chips.lead", "s6.chips", "s6.chips.max", "s6.btn", "s6.empty",
    "s7.q", "s7.sub", "s7.name", "s7.name.ph", "s7.email", "s7.email.ph", "s7.phone", "s7.phone.why", "s7.consent", "s7.links", "s7.btn",
    "s7.err.name", "s7.err.email", "s7.err.phone", "s7.err.consent", "s7.err.bot",
    "s8.l1", "s8.l1.chips", "s8.l2", "s8.l3", "s8.l3.one",
    "s9.err.sent", "s9.err.unsent", "g.reload",
  ]],
  "copy/site.ts": ["SITE_COPY", ["nav.home.aria", "nav.mission", "nav.who", "nav.products", "nav.btn", "ph.nav.menu", "nav.theme.light", "nav.theme.dark"]],
  "copy/plan.ts": ["PLAN_COPY", [
    "hx.eyebrow", "hx.h1", "hx.h2", "hx.p", "hx.btn1", "hx.btn2",
    "hx.stat1.n", "hx.stat1.l", "hx.stat2.n", "hx.stat2.l", "hx.stat3.n", "hx.stat3.l",
    "hx.call1.n", "hx.call1.l", "hx.call2.n", "hx.call2.l", "hx.scroll", "hx.alt.light", "hx.alt.dark",
    "ph.hx.h", "ph.hx.p", "ph.hx.stat2.l", "ph.hx.scroll",
    "sp.save.fail", "sp.save.unsure",
    "sp.hero.eyebrow", "sp.pilot", "sp.brain.label", "sp.brain.tip", "sp.brain.live",
    "sp.hero.h", "sp.hero.h.fallback", "sp.hero.sub", "sp.hero.honest", "sp.pilot.note",
    "sp.legend.jobs", "r.legend.live", "r.legend.build", "r.legend.mapped", "sp.hero.scroll", "sp.hero.scroll.one",
    "ph.hero.h", "ph.hero.h.fallback", "ph.hero.sub", "ph.hero.honest", "ph.hero.scroll", "ph.brain.label",
    "sp.part.count", "sp.part.agents", "sp.part.jobs", "sp.part.rest", "ph.part",
    "sp.vert.title", "sp.vert.line", "sp.vert.jobs", "sp.vert.live", "ph.vert.jobs",
    ...DEPARTMENT_KEYS.flatMap((d) => ["heading", "tag", "why", "words"].map((f) => `dp.${d}.${f}`)),
    "sp.later", "sp.later.sub", "ph.later", "cta.h", "sp.cta.lead", "ph.cta.lead", "cta.btn", "cta.sub",
    "r.film.title", "r.film.cap", "r.film.close",
    // Phase 1b's lines, generated now so the data module is complete.
    "sp.legend.today", "sp.legend.later", "sp.hero.alt", "sp.hint.hover", "sp.disc.call", "sp.disc.aria", "sp.disc.aria.none",
    "sp.vert.dept", "sp.vert.today", "sp.vert.later",
  ]],
  "copy/email.ts": ["EMAIL_COPY", [
    "em.from", "em.subject", "em.subject.fallback", "em.preview", "em.hi", "em.open", "em.said", "em.said.chips",
    "em.need", "em.need.fallback", "em.pilot", "em.dept", "em.agent", "em.close", "em.cta", "em.link", "em.cta.sub",
    "em.sign", "em.sign2", "em.foot",
  ]],
  "copy/seo.ts": ["SEO_COPY", ["seo.home.title", "seo.home.desc", "seo.plan.title"]],
};

/** One generated file per surface: { "copy/flow.ts": "<source>", … }. */
export function copyFiles(parsed, header) {
  const text = (id) => OVERLAY[id] ?? parsed.get(id);
  return Object.fromEntries(
    Object.entries(SURFACES).map(([file, [constName, ids]]) => {
      const missing = ids.filter((id) => !text(id));
      if (missing.length > 0) throw new Error(`${constName}: no line for ${missing.join(", ")}`);
      const body = ids.map((id) => `  ${JSON.stringify(id)}: ${JSON.stringify(text(id))},`).join("\n");
      return [file, `${header}export const ${constName} = {\n${body}\n} as const;\n`];
    }),
  );
}
