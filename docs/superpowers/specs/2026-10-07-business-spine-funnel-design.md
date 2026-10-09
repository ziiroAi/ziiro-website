# Business Spine funnel: design spec

- **Date:** 7 Oct 2026. Merged the same day with worker-2's web delivery of the r17 look (§6.6), worker-3's section on the 33 agents (§6.7) and worker-4's architecture (§13), under the manager's rulings in `funnel/wave8-merge.md`, with worker-3's review (`funnel/spec-review.md`) applied.
- **Status:** approved by the owner on 8 Oct. The owner's words, recorded in `funnel/wave9.md`: "not the closeup test start with the one we planned earlier not the closeup, keep the closeup one afterwards if we dont like it then". `wave9.md` takes that as approval of this spec as written, with D1–D34 standing, the camera push-in on the long model (D29/D30) and the phone hero stacked (D34). The close-up model is a parked fallback. D35–D39 came after the approval: they're manager rulings, and the owner can veto each one (§2).
- **Approved inputs:** the funnel sketch, version 2 (`.team/ziiro-fleet/funnel/sketch/index.html`), and the r17 look, light and dark (`funnel/proto/look/A/r17-*`). The owner approved both on 7 Oct: "i love the drawing and everything. i have approved it. i saw our 17 and it seems pretty good. let's move forward with it"
- **Words:** every line a visitor reads lives in `funnel/copy.md` under an ID (`s6.q`, `sp.hero.h` and so on). This spec names the IDs and doesn't repeat the lines. §4.5 lists the lines it adds, changes or retires. The owner has approved this spec, so they go into `copy.md` next; until they're in, §4.5 wins.
- **Claims:** Appendix A binds every visitor-facing line, in the page, the email, the film and `llms.txt`.
- Paths that start with `funnel/` are under `.team/ziiro-fleet/` in this repo. That folder is not in git.

---

## 1. The short version

The homepage at ziiroai.com becomes a few questions, one per screen. A business owner says what they do, how long they've been at it, how big the team is and roughly what it makes, and then, in their own words, what's hurting. They leave a name and an email, and their plan opens: the full 33-agent Business Spine first, then the few agents they need today, one part of the business at a time. A copy lands in their inbox from Adyut. We ask for one thing, a call.

The first release is the questions, the plan in words under the r17 still, the plan email, a team alert for every lead, and "Book a call", which opens the 30-minute Calendly event. It replaces the current homepage, and the "127 jobs / 30 agents" line goes with it. The spine on the hero and the plan is the owner's own 3D model, live in the browser, and turns under a finger or the mouse (D2 was vetoed on 8 Oct 2026, §6.6). The r17 still paints first and stays as the fallback.

It goes live about 6.5 working days after the build starts, and the build starts the day after you approve the build plan, which is the step after this spec. Approve on Thursday 8 Oct and it's live around midday on Monday 19 Oct. Approve by Friday 9 Oct and it's still live before the VIT talk on the 21st. The first real lead comes from the first visitor who finishes the questions, so launch day is the earliest it can arrive.

On every funnel page and in the email: no price, no "free audit", and one call to action, "Book a call". "33 agents" always means the full spine we'd build. We run 6 of the 137 jobs on our own company today, and lead-gen plans carry a Pilot tag.

Only you can do these, in this order (details in §13.8):
1. Add the /contact keys in Vercel and send one test message, about 20 minutes with `funnel/contact-fix.md`. The build can't start without it. (B1)
2. Install Neon from the Vercel Marketplace, about 5 minutes. The build needs it on day 1. (B3)
3. Move the "ziiro" team to Vercel Pro. Hobby doesn't allow commercial use. (B2)
4. Tell us which Tripo plan made your two spine models. The first release shows the spine, and a model from the free plan can't go on a company website. (B5)
5. Approve the Privacy page text once the builders have drafted it. (B6)
6. Get Adyut's yes on two jobs: deleting someone's details within 7 days when they ask, and sending a plan email by hand, the same working day, whenever the automatic one doesn't go out. (B7)
7. Send Adyut's email address when you can. Until it's set, replies go to the team inbox, so this one doesn't hold up launch. (B4)

Not a blocker, but also yours: check the three Hindi greetings. Until you do, Hindi visitors see English.

Section 2 lists what we decided without you. Its first part overrules things you decided, so read that part first.

---

## 2. Decisions taken by default (owner can veto)

This is the one list of defaults. Each one stands unless you veto it, and each is marked "(Dn, default, owner can veto)" where it applies further down.

### Where we changed what you decided
These overrule a numbered decision of yours, or something you approved, so they need your eye first.

| # | You decided | What we changed, and why | Where |
|---|---|---|---|
| D1 | 10: one vertebra is one agent | One disc per department. Your model has 10 vertebrae and 9 glowing discs, not 33 vertebrae. The 7 middle discs carry one department each, Intelligence at the top and Back Office at the base, and a plan lights the discs of the departments it needs, with its agents named beside them. Each agent keeps a number from 1 to 33 for its place in the full spine. Your model and the r17 look ship untouched. | §6.7 |
| D2 | 13: true 3D, interactive | **Vetoed by the owner on 8 Oct 2026:** "the whole thing which I asked for you to create that 3d looking website ... why did i generate 3d models if I wanted to ship the still image." His item 13 stands. The hero and the plan show his Tripo spine as a live, real-time 3D model that turns under a finger on a phone and the mouse on desktop (§6.6). The r17 still is only the first paint (the LCP element) and the fallback when WebGL isn't there. The phase 1b lit-disc stills and the pre-rendered scroll are replaced by the live model. Nothing launches until the spine turns under the owner's finger and he approves the look by eye (§13.8 B8). The old default read: first release the r17 still and words, lit discs and the scroll 3 days later, no drag. | §6.2, §6.6, §9, §13.7, §13.8, §13.10 |
| D3 | 11 and 12: the page follows your drawing, and "they see their brain and the spine" | The brain is a text card, "What your business knows", and not part of the 3D. Your model has no brain, and its top end stays out of frame. The card sits at the top of the plan's text, and at the top of the callouts once the discs light. | §6.2 |
| D4 | 21: the greeting's language goes by country | It goes by the browser's language instead. A Hindi speaker in Dubai still gets Hindi, and a VPN can't change it. English and Hindi ship first; every other language ships once a native speaker has checked it. | §4.2 |
| D5 | 25: the film is a trim, not a re-cut | "See how it works" plays the film we already re-rendered as Business Spine (56.7 s). One more line in it changes, "BRAIN · 9 JOBS LIVE" to "BRAIN · LIVE", because nobody can prove that 9 jobs run. In the film the brain is the part that answers questions about a business, and that part is live. | §6.5 |
| D6 | 1: forced onboarding, no skip | There's still no skip button, and the header shows only the logo while they answer. The site footer stays below the fold, though, so every page is one click away for people and for search engines. | §4.1 |
| D7 | 29: replies go to Adyut | Until Adyut's address is set, replies to the plan email and the lead alerts go to the team inbox. When his address arrives, one setting changes. That keeps his address off the launch path. | §7, §13.6 |
| D34 | The sketch you approved on 7 Oct: on a phone, the hero's words sit over the spine | On a phone the words come first, on the page colour and in the sketch's own colours, and the spine sits below them at full strength: a band cut from the tall phone framing of r17, with four lit discs in it. The stats row stays at the bottom of the hero, under the spine. Over the spine, the words needed a page-coloured veil to be readable, and the veil washed the middle of the spine to grey. Stacked, nothing sits on the model and every text colour passes the contrast check. It's also how the phone tour already works, with the words on a card below the spine. Desktop doesn't change. | §6.2, §6.4, §6.6 |

### Questions you never answered
Our recommendation stands for each of these.

| # | Decision | Where |
|---|---|---|
| D8 | Everything happens at `/`, the plan included. There's no plan URL, so no plan turns up in search and nobody can open someone else's. A reload starts the questions again; the plan is in their inbox. "Welcome back" comes in phase 2. | §6.1 |
| D9 | The page is dark when the visitor's device asks for dark. Otherwise it's dark from 17:00 to 04:59 by their own clock, the same edges as the evening greeting, and light the rest of the day. There's no theme switch in the first release. The questions and the plan follow this rule; the rest of the site stays dark until it's redesigned. | §4.1 |
| D10 | Outside India, the revenue question uses dollars: Under $250k · $250k–1M · $1–5M · $5–25M · $25M+. The lowest band makes the plan one size smaller and the top two make it one size bigger, the same as the rupee bands. A visitor counts as in India when their connection says so or, if that's unknown, when their clock is set to India time. | §4.3, §5.3 |
| D11 | A small lead-gen plan (3 agents) spends all three on the problem itself, with no Back Office agent at that size. `agents-33.md` §3 left this to you. | §5.4 |
| D12 | If someone names two problems, the plan covers the first. We save the second but don't show it, because the approved page has no place for it. | §5.2 |
| D13 | What people type travels only with their contact details, after they tick the consent box. If someone leaves before that, none of their typed words reach us. | §9 |
| D14 | The header keeps the live site's three links (Mission · Who We Are · Products). Its "Book a call" pill opens the Calendly event straight away, on every page. "Business Spine" becomes a fourth link when its search page ships. | §6.2 |
| D15 | People who don't run a business get a "Show me the site" button, and it goes to /products. | §4.3 |
| D16 | The plan email comes from a ziiroai.com address under the name "Adyut at ziiro". ziiro.work stays for cold email, so the plan email doesn't share its sending reputation. | §7 |
| D17 | Every new lead also sends an alert to the team inbox and to Adyut, with the answers and the plan. | §7 |
| D18 | If sending the contact step fails, whether it's the spam check, too many tries or our server, the visitor goes back once with everything still filled in. If it fails again, the plan opens anyway. We save the lead if the server can, flagged with the reason, and its plan email doesn't go out on its own: the alert asks Adyut to check it the same working day and, if a real person sent it, to email the plan by hand. | §10 |
| D19 | Nobody gets a verification code. We only check that an email address or phone number looks right. A plan email that bounces shows in Resend's dashboard in the first release, and in our own report from phase 2. | §4.4, §10 |
| D20 | The plan email says people can reply to have their answers deleted. Adyut does it within 7 days and replies to confirm. Contact details are kept for 12 months, anonymous visits for 24. | §7, §13.5 |
| D21 | A booked call counts as a funnel call when the Calendly booking's email matches a funnel lead. Adyut marks it in the database. There's no Calendly webhook in the first release. | §9 |
| D22 | The first release uses no outside analytics tool. Each step is saved in our own database, and that is the funnel report. | §9 |
| D23 | The contact-step rule (decision 23) counts real visitors only, over the 30 days after launch. If it trips, the plan opens straight after the "what's hurting" question, and the contact form moves onto the plan, above the close. | §9 |
| D24 | The first release drops the line "Audio is never stored", because there's no microphone yet. It comes back with voice. | §4.5 |
| D25 | Tests use Vitest, Playwright and axe. They're developer tools, so nothing new ships to visitors' browsers. A GitHub Actions job runs them on every pull request into `dev` and `main`. Preview builds use Cloudflare's test keys for the spam check and their own copy of the database. | §12 |
| D26 | The old homepage's components get deleted, not parked. Git keeps them anyway. | §13.9 |
| D27 | If the funnel can't be live by Tuesday 20 Oct, the "127 jobs / 30 agents" line comes off the live homepage on its own first, so the VIT talk on 21 Oct never shows it. | §13.7 |
| D28 | When a plan's discs light, the other discs keep 12 % of their glow. With none at all they look like black holes, and at 25 % lit and quiet look too alike. | §6.2, §6.6 |
| D29 | Each camera move into a close-up has 24 steps. On desktop the frames on the way are 1280 pixels wide, and only the close-up a stop rests on is full size, which keeps the download small. | §6.6 |
| D30 | Between two stops the camera pulls back to the full spine and goes in again, so every tour order plays from the same 12 camera moves. | §6.2, §6.6 |
| D31 | Phones get the hero at 828 and 1170 pixels wide. The widest phones (430 wide at 3×) stretch the 1170 file by 10 %. A 1290 file would fix that at 68 KB, well under the limit, so it's an easy add if you want it. | §6.6 |
| D32 | On phones, the frames on the way into a close-up are saved at a slightly lower quality (AVIF 45). At phone size they look the same, and each frame is 14 % smaller. | §6.6 |
| D33 | Browsers that can't show AVIF images get the still version of the plan: the same words, with a still picture at each stop. | §6.3, §6.6 |
| D35 | "Sorted", "theek hai" and the like cancel a problem only inside their own clause. A clause ends at punctuation or at "but", "however", "lekin" or "magar". So "Billing is sorted, but our reels need work" reads as a content problem. | §5.2 |
| D36 | What someone types about their problem is quoted once, at the part of the business the problem belongs to. A content, support or hiring problem is quoted where its agent sits: Content maker (7) in Marketing, Support desk (21) in Customer, Hiring assistant (33) in Back Office. Words that point at no part are quoted at the plan's first stop. Before, the quote went to the part of the plan's first agent, which put words about content in Back Office. | §6.3 |
| D37 | When a plan has only one part, the desktop scroll line is singular: "Scroll through the one part you need." (`sp.hero.scroll.one`). The usual line would read "the 1 parts". Two plans have one part: the small B-convert plan (Deals only) and the small hiring plan (Back Office only). | §4.5, §6.2 |
| D38 | The close button on the film's lightbox says "Close" (`r.film.close`). `copy.md` had no line for it. | §4.5, §6.5 |
| D39 | On desktop, both hero callouts sit right of the spine: "33 AI agents" level with the Sales disc, "137 Jobs mapped" level with the Customer disc. The words take the left 55 % of the hero, so the 33 can't sit upper left of the spine, where the sketch's hero picture had it. | §6.2 |

---

## 3. Purpose and success measure

**Purpose.** Get business owners onto a call with us. The funnel gives them something useful first: their own plan, sized to their business, in about a minute. Then it asks for one thing, a call. Right now that serves one goal, the first paying client.

**The measure that matters:** calls booked from the funnel, counted each week (D21).

**Launch bar, pass or fail, on production.** One test lead goes all the way through: the plan opens, the plan email from Adyut arrives, the team alert arrives, the database has the row, and "Book a call" opens Calendly with the name and email filled in. After that, the first real lead comes through the same path.

**Weekly health, read from the database every Monday (§9, saved queries in Appendix C):**

| Measure | Why it matters | The line we hold |
|---|---|---|
| Plans sent | The free thing reached people | Read the trend |
| Drop-off by step | Shows where people quit | Read the trend |
| Contact-step drop-off | Decision 23 | Over 40 % in the first 30 days moves contact after the plan (D23) |
| Median time from landing to plan | `s0.promise` says "Takes about a minute" | Under 60 s |
| Plan emails sent | `s7.sub` promises a copy in their inbox | Every one; any that failed or was held goes out by hand the same working day |
| "Book a call" clicks, and calls booked | Intent, then the result | Read the trend |
| Claims check | Trust | Passes on every deploy (§12) |
| Speed | A slow first screen loses people | The gates in §13.10 |

---

## 4. The flow, S0 to S9

### 4.1 Rules for every screen
- **One question per screen,** except years and team, which share one (S3 + S4). Six screens ask something.
- **Tapping an answer moves on by itself,** within 250 ms. Every option is a real button.
- **Back.** A back arrow (`g.back`) on every screen after S1. The browser's own Back button also goes back one step with the answers kept, because S1 to S7 each add a history entry on the same URL. Sending S7 adds no entry: S8 and then the plan take S7's place, so Back from the plan returns to S6. Sending again after that is a new visit, with a new lead and a new plan email.
- **Progress.** Six segments, one per screen that asks something (S1, S2, S3 + S4, S5, S6, S7), with `g.progress` for screen readers. S1b shows no bar.
- **Target:** the plan is on screen within 60 s of landing.
- **Header:** the logo only, from S0 to S8 (D6, default, owner can veto). `g.about` sits under S1 as real page text. The site footer follows below the fold.
- **Theme** (D9, default, owner can veto) and **greeting language** (§4.2) are set before the first paint, with no visible swap. Both use the same day-part edges by the visitor's clock. A greeting row with its own hours changes the greeting's words, never the theme.
- **Only the greeting is localised.** Every other line is in English (decision 9, rule 5).
- **Nothing waits on the network between steps.** Each step is saved in the background (§9).
- **Reduced motion:** no slides or fades; screens switch at once.

### 4.2 S0: the greeting
- **Rule (decision 9):** a hello word plus a time-of-day greeting, both in the visitor's own language and script, from the table in `copy.md` S0. A non-English visitor never sees an English half.
- **Language (D4, default, owner can veto):** the first entry in the browser's language list that has a live row. If none has one, English.
- **What ships when** (decision 21 and the manager's rule):
  - English ships in the first release.
  - Hindi ships in the first release behind its `checked` flag, which turns on when the owner has checked its three lines. Until then Hindi visitors see English. `copy.md` marks the Hindi row "owner checks" rather than ⚑; it counts as ⚑ until that check is done.
  - Every other row ships in a later phase, once a native speaker has checked it, along with what it needs: right-to-left markup for Arabic and Urdu, and the own hours of es-ES, es-MX/es-419 and id.
- **Day-parts, by the visitor's clock:** morning 05:00–11:59, afternoon 12:00–16:59, evening 17:00–04:59.
- **Second line, in English, by local hour:** `s0.sub.early` 05:00–07:59, `s0.sub.day` 08:00–21:59, `s0.sub.late` 22:00–04:59. Then `s0.promise`.
- **Motion:** the greeting fades up over about half a second while S1 rises under it, then settles into a small header. There's nothing to press and nothing to wait for.
- **The live spine (W14-I, W14-R):** a 3D layer under the greeting and S1 that never holds up the first tap, specified in §6.6 under "S0".
- **Markup:** the greeting carries its own `lang`, plus `dir="rtl"` for Arabic and Urdu once those rows ship.
- **Static fallback:** the prerendered HTML holds the English hello alone, "Hello.", and an inline script replaces it before the first paint. If the script fails, "Hello." stays.

### 4.3 The screens

| Step | What it shows (copy IDs) | What the visitor does | Then |
|---|---|---|---|
| S0 + S1 | The greeting, `s0.sub.*`, `s0.promise`; `s1.q`, `s1.o1`–`s1.o5`; `g.about` | Taps one option | `s1.o1`, `s1.o2` → S2 (`s1.o2` preselects "Marketing or creative agency" on S2). `s1.o3`–`s1.o5` → S1b |
| S1b | `s1b.q`, `s1b.o1`–`s1b.o5` (`s1b.o5` is a plain option, §4.5) | Taps one | Saved, then `s1b.done` and `s1b.btn` → /products (D15, default, owner can veto). No contact ask |
| S2 | `s2.q`, `s2.hint`, the 12 options in `s2.o`, `s2.other` | Taps one; "Other" opens a text box (80 characters) | S3 + S4 |
| S3 + S4 | `s3.q`, `s3.why`, `s3.o`; `s4.q`, `s4.why`, `s4.o` | The first tap fills its row and brings the team row forward; the second tap moves on | S5 |
| S5 | `s5.q`, `s5.why`, `s5.o.IN` or `s5.o.other` (D10, default, owner can veto), `s5.skip` | Taps one. "Rather not say" is a full answer | S6 |
| S6 | `s6.bridge` (holds about 1 s, then settles above the question), `s6.q`, `s6.hint`, the text box opening with `s6.text`, `s6.chips.lead`, the nine chips in `s6.chips`, `s6.chips.max`, `s6.btn`, `s6.empty` | Types, or taps up to three chips, or both; then `s6.btn` | S7 |
| S7 | `s7.q`, `s7.sub`, `s7.name` + `.ph`, `s7.email` + `.ph`, `s7.phone`, `s7.phone.why`, `s7.consent` (unticked), `s7.links`, `s7.btn`, `s7.err.*`, `s7.err.bot` (§4.5); the spam check | Name and email are required, phone is optional, the tick is required. Enter submits | The lead is sent (§13.2), then S8 |
| S8 | `s8.l1`–`s8.l3`, with their variants (chips only, voice, "Just me" → "a team of one") | Nothing. The lines play over 1.5 to 2.5 s, each replacing the one before. The last one holds until the lead is saved or 8 s have passed since they tapped send | The plan, or back to S7 once (§10) |
| S9 | The plan, at `/` (§6) | Scrolls, opens job lists (and, from phase 1b, discs), plays the film, books a call | Calendly |
| M | The plan email (§7) | Reads it, books a call | Calendly |
| R | `ret.hello`, `ret.sub`, `r.facts`, `ret.reset` (phase 2) | "Not you? Start fresh." clears the saved plan | Their plan, at `/` |
| E | A search page (§8, phase 3) | Taps `e.btn` "Get my plan" | S1 at `/`, with the page's intent saved |

### 4.4 Notes on S6 and S7
- **S6, first release:** the text box and the chips. Voice comes in phase 2 (decision 20). It takes English speech only and uses `s6.hint.lang`, `s6.mic`, `s6.mic.pre`, `s6.mic.on`, `s6.mic.edit`, `s6.mic.wait` and `s6.mic.no`.
- **S6 text** is capped at 600 characters.
- **S6 chip labels are classifier keys** (§5.2). Changing a label changes the data.
- **S7 consent:** the consent line is versioned, and the version and the time are saved with the contact.
- **S7 has no WhatsApp field** (decision 14). `s7.wa` and `s7.err.wa` stay retired.
- **S7 phone:** if one is typed, it's saved in international format. The country code is prefilled from the visitor's country (D10, default, owner can veto), which the first background save returns (§13.2), and stays editable.
- **S7 checks shape only** (D19, default, owner can veto): no code is sent to the email or the phone. The form imports the same checks the server runs, the disposable-address list included, so a bad address is caught before S8.
- **The spam check** is Cloudflare Turnstile, invisible to most visitors. Its script loads when S6 opens (§13.4).
- **Privacy page, same release (B6):** today it names only ipwho.is. It must name Vercel (hosting), Neon (the database, in Singapore), Resend (email), Cloudflare Turnstile (the spam check) and Calendly, say what is stored, and say that a reply to the plan email is enough to get deleted. Once voice ships, it names the speech provider too.

### 4.5 Lines this spec adds, changes or retires
The owner approved this spec on 8 Oct, so they go into `copy.md` next. Until they're in, this section wins. The repo's copy data holds only the lines this spec places, so retired lines and the old result page's lines (`r.graph.*` and the like) stay in `copy.md` and out of the build.

**New lines**

| ID | Line | Where |
|---|---|---|
| `g.footer` (first release) | Your answers are saved to shape your plan. · Privacy | Under the questions. The audio sentence comes back with voice (D24, default, owner can veto) |
| `g.noscript` | This page needs JavaScript to build your plan. Rather talk? Book a call. | `/` with JavaScript off. "Book a call" is a plain link to the Calendly event |
| `s7.err.bot` | The spam check didn't go through. Mind trying once more? | S7, the first time the spam check fails or never loaded |
| `sp.save.fail` | I couldn't save your details just now, so no email went out. Your plan is below, and you can still book a call. | Top of the plan, when the second try failed and the server said nothing was saved |
| `sp.save.unsure` | I couldn't confirm your details were saved. Your plan is below, and you can still book a call. | Top of the plan, when the second try got no answer |
| `sp.disc.call` | {Department} · {k} of {m}, then one `sp.vert.title` line for each agent they need from that part | From phase 1b, the callout beside each lit disc. {k} = their agents in the part, {m} = all agents in the part |
| `sp.disc.aria` | {Department}: you need {k} of its {m} agents today. When {k} is 0: {Department}: nothing here is needed today. | From phase 1b, the label of each disc button |
| `seo.*` | Titles and descriptions | §8.4 |
| `sp.hero.scroll.one` | Scroll through the one part you need. | Block 2 on desktop, in place of `sp.hero.scroll` when the plan has one part, as B-convert S and hiring S do (D37, default, owner can veto) |
| `r.film.close` | Close | The close button of the film's lightbox, §6.5 (D38, default, owner can veto) |

**Changed lines**

| ID | New line | Why |
|---|---|---|
| `sp.pilot.note` | This plan is a pilot. Parts of it are still being built. The part that answers questions about your business is live today, and we can show you one in 30 seconds. | "Business Spine, the backbone they hang on, is live today" reads as the 33-agent spine running (Appendix A) |
| `em.pilot` | One thing to know: this plan is a pilot. Parts of it are still being built. The part that answers questions about your business is live today, and we can show you one in 30 seconds. | The same reason. Ananya's golden email in `copy.md` changes with it |
| `rb.status` | This part is still being built. The part that answers questions about your business is already live, and we can show you one in 30 seconds. | The same reason |
| `r.film.live` | The part that answers questions about your business is live. We can show you one in 30 seconds. | The same reason |
| f5, the answer | The part that answers questions about your business is live, and we can show you one in 30 seconds. We build the other parts for you, one agent at a time. | The same reason. A phase 3 FAQ line |
| `hx.alt.light` | A tall spine of glossy black vertebrae, every disc between them glowing orange. | The r17 still has no rings |
| `hx.alt.dark` | A tall spine of dark chrome vertebrae, every disc glowing a cool blue-white. | The same reason |
| `sp.hero.alt` | A spine of dark metal vertebrae. The discs for the parts of your business that need agents today are lit, and the others are dark. | From phase 1b. The model has 10 vertebrae and no brain, and a disc stands for a part, not an agent |
| `sp.legend.today` | Lit: this part has agents you need today | From phase 1b. A lit disc is a part, and in dark mode it glows blue, not orange |
| `sp.legend.later` | Quiet: this part can come later | From phase 1b. The same reason |
| `sp.vert.title` | The words stay. {v} is now the agent's number in the full spine, 1 to 33 | D1 |
| `sp.hint.hover` | Hover a disc to see that part's agents. | From phase 1b, desktop only. The frames can't be turned |
| `sp.later.sub` | Your business will change. When it does, add an agent. | Adding an agent no longer adds a vertebra |
| `hx.call1.l` | The words stay ("AI agents"). Its note changes: it labels the whole spine as the product, as in the owner's image | The drawing has 10 vertebrae |
| `hx.call1.n`, `hx.call2.n` | The numbers stay (33 and 137). Their notes change: both callouts sit right of the spine, `hx.call1.*` level with G05 (Sales) and `hx.call2.*` level with G03 (Customer) | D39. The words hold the left 55 % of the hero (§6.6), so "upper left of the spine" would put the 33 on them |
| `s1b.o5` | Something else | No text box. S1b has no consent tick, so typed words there could never be saved (D13) |
| `s5.o.other` | Under $250k · $250k–1M · $1–5M · $5–25M · $25M+ | D10 settles the bands, so the "[owner to confirm these bands]" note comes off the visitor's line |
| `seo.lead.title`, `e.h1.lead` | AI lead generation pilot: every enquiry answered and followed up (title). Our lead generation pilot: every enquiry answered and followed up (H1) | Phase 3. A pilot's label belongs where people read first |

**Retired lines**
- `sp.email.fail`: a failed plan email changes nothing on screen, and Adyut resends it (ruling 8).
- `hx.p.open`: there's no open version without answers (D8).
- `ph.hint`: phones have no disc buttons, and `ph.vert.jobs` already says "tap to open".
- The `.one` variants (`sp.hero.h.one`, `sp.hero.sub.one`, `ph.hero.h.one`, `em.need.one`, `em.subject.one`): plans have 3, 6 or 9 agents, so they never show. `sp.hero.scroll.one` is different: it counts parts, and a plan can have just one (D37).
- `r.legend.centre` ("Business Spine · live demo"): it puts "live" next to the Spine.

---

## 5. Templates and tiers

### 5.1 Where the data lives
- `funnel/agents-33.json`: the 33 agents, the 137 jobs, each job's status, the priority lists, the fallback lanes and Ananya's worked example. Its `vertebra` field becomes `number` on the way into the repo: the agent's place in the full spine, 1 to 33 (D1, default, owner can veto).
- `funnel/templates.md` §1: the phrase lists (English, Hinglish and Devanagari) and the normalising rules. §2 takes the wording in §6.7.
- The disc map in §6.7.
- All of it is copied into `src/features/funnel/data/` in the first release. The page, the server's email builder and the tests import the same module, so the email always says what the page says.
- No AI model picks a template (decision 4). Keywords pick it, on the visitor's device.

### 5.2 Which template
**A tapped chip decides.** If they tapped any chip, the first chip they tapped sets the problem, and their words can only supply the second problem and the quote. Their words set the problem only when no chip was tapped. This replaces the adding-up of chip and text scores in `templates.md` §1, rule 1.

| Chip (S6) | Problem | Template | Order |
|---|---|---|---|
| Not enough leads | lead_gen | B | B-volume |
| Leads don't convert | sales | B | B-convert |
| Follow-ups slip | sales | B | B-convert |
| Ads burn money | ads | B | B-volume |
| I don't know my numbers | numbers | A | A-numbers |
| Payments get stuck | payments | A | A-payments |
| Team chaos | team_ops | A | A-team |
| No time for content | content | A | A-default + content lane |
| Customer support | support | A | A-default + support lane |
| (typed words only) hiring phrases | hiring | A | A-default + hiring lane |
| Nothing matched | unclassified | A | A-default, no lane |

Scoring their words (`templates.md` §1):
1. Clean the text first: mark where each clause ends (rule 3) while the punctuation is still there, then lower case, no punctuation or emoji, repeated letters squeezed, spelling variants joined ("nahin, nai, nhi" → "nahi").
2. A phrase scores its word count, up to 3. The longest phrase wins and uses up its words: "payment follow up" counts for payments, not sales.
3. "Theek hai", "no problem", "sorted" and the like within 4 words of a phrase cancel it, but only inside the same clause. A clause ends at punctuation (`. ! ? ; : ,`, a new line or the danda "।") or at "but", "however", "lekin" or "magar" (also लेकिन and मगर). So "Billing is sorted, but our reels need work" reads as content (D35, default, owner can veto). A plain "nahi" cancels nothing, because that's how Hinglish states a problem.
4. With no chip tapped, the top score is the problem. On a tie, the problem mentioned first in the text wins.
5. **The second problem.** Other chips score 5 each and phrases score as above. The best problem after the first is saved if it scores at least half of the first one's score, where a chip that set the problem counts 6. It's never shown (D12, default, owner can veto).
6. No chip, and either no match or fewer than 4 words: template A, A-default, tagged `unclassified` so the team can read what they wrote.

### 5.3 Size of the plan: the tier
- **From team size:** Just me or 2–5 → S. 6–20 → M. 21–50 or 50+ → L.
- **Revenue moves it one step at most:** the lowest band (under ₹25L, or under $250k) moves M or L down one; the top two bands (₹5Cr and up, or $5M and up) move S or M up one. "Rather not say" leaves it alone.
- **Rupees or dollars (D10, default, owner can veto):** rupees when the visitor's country is India. The country comes from Vercel's location header, returned by the first background save; if that's unknown, the device's time zone decides (Asia/Kolkata or Asia/Calcutta means India). Everyone else gets dollars.
- **Agents in a plan:** S needs 3, M needs 6, L needs 9. So {n} is always 3, 6 or 9.

### 5.4 Which agents a plan needs
Each order has a priority list of 9 agents (agent · number in `agents-33.json`, the number being the agent's place in the full spine). Tier S takes rows 1–3, M rows 1–6, L all 9.

| # | A-default, A-payments | A-numbers | A-team | B-convert | B-volume |
|---|---|---|---|---|---|
| 1 | Collections agent · 29 | Numbers agent · 30 | Client updater · 26 | Enquiry responder · 16 | Marketing analyst · 6 |
| 2 | Numbers agent · 30 | Collections agent · 29 | Memory keeper · 27 | Reply sorter · 17 | Content maker · 7 |
| 3 | Client updater · 26 | Client updater · 26 | Office assistant · 32 | Call companion · 18 | Enquiry responder · 16 |
| 4 | Data mover · 25 | Data mover · 25 | Collections agent · 29 | Campaign runner · 15 | Reply sorter · 17 |
| 5 | Records keeper · 31 | Records keeper · 31 | Numbers agent · 30 | Marketing analyst · 6 | List builder · 12 |
| 6 | Office assistant · 32 | Office assistant · 32 | Data mover · 25 | Numbers agent · 30 | Numbers agent · 30 |
| 7 | Memory keeper · 27 | Memory keeper · 27 | Records keeper · 31 | Pipeline keeper · 20 | Publisher · 9 |
| 8 | Kickoff agent · 24 | Kickoff agent · 24 | Kickoff agent · 24 | Proposal maker · 19 | Ideal-client finder · 11 |
| 9 | Support desk · 21 | Support desk · 21 | Support desk · 21 | Collections agent · 29 | Call companion · 18 |
| **Jobs at S / M / L** | 10 / 23 / 34 | 10 / 23 / 34 | 9 / 22 / 34 | 14 / 26 / 39 | 18 / 31 / 44 |

- Names are the plain names in `copy.md` (`ag.*`). The job counts were re-checked against `agents-33.json` on 7 Oct.
- **Lanes:** content, support and hiring plans use A-default, and the lane's agent takes the last place in the plan unless it's already in: content → Content maker (7), support → Support desk (21), hiring → Hiring assistant (33).
- **B at tier S has no Back Office agent** (D11, default, owner can veto). The Numbers agent comes in at M.

### 5.5 Scroll order
- Departments appear in the order of their highest-priority agent in the plan. Inside a department, agents go in list order.
- From phase 1b, on desktop the spine and the text swap sides at each stop, as in the approved sketch, starting with the spine on the left.
- A plan with a single part (B-convert at S needs only Deals) must work.

### 5.6 The three marks
Status belongs to each job, never to an agent. No agent is "running": the most any agent has is the Reply sorter, with 2 of its 5 jobs.
- ● **Runs on our own company today.** Only these 6 jobs: List Building, Company Deep-Dive, Meeting Booking, Post-Call Debrief, Reply Classification, Hook Writing.
- ◐ **We build it for you.** These 9 jobs: Payment Tracking, Collections, Status Updates, Revenue Reporting, Document Extraction, Speed-to-Lead, Lead Qualification, Follow-Up Drafting, Call Capture. The owner confirmed all 9 are deliverable (decision 16). Call Capture is tested, not yet on a real call.
- ○ **Mapped, not built yet.** The other 122.

### 5.7 Headline variants and the Pilot tag
- Unclassified plans use `sp.hero.h.fallback` (and `em.need.fallback`, `em.subject.fallback`). Every other plan uses `sp.hero.h`.
- The `.one` variants that count agents stay out of the repo (§4.5), because plans have 3, 6 or 9 agents. `sp.hero.scroll.one` counts parts, and B-convert S and hiring S have one part each, so it ships (D37).
- **Pilot (decision 19):** B-convert and B-volume plans carry `sp.pilot`, `sp.pilot.note` and `em.pilot`.

### 5.8 Worked example: Ananya
Interior designer, 5–10 years, team of 6–20, ₹1–5Cr. She said: "Enquiries come in, but by the time someone calls back they've gone cold." That matches "calls back" and "gone cold", so the problem is sales: template B, B-convert, tier M. That's **6 agents and 26 jobs: ● 3 · ◐ 5 · ○ 18**, and the plan is a pilot.

| Stop | Department | Agents she needs | Jobs inside |
|---|---|---|---|
| 1 of 4 | Deals (quotes her words) | Enquiry responder · Reply sorter · Call companion | 14: ● 3 · ◐ 4 · ○ 7 |
| 2 of 4 | Sales | Campaign runner | 4: ○ 4 |
| 3 of 4 | Marketing | Marketing analyst | 4: ○ 4 |
| 4 of 4 | Back Office | Numbers agent | 4: ◐ 1 · ○ 3 |

From phase 1b her plan lights four discs, G04 Deals, G05 Sales, G06 Marketing and G01 Back Office (§6.7).

---

## 6. The plan

### 6.1 Where it lives
- **At `/`,** as the step after S8. There's no plan URL (D8, default, owner can veto), so no plan reaches search results and nobody can open another person's.
- **How it's built:** the visitor's device works the plan out from their answers. The server gets the same answers with the lead and builds the email from the same data module.
- **A reload** starts the questions again, and their plan is in their inbox. In phase 2 the device keeps the plan, and R shows it at `/` (§4.3).
- **Both themes** (D9), with a desktop layout and a phone layout.
- **The tab title** while the plan is on screen is `seo.plan.title`.

### 6.2 Top to bottom
The first release shows the spine as a live 3D model that the visitor turns by dragging, with the plan in words (§6.6). The r17 still paints first and is the fallback. D2's pre-rendered phase 1b (lit discs and the scroll) was vetoed on 8 Oct 2026, so the right-hand column below is kept only as the record of that option.

| # | Block | Copy IDs | The spine, first release | The spine, from phase 1b (superseded by the D2 veto, §6.6) |
|---|---|---|---|---|
| 0 | Header | The real logo with `nav.home.aria` (decision 17), `nav.mission`, `nav.who`, `nav.products`, `nav.btn` (D14, default, owner can veto). Phone: logo, `nav.btn`, `ph.nav.menu` | — | — |
| 1 | Hero | `hx.eyebrow`; `hx.h1` and `hx.h2` (the second line toned down: grey in light mode, a blue-white gradient in dark); `hx.p`; `hx.btn1` "Book a call"; `hx.btn2` "See how it works"; the stats `hx.stat1.*` to `hx.stat3.*`; the callouts `hx.call1.*` and `hx.call2.*` (desktop only), both right of the spine, `hx.call1.*` level with the Sales disc (G05) and `hx.call2.*` level with the Customer disc (G03), because the words hold the left 55 % (D39, default, owner can veto; this replaces `copy.md`'s "upper left of the spine" for `hx.call1.n`); `hx.scroll`; alt text `hx.alt.light` or `hx.alt.dark`. Phone: `ph.hx.h`, `ph.hx.p`, `ph.hx.stat2.l`, `ph.hx.scroll`. On a phone the words come first, on the page colour in the copy's own colours; the spine sits below them at full strength; the stats row and `ph.hx.scroll` close the hero under the spine (D34) | The r17 still paints first, every disc lit, as approved; on a phone, a band of it with four lit discs, under the words. After the first paint the live 3D model takes the still's box and turns under a drag (§6.6). With no WebGL the still stays | The same still. It doesn't turn or follow the pointer |
| 2 | "You need only {n}" | `sp.hero.eyebrow`, then `sp.pilot` on lead-gen plans; the brain card `sp.brain.label`, `sp.brain.tip`, `sp.brain.live` (D3, default, owner can veto); `sp.hero.h`; `sp.hero.sub`; `sp.hero.honest`; `sp.pilot.note` on lead-gen plans; `sp.legend.jobs` with the three marks (`r.legend.live`, `r.legend.build`, `r.legend.mapped`); from phase 1b also `sp.legend.today` and `sp.legend.later`; `sp.hero.scroll`, or `sp.hero.scroll.one` when the plan has one part (D37, default, owner can veto). Phone: `ph.hero.*`, `ph.brain.label` | None. The still stays in the hero, and this block is text | The camera stays put, with every department disc in frame, and only the light changes. The plan's discs stay lit; the others, end discs included, dim to 12 % of their glow (D28). Each lit disc gets one callout, `sp.disc.call`, and the brain card heads the callout column |
| 3 | One stop per department in the plan (§5.5) | `sp.part.count`; the department's heading and tag from `dp.*` (no tag on phone); `dp.*.words` or `dp.*.why` (§6.3); `sp.part.agents` with the plan's agents in this part (`ag.*` name and line); `sp.part.jobs` with each job and its mark; `sp.part.rest` with the part's other agents. Phone: `ph.part`, `ph.vert.jobs` (job lists start closed) | None; the stop is text | The camera closes in on that department's disc, which keeps its callout, and between stops it pulls back to the full spine first (D30). The same discs stay lit, and the disc in focus doesn't get brighter. Desktop swaps sides at each stop; on a phone the spine holds the top of the screen and the words sit on a card under it |
| 4 | Close | `sp.later`, `sp.later.sub`, `cta.h`, `sp.cta.lead`, `cta.btn`, `cta.sub`. Phone: `ph.later`, `ph.cta.lead` | — | — |
| 5 | Footer | The site footer | — | — |

**Opening a disc (from phase 1b, desktop).** Each department disc is a button laid over the frame. Its hit area is the disc's box in the frame on screen (from `discs.json`, §6.6), padded to at least 44 × 44 px, and the end discs have none. Hover, tap or keyboard focus opens a small panel: `sp.vert.dept` as its heading, then the department's agents in number order, the plan's own first. Each row shows `sp.vert.title`, `sp.vert.line`, `sp.vert.today` or `sp.vert.later`, `sp.vert.jobs`, and `sp.vert.live` when at least one of its jobs runs. The 7 buttons follow spine order for the keyboard, each labelled with `sp.disc.aria`, and screen readers get the same lists. A hint shows once: `sp.hint.hover`.

**Phones have no disc buttons.** At 390 px wide, neighbouring discs sit 20 to 30 px apart, too close for 44 px targets (§11.3). Each stop's card already lists that part's agents, the plan's first, so a phone needs no panel. Job lists start closed and say "tap to open" (`ph.vert.jobs`), so phones show no hint.

### 6.3 Rules for the page
- **{words}:** their S6 text with the trailing punctuation stripped, cut at 120 characters with "…". It's quoted once, at the stop for the department their problem belongs to, if the plan has that stop, and every other stop uses `.why` (D36, default, owner can veto). The department comes from their words classified on their own, without the chips. A content, support or hiring problem points at its lane agent's department: Content maker (7) in Marketing, Support desk (21) in Customer, Hiring assistant (33) in Back Office. Any other problem points at the department of the first agent in its order. Words that don't classify on their own point at no department, so they're quoted at the plan's first stop. If they typed nothing, every stop uses `.why`. The old rule took the first agent in the order for every problem, which put content words in Back Office.
- **{name}:** as they typed it.
- **Every "Book a call"** (`nav.btn`, `hx.btn1`, `cta.btn`) opens the same Calendly event, `https://calendly.com/ziiro-work/30min`, in a new tab, with their name and email filled in through Calendly's `name` and `email` link parameters. The link comes from `INTERIM_BOOKING_URL` in `src/features/pricing/entities/rates.ts`. `cta.btn` is the only wording at the close.
- **Never on the plan:** a price, the calculator (decision 18), an FAQ, a film block, testimonials or client logos.
- **Lead-gen plans** carry the Pilot tag (§5.7).
- **From phase 1b, nothing glows unless it's lit for this visitor.** Any glow outside a lit disc follows that disc.
- **From phase 1b the plan has a moving version and a still version** (§6.6). Both open on the hero still, and the moving version takes over from it without a jump. The still version is for a device that asks for reduced motion or saves data, a 2G or 3G connection, a browser without AVIF (D33), and any visit where a file of the moving version fails to load. In it, beat 1 is a still with the plan's discs lit, and each stop's close-up swaps in without animation. The words are the same in both.

### 6.4 Phone
- **First release:** the still in the hero, then the plan as text. Lines are the `ph.*` versions; every other line already fits at 390 px. Job lists start closed (`ph.vert.jobs`).
- **The phone hero stacks** (D34). The words come first, on the page colour in the copy's own colours. The spine sits below them at full strength, in a band cut from the tall phone framing of r17 (§6.6). The stats row and `ph.hx.scroll` close the hero under the band. Nothing sits on the model, as on the phone tour.
- **From phase 1b:** no side swap. The spine holds the top of the screen in a 780 × 820 strip cut from the same renders, and only the left-side camera moves play. The words sit on a card under it. Callouts are dropped, because the stats row and the cards say the same thing. The discs aren't buttons (§6.2).

### 6.5 The film
- **`hx.btn2` "See how it works"** opens a lightbox titled `r.film.title`. It plays the Business Spine launch film (D5, default, owner can veto). The poster shows first; the film plays with sound once opened and can be paused or closed. The close button says `r.film.close` (D38, default, owner can veto).
- **The files** are `funnel/film-trim/spine/out/ziiro-business-spine-{master,phone}.mp4` and `-poster-1080.jpg`: 56.73 s, the same frames and audio as the live film, so they drop in.
- **Before launch** one string changes in `funnel/film-trim/spine/film.html` line 882: "Brain · 9 jobs live", which shows in capitals, becomes "Brain · live". Then a re-render with `render/film.cjs` (about 17 minutes) and `render/web.py`. Lane D owns it, on day 1 of phase 1 (§13.7). If it isn't done by launch, `hx.btn2` stays hidden until it is.
- **Every other "brain" in the film stays.** There the brain is the part that answers questions about a business, which is live (Appendix A).
- **The "Qualified" film** is not on the plan. It plays only on /ai-lead-generation (phase 3), with `rb.film.label` on the video itself.

### 6.6 How the r17 look ships on the web
**The live 3D spine (D2 vetoed on 8 Oct 2026).** This block overrides everything below it in §6.6 where they disagree. The owner's words: "the whole thing which I asked for you to create that 3d looking website ... why did i generate 3d models if I wanted to ship the still image."
- **Source.** The owner's Tripo model `funnel/proto/look/owner-models/owner-spine-full-clean.glb` (glTF 2.0, generator Tripo, 67.8 MB). The original files are never edited. The page ships a web derivative of it, reduced and compressed, under `public/spine/3d/<version>/`, cached for a year as immutable like `/spine/`. A new derivative goes into a new folder.
- **First paint.** Unchanged on the hero and the plan: the hero `<picture>` with the r17 still (below) is the LCP element. S0 has no still (see "S0" below). The 3D code is a lazy chunk, imported only after the first paint. No WebGL context exists before then.
- **Hand-over.** The canvas takes the still's box, with the same size and no layout shift. Its first frame uses a camera matched to the r17 hero camera, and it fades in over the still only once that frame has rendered. Until then the still shows.
- **The drag is real.** One finger on a phone and the mouse on desktop turn the model in real time. On touch, a vertical swipe still scrolls the page (`touch-action: pan-y`), so only a sideways drag turns it. The model isn't in the Tab order and takes no keys: nothing on the page needs a turn to be read (§11).
- **Reduced motion** keeps the live model, with no automatic turning and no inertia. The visitor's own drag still works.
- **The still is the fallback.** It stays, and the 3D never starts or stops cleanly, when: WebGL is missing or context creation fails (`still_reason` = unsupported); the device saves data (save_data); the connection is 2G or 3G (slow_connection); or the chunk or the mesh fails to load, or the context is lost (failed). §9 records which.
- **Software renderers (W14-X).** No viewer runs its 3D on a software renderer (SwiftShader, llvmpipe, softpipe, Windows WARP: what a low-end phone with weak or no GL, or a GPU-less VM, falls back to). Before any 3D code loads, a 1×1 WebGL2 context in a small worker reads the renderer's name and is given straight back (a worker, because the first context can take over a second to make on a software renderer and a tap made meanwhile would wait; browsers without OffscreenCanvas probe on the main thread). On a software renderer the hero and the tour keep the r17 still and record the fallback as `software-gl`; on SwiftShader the plan's 3D cost 3–10 s per tour tap on a phone (worker-2, W14-S).
- **The idle spin (W14-O).** The spin stops for good if the median of its first 30 frames is over 33 ms, runs at 30 fps at most on a phone, and pauses while the page is out of focus. With the scene in a worker, the worker reports its own frame time with each frame (W14-U M1): the main thread's frames say nothing of the GPU there. A drag, a fling and a flight always draw.
- **S0 (W14-I, W14-R).** On S0 the live spine is a fixed layer under the greeting and S1 that never takes part in layout: from 1200 px it stands in the gutter right of the questions, under that it is a band along the bottom, with a soft page-colour plate behind `g.about` and the footer note so no text sits on it. All nine discs glow. It has no still: the greeting stays the LCP, and when the 3D can't run the layer shows nothing, never an empty box. The first tap must never wait on it, so it starts in this order:
  1. the same checks as everywhere: Save-Data, a 2G or 3G connection, or no WebGL2 means nothing loads;
  2. it waits for the LCP and one second more, then for idle time (with a 2-second deadline). Where no LCP comes within `NO_LCP_MS` (3 s), or the browser reports none (a page loaded in a background tab never does), the first paint stands in for it: two frames, which don't come while the tab is hidden, so a page shown later starts two frames after it is shown, then waits the same second and idle time;
  3. the software-renderer probe above (in a worker) reads the renderer's name. On a software renderer it stops there, before any 3D code or the mesh loads (`software-gl`);
  4. otherwise the 3D chunk and the mesh load as on the hero.

  A press on an S1 option, or Enter/Space on one, before its first frame means the visitor is leaving S0 (a Tab, an arrow key, a drag in the gutter or a touch-scroll doesn't count). The press is recorded from the page's own bundle on, so it counts even when it lands before the lazy layer mounts (W14-X: a phone tap at about 470 ms once let the 3D load anyway), and a worker that hasn't drawn yet is ended at once, so its script and mesh downloads stop: the 3D gives up there and doesn't come back on that screen. After its first frame it stays. Leaving S0 fades the layer out over 300 ms and then unmounts it, which frees the scene and gives its WebGL context back; Back to S0 mounts it afresh. S0 sends no `plan_view`.
- **Budgets (§13.10).** The mesh streams after the first paint: 1.5 MB or less on a phone and 3 MB or less on desktop, as transferred. The lazy 3D chunk has its own limit. LCP 2.0 s and INP 100 ms are unchanged, and INP includes a real first tap made while the 3D is loading; §13.10 says how each gate is judged.
- **The look is the owner's call.** He approves it by eye, from worker-3's sheets and on his own phone on the Preview (§13.8 B8). No metric stands in for that.
- **Replaced.** The phase 1b lit-disc stills (one base plus glow layers on a canvas) and the scroll sequence (12 pre-rendered push-ins per theme) are replaced by the live model and won't be rendered. What follows below on them is the measured record of that option, not a plan. If plans should light their own discs, that gets specified on the live model.

From worker-2's `funnel/spec-3d.md`. Every number here was measured on its test files in `funnel/proto/look/web/`, and `web/README.md` says how to open them. Light mode is the heavier theme at every size, so light sets the limits.

Before the D2 veto this read: no 3D engine runs on the page, and visitors see pictures rendered from the approved r17 scenes, because real-time 3D can't reproduce a path-traced look. The owner overruled that on 8 Oct 2026 (the block above). The still below stays the first paint and the fallback. A video can't do it either: it carries one lighting state, and scrubbing needs every frame decodable on its own, which an image sequence already is.

**The hero still (phase 1).** On desktop the hero is the approved r17 frame itself: the 3344 × 1882 final, cropped to an exact 16:9 (3344 × 1881) and resized, with nothing re-rendered. On a phone it's a band of the phone framing below.

| File | Light AVIF | Light WebP | Dark AVIF | Dark WebP |
|---|---|---|---|---|
| 2560 × 1440 | 52.8 KB | 89.1 KB | 44.7 KB | 69.9 KB |
| 1920 × 1080 | 36.3 KB | 60.0 KB | 31.4 KB | 49.2 KB |
| 1280 × 720 | 21.2 KB | 33.8 KB | 18.7 KB | 28.7 KB |
| Phone band 1170 × 1230 | 59.2 KB | 85.0 KB | 42.7 KB | 59.7 KB |
| Phone band 828 × 870 | 37.4 KB | 55.9 KB | 28.5 KB | 40.1 KB |

The phone rows are the band from the phone framing below. worker-1 measured them for D34 on worker-2's master render: cut, resized with Lanczos and encoded with the settings below. The same steps give worker-2's full-height 1170 files to within 1.5 %.

- **Encoding:** AVIF with `avifenc -s 6 -q 60 --yuv 444 -d 10`, WebP with `cwebp -q 85 -m 6 -sharp_yuv`. The settings were picked by eye from full-size crops of a quality ladder (`web/tools/encode.py`). AVIF at q45 smears the glow's edge and q55 holds it; WebP at q70 shows blocks in the dark metal and q80 is clean. q60 and q85 sit one step above the lowest clean setting.
- **One `<picture>`.** From 600 px wide it offers the landscape still at 1280, 1920 and 2560 wide, with `sizes="100vw"`. Under 600 px it offers the phone band at 828 and 1170 wide, also with `sizes="100vw"`. The AVIF sources come first, then WebP. Each `<source>` carries its own width and height, so the band's box is reserved too. The `<img>` has width, height, `decoding="async"` and the alt text `hx.alt.light` or `hx.alt.dark`.
- **No 1290-wide phone file** (D31, default, owner can veto). Phones up to 430 wide at 3× get the 1170 file, stretched by up to 10 %. Cut from the band, a 1290 file weighs 68.0 KB in light mode, under the 120 KB limit in §13.10, so it can be added if the owner wants the widest phones sharper.
- **Only the visitor's theme loads.** On `/` the plan is drawn on the device, and its `<picture>` takes the theme the head script already set, so the other theme's files are never fetched. The search pages stay dark (D9), so their HTML holds the dark files.
- **When it loads.** Nothing for the plan loads with the first screen, and the head script writes no hero preload, so the first-screen gates in §13.10 are untouched. At S5 the funnel mounts the hero `<picture>` out of sight, and the browser fetches and caches the same file it shows at S9, at normal priority. On a search page whose first screen shows the still, it gets `fetchpriority="high"`.

**The phone framing.**
- The camera keeps r17's position, aim and roll, so the light, the reflections and the perspective stay the approved ones. Only the lens (68 mm instead of 34.3 mm) and the shift change, so the result looks like a crop of a much bigger r17 frame.
- The master render is 1290 × 2796. It took 68.5 s in light mode and 50.9 s in dark. The column fills its height and runs 6 % past the top and bottom edges, so neither cut end shows. The vertebral bodies end at 95 % of the width, and the processes reach in to 15 %. The full-height test stills are `web/hero/phone-*`.
- **The phone hero is a band of it** (D34, default, owner can veto). On a phone the words come first and the spine sits below them, so the master is cropped to the shape of the tour's strip, 780 × 820: rows 280 to 1636, which is 10 % to 58.5 % of its height. That band holds four discs whole, G06 to G03, and both of its edges fall in gaps between discs. By worker-2's disc boxes for this camera, G07 ends at 9.1 % and G06 starts at 13.0 %; G03 ends at 54.8 % and G02 starts at 62.1 %. The band is resized to 1170 × 1230 and 828 × 870, and nothing is re-rendered.
- **The band sits full width, with square edges, at full strength:** no veil and no fade. The column runs through its top and bottom edges. In light mode its background is about 8 levels darker than the page (#F1F1F1 against #FAFAF8), so it reads as a picture band. In dark mode the two match to within a few levels.
- **On a 390 × 844 phone** the band is 390 × 410 CSS px. Under the words, which end about 480 px down in the sketch, about 350 px of it shows on the first screen.

**Lighting a plan's discs (phase 1b).** One quiet base frame, plus a glow layer per disc, added together on a canvas. We don't bake a frame for each lighting state:
- One base and 9 glow layers make all 9 lit sets in §6.7, and any set a later template needs, with no new renders.
- Baking all 9 sets into every camera move would take about 19 hours of renders instead of 3.7. Baking only the sets that today's tours use would cost about the same as the layers, but then any change to a plan's discs or tour order would need new renders.
- The layers cost little to download. Her glows add 1 to 4 small files to a scroll frame, 3.7 KB in all on desktop.

How the layers are made (`web/tools/layers.py`):
- Each frame is rendered twice from the same camera. The lit render is r17 exactly. The quiet render has every glow switched off and the geometry unchanged.
- The difference between them is the glow and its reflections. Each pixel of it goes to the disc whose own light pass is strongest there, and a wide blur of those passes decides the pixels that no pass reaches.
- Each disc's share goes through r17's own finishing (halo, bloom, grain) and becomes its glow layer, cropped to the area where it adds more than 1.5/255.
- The page draws the base, sets `globalCompositeOperation = 'lighter'`, and draws each lit disc's glow at its box. It's plain canvas 2D, with no WebGL.
- **Quiet discs keep 12 % of their glow** (D28, default, owner can veto). At 0 % they read as black holes; at 25 %, lit and quiet look too alike (`web/sheets/dim-level-{light,dark}.jpeg`). In dark mode the difference is gentler, as r17's blue glow is, and the callouts carry the meaning.

How close the layers come to an exact render of the same lit set, in 8-bit levels:

| Case | Worst pixel | Pixels off by more than 2 levels |
|---|---|---|
| All 9 sets, hero camera, light | 14.6 | 0.015 % or fewer |
| All 9 sets, hero camera, dark | 6.3 | 0.010 % or fewer |
| Ananya's set, all 26 rendered scroll frames, light | 3.5 | 0.0005 % or fewer |
| Ananya's set, all 15 rendered scroll frames, dark | 5.4 | 0.005 % or fewer |

With all 9 discs lit, the layers drift by up to 67 levels where neighbouring halos overlap (about 1 % of pixels). That's why the hero ships as the approved still, not as a base with 9 glows.

Weights at 1920 × 1080 (AVIF / WebP):

| | Light | Dark |
|---|---|---|
| Base frame | 32.2 / 51.3 KB | 30.2 / 45.4 KB |
| One glow layer | 1.0–2.3 / 1.0–3.0 KB | 0.7–1.6 / 0.5–1.8 KB |
| Ananya's lit discs (base and 4 glows) | 38.2 / 58.6 KB | 34.6 / 49.6 KB |
| The same on a phone, 780 × 820 | 28.2 / 40.3 KB | 24.7 / 33.7 KB |

- **Disc boxes.** `web/tools/disc_boxes.py` measures every disc in every frame by §6.7's rule: the box is the 2nd to 98th percentile of the disc's vertices on screen, and the callout anchor is the box's right edge, 20 % down from its top. At the hero camera it matches §6.7's anchors to within 0.0006 of the frame. The callouts and the desktop disc buttons take their places from these boxes, and each button pads its box into its hit area.
- **From the hero to beat 1.** On desktop, beat 1 uses the hero camera, so nothing moves. As she scrolls past the hero, the canvas cross-fades from the hero still to the base with her glows, and the discs outside her plan fade down to 12 %. On a phone the hero's band scrolls away with the hero, and beat 1's strip takes the top of the screen (§6.4). Beat 1's base and her glows load at S8, once her plan is known.

**The scroll (phase 1b).** Frames rendered in advance and drawn on a canvas, with her glow layers added on every frame.
- **12 camera moves per theme.** Each tour disc, G01 to G06, gets a push-in from the hero camera to a close-up of that disc. Desktop stops alternate sides, so each disc gets two: one ends with the spine on the left third (stops 1 and 3), the other with the spine on the right third (stops 2 and 4).
- **Pull back between stops** (D30, default, owner can veto). Between two stops the page plays the last push-in backwards to the hero view, then the next one forwards. Every tour order in `templates.md` comes from the same 12 push-ins, and going backwards downloads nothing new.
- **24 positions per push-in** (D29, default, owner can veto). Position 0 is beat 1's picture, which is already loaded. Positions 1 to 22 are on the way, and position 23 is the close-up the stop rests on. They sit at equal steps of on-screen movement: about 35 px per step at 1920 for the fastest disc, and about 11 CSS px on the phone strip. A 12-frame test spaced evenly in time jumped up to 114 px per step in the middle, which is too coarse.
- **Easing.** Scroll progress `p` becomes `3p² − 2p³`, so each stop holds still at both ends. Between two positions the canvas cross-fades. When scrolling stops for 150 ms, it settles on a whole frame.
- **Desktop sizes.** Frames on the way are 1280 × 720 (AVIF q50), drawn up to the canvas. The close-up is 1920 × 1080 (AVIF q60).
- **Phones** see a 780 × 820 strip cut from the same renders. The strip follows the camera, from the department discs to the close-up disc at full size. On the way it's stored at 520 × 547 in AVIF q45 (D32, default, owner can veto): at display size q40, q45 and q50 looked the same by eye, and q45 keeps one step of margin and saves 14 % against q50. At rest it's 780 × 820 (AVIF q60). Phones use only the left-side push-ins.
- **Glow strips.** Each push-in has one strip per disc: a single image packing that disc's glow for positions 1 to 22, with a table of where each piece goes. A visitor fetches one strip per lit disc per stop, four at most. The close-up's glows are separate small files.
- **AVIF only** (D33, default, owner can veto). Only browsers that show AVIF get the moving version. The rest get the still version below, so WebP is needed only for stills.

Measured weight per stop (AVIF):

| Per stop | Desktop, light | Desktop, dark | Phone, light | Phone, dark |
|---|---|---|---|---|
| 22 frames on the way | 352 KB (16.0 KB each) | 330 KB (15.0) | 222 KB (10.1) | 201 KB (9.1) |
| The close-up frame | 44.4 KB | 35.9 KB | 32.3 KB | 24.7 KB |
| Her glow strips (4 discs) | 81.4 KB | 60.4 KB | 61.6 KB | 46.4 KB |
| Her glows at the close-up | 8.3 KB | 5.7 KB | 6.9 KB | 4.9 KB |
| **One stop** | **486 KB** | **432 KB** | **322 KB** | **277 KB** |
| **Ananya's tour, 4 stops** | **1.94 MB** | **1.73 MB** | **1.29 MB** | **1.11 MB** |
| Limit (§13.10) | 3 MB | 3 MB | 1.5 MB | 1.5 MB |

- No plan weighs more than Ananya's: it has the most lit discs (4) and the most stops (4). Every other plan has 1 to 3 stops.
- A frame costs about 21 KB on desktop (19.7 KB on the way, of which 3.7 KB is glow, and 52.7 KB at the close-up) and about 14 KB on a phone (12.9 KB on the way, 39.2 KB at the close-up). The old estimate of 48 KB assumed every frame at full size.
- These numbers come from the Deals push-in (G04, left side) in both themes. The other push-ins use the same camera move and frame sizes. Frames on the way are the test's average frame times 22: the light test has 21 frames on the way and the dark test 10, so the dark glow strips are doubled to cover 22 positions. The phone columns use the test's 520-wide frames re-encoded at q45. At the q50 that the files in `web/seq/` keep, Ananya's phone tour would be 1.43 MB in light mode, still under 1.5 MB.

Loading and decoding:
- Nothing for the scroll loads until S9 paints. Stop 1's push-in is fetched once beat 1 is on screen, and stop k+1's when she reaches stop k. Within a push-in, her strips come first, then the frames in scroll order. Until the right frame arrives, the page draws the nearest one it has.
- Frames decode off the main thread, with `createImageBitmap(blob)`. The page keeps at most 9 composed frames (the current one, plus 4 on each side) and closes the rest: about 33 MB at 1280 × 720 on desktop and 23 MB at 780 × 820 on a phone.
- Measured in Chrome on the Mac: one frame decodes in 5.5 ms at 1280, 11.4 ms at 1920 and 2.6 ms for a 520 phone frame (light, median of 12), and WebP decodes 23 to 33 % faster. At 390 × 844 with the CPU slowed 4×, the scroll test ran at 120 frames a second, the display's limit; the slowest frame took 17 ms, and there was no long task. On desktop the slowest frame took 10 ms.
- There's no flicker. Three frames 1/60 of the path apart, cropped at full size, show the same reflections and glow, shifted smoothly, with no noise popping (`web/sheets/flicker-light-3-frames.jpeg`).

**Readability.** On desktop the words sit beside the spine:
- In the hero frame the model's body starts at 58 % of the width in dark mode and 62 % in light, at every height from 10 % to 90 %. The text column stays left of 55 %.
- There the copy's own colours pass WCAG AA. The lowest is the eyebrow: 5.24 in light (#5F646B) and 6.57 in dark (#A9B3C2), against a floor of 4.5.
- At a tour stop the words take the side away from the spine. In the left-side close-up the model fills 3 % to 55 % of the width, so the words start at 58 %. The right-side close-ups mirror this, and each right-side end frame gets the same check when it's rendered.

On a phone no text sits on the model:
- **The hero stacks** (D34). Its words come first, on the page colour, in the copy's own colours, and the stats row and `ph.hx.scroll` sit under the band. On the page colour every colour passes. The lowest in light mode is the eyebrow and the grey second headline line, #5F646B on #FAFAF8, at 5.71. In dark mode it's the eyebrow, #A9B3C2 on #060911, at 9.40. The floors are 4.5, and 3 for the large headline. The dark gradient's darkest stop, #B9CCF2, measures 12.31. These are plain WCAG contrast ratios of each colour on the page colour.
- **Why not words over the spine.** worker-2 measured that layout first. The words needed a page-coloured veil at 66 % and darker inks to pass, and the veil washed the middle of the spine to grey (`web/sheets/phone-readability-{light,dark}.jpeg`), so it isn't used.
- **The tour:** the words sit on their own card below the spine strip, and the callouts drop (§6.7).
- **Anything else** that would sit on the model gets a card.

**The still version (phase 1b).** It's for a device that asks for reduced motion (`prefers-reduced-motion: reduce`) or saves data (Save-Data), a 2G or 3G connection, a browser without AVIF (D33), and the rest of any visit in which a file of the moving version fails to load:
- Nothing scrubs or cross-fades.
- Beat 1 is a still: the base with her glows.
- Each stop shows its close-up still (position 23 with her glows) when its words come into view. It swaps without animation.
- Only those stills are downloaded: about 53 KB per stop on desktop and 39 KB on a phone (light, AVIF). They come in WebP too.
- The words and the button are the same as in the moving version.

The first release ships neither version: it has the hero still as the first paint, the live 3D model after it, and the words (the block at the top of §6.6).

**What the build gets.** Every file goes under `public/spine/r17/`. The files never change once rendered, so `vercel.json` caches `/spine/` for a year as immutable (lane B, §13.7), and a new render goes into a new folder.
```
public/spine/r17/{light,dark}/
  hero/   hero-{1280,1920,2560}.{avif,webp}  phone-{828,1170}.{avif,webp}           phase 1
  beat1/  d1920/ and p780/: base.{avif,webp}  glow-G00 … glow-G08.{avif,webp}  layers.json  discs.json
  push/{G01…G06}-{left,right}/
      d1280/  f01 … f22.avif   glow-G00 … glow-G08.avif (strips)         desktop, on the way
      d1920/  f23.{avif,webp}  glow-G00 … glow-G08.{avif,webp}            desktop close-up
      p520/, p780/  the same for the phone (left push-ins only)
      manifest.json  discs.json
```
- Storage, both themes: about 1.6 MB of stills, 0.9 MB of which is the hero that ships in phase 1, and about 19 MB of push-ins.
- `layers.json` is `{"size": [1920, 1080], "quiet": 0.12, "sprites": [{"name": "glow_G04", "box": [x, y, w, h]}]}`, in pixels, origin top left.
- `manifest.json` holds, per size, `frames: [{i, w, h, window}]`, where `window` is the phone strip's crop in 1920 px, and `glow.Gnn.rects[i] = [sx, sy, w, h, dx, dy]`: where frame i's glow sits in the strip and where it goes on the frame, or `null`.
- `discs.json` is what `disc_boxes.py` writes: `{size, rule, frames: [{i, discs: {Gnn: {box: [x0, y0, x1, y1], anchor: [x, y], in_front}}}]}`, in fractions of the frame. On the phone strip, the boxes map through the frame's `window`.
- To draw a frame: draw the base at frame size; set `ctx.globalCompositeOperation = 'lighter'`; then draw each strip piece with `ctx.drawImage(strip, sx, sy, w, h, dx·k, dy·k, w·k, h·k)`, where k is the canvas width divided by the frame width.
- `web/test.js` is a working reference in plain JavaScript with no dependencies. It covers the hero picture, the 9 sets, the scroll with cross-fade and settle, the still version's swap, and the bench. The phase 1b build is tested against it (§12).

**How the files are made.**
- The tools are in `web/tools/`, listed in the README. They run Blender 5.2.2 with Cycles on Metal, 192 samples and the scene's own denoiser, all as in r17. Every Blender run goes through `with-render-lock.py`.
- Render time per frame, lit plus quiet: 61.3 s in light and 27.8 s in dark at 1920 × 1080; 30.3 s and 15.5 s at 1280 × 720.
- The batch is 12 push-ins, each with one close-up at 1920 and 22 frames at 1280, in both themes. Rendering takes about 3.7 hours. Splitting into layers takes 46 s per 1920 frame on one core, and running 3 at a time adds about an hour. Packing takes about a minute per push-in. worker-2 runs the batch during phase 1, off the critical path (§13.7).
- The camera move copies the Deals push-in from the test: an orbit of 15° around the column, a dolly from 1.64 to 0.90 scene units, the lens going from 34.3 to 40 mm, and the aim easing onto the disc, all on one ease. The other discs reuse it, aimed at their own disc.
- Before the batch, each end frame gets a check by eye, with `disc_boxes.py` for each disc's position: the disc sits on its third; the words' side is clear; and the cut ends stay out of view (§6.7). G01's close-up must sit high enough that the half vertebra under G00 stays out of frame, and G06's low enough for the one above G08.

**Checked, and how to repeat it.**
- Layer accuracy: `layers.py … --check "1;1,2;1,2,3;1,3;1,6;1,2,6;4;4,6;1,4,5,6"` at the hero camera, in both themes, gives the accuracy table above. `--check "1,4,5,6"` covers every scroll frame.
- Callout anchors: `disc_boxes.py` at the hero camera agrees with §6.7's table to within 0.0006.
- The page: serve `web/`, open `?theme=light` or `?theme=dark`, and run `__decodeBench()` and `__scrollBench(4000)` in the console. The phone numbers used Chrome's 390 × 844 phone emulation with the CPU slowed 4×. The hero picked `phone-*-1170.avif` on the phone at 3×, and the 2560 still on a 1200-wide window at 2×.
- Readability: `readability.py <still> <theme> <out> strong` gives the desktop numbers above. The phone hero's numbers are each colour's WCAG contrast on the page colour, since no phone text sits on the model.
- The phone band: crop rows 280 to 1636 of worker-2's 1290 × 2796 master, resize with Lanczos to 1170 and 828 wide, and encode with the settings above. The same steps on the full master give worker-2's full-height 1170 files to within 1.5 %.

### 6.7 The 33 agents on the owner's 10-vertebra model
From worker-3's `funnel/spec-33.md`. Map image: `funnel/spec-33-map.jpeg`.

**The pick (D1, default, owner can veto).** The owner's model has 10 vertebrae with 9 glowing discs between them. The full Business Spine is 33 agents in 7 departments, so each department gets one disc: the 7 middle discs, in spine order, Intelligence at the top and Back Office at the base. When a plan opens, the discs of the departments that hold its agents stay lit, and those agents are named next to each lit disc and in the text. The two end discs belong to no department. Nothing gets rebuilt: his model and the r17 look ship as approved, and his GLB is never edited. Each agent keeps its number from 1 to 33, which is now its place in the full spine instead of a vertebra.

**The ways we looked at**

| # | Way | Verdict |
|---|---|---|
| 1 | Extend his model to 33 vertebrae in the scene by stacking copies of his own vertebrae (the GLB stays untouched). It keeps one vertebra per agent. But his mesh is one fused piece, and his processes reach past each disc into the next vertebra, so any cut at a disc slices through them and leaves a seam. 33 vertebrae also need two finished ends, and copies break his own rule that no two vertebrae are the same (wave 6b). Showing a plan then needs a pulled-back view of all 33, a picture he has never seen | Slowest. Kept as the fallback if he vetoes |
| 2 | One disc per department, with the agents named beside it. It needs no new geometry: in r17 each of his 9 discs already has its own light group. The 27 possible plans come down to 9 lighting patterns | **Picked.** Fastest, every line stays true, his look is untouched |
| 3 | One disc per agent needed. His 9 discs match the 9-agent maximum, so a plan of 6 lights 6 discs. But the picture then says "6 of 9" while the words say "6 of 33", and the department order is lost | Not picked |
| 4 | Re-label the same discs at each department stop, so they pose as agents 11 to 19, then 16 to 24. The first scroll beat can't show a whole plan at once: Ananya's agents run from number 6 to 30 | Not picked |
| 5 | Split each department's disc into one arc per agent. Arcs on the far side are hidden, it changes his glow, and it doesn't read from across a room | Not picked |
| 6 | A flat scale of 33 marks beside the spine, with the visitor's agents lit. It shows 33 literally, but it puts a new element next to his picture and says nothing the callouts don't | Not picked |
| 7 | His close-up model for the department tour. It has 3 discs, and departments have 3 or 5 agents | Not picked |

**Which disc is which.** Disc IDs are the gap numbers in `owner-models/full-gaps.json`, G00 at the bottom and G08 at the top. In the r17 scenes each disc is its own object (`glow-G00` to `glow-G08`) with its own light group (`glow_G00` to `glow_G08`).

| Disc | Department | Agent numbers | Callout anchor in the r17 frame (x, y) |
|---|---|---|---|
| G08 | none (end disc) | | 0.789, 0.035 |
| G07 | Intelligence | 1–5 | 0.777, 0.097 |
| G06 | Marketing | 6–10 | 0.766, 0.189 |
| G05 | Sales | 11–15 | 0.759, 0.287 |
| G04 | Deals | 16–20 | 0.756, 0.392 |
| G03 | Customer | 21–23 | 0.759, 0.502 |
| G02 | Operations | 24–28 | 0.769, 0.618 |
| G01 | Back Office | 29–33 | 0.784, 0.744 |
| G00 | none (end disc) | | 0.807, 0.887 |

Anchors are fractions of the 3344 × 1882 frame, with y measured down. Each one sits at the right end of the disc's visible front band. Light and dark share one camera, so the numbers hold for both. All 7 department discs sit well inside the hero frame: the top one's band is 9.7 % down from the top edge, the bottom one's 74.4 % down. The end discs touch the model's cut ends, which is why they carry no department.

The build's data gets one field for this:
```json
{"disc": {"Intelligence": "G07", "Marketing": "G06", "Sales": "G05", "Deals": "G04", "Customer": "G03", "Operations": "G02", "Back Office": "G01"}, "end_discs": ["G08", "G00"]}
```

**What the visitor sees, from phase 1b**
1. Hero (`hx.*`). Every disc glows, all 9, as in the approved r17. The callout "33 · AI agents" labels the whole spine, the way it does in his own image. On a phone the hero shows a band of the spine under the words, with four of the discs, all lit (§6.6).
2. First scroll beat (`sp.hero.*`). The camera stays put: every department disc is already in frame, so there is no pull-back. The discs of the departments that hold the visitor's agents stay lit. The others dim to 12 % of their glow (D28), and so do the end discs. Each lit disc gets one callout with the department, how many of its agents the visitor needs, and their names.
3. Department tour (`dp.*`, `sp.part.*`). One stop per lit department, in the order `templates.md` already sets. The camera closes in on that department's disc, which keeps its callout, and pulls back to the full spine before the next stop (D30). The same discs stay lit as in beat 1. The text column keeps its structure: the visitor's agents in this part as cards, then "Also in this part, for later".
4. Close (`sp.later`, `cta.*`). Unchanged.

From beat 1 to the end, the same discs stay lit. At each stop the callout and the text say which part is in focus; the disc doesn't get brighter. On a phone the callouts drop, as they already do in the hero. The lit discs show in the spine strip, and the names are in the text.

Ananya (B-convert, tier M, 6 agents) in beat 1 has four lit discs and six names:

| Disc | Callout |
|---|---|
| G04 Deals | 3 of 5 · Enquiry responder · Reply sorter · Call companion |
| G05 Sales | 1 of 5 · Campaign runner |
| G06 Marketing | 1 of 5 · Marketing analyst |
| G01 Back Office | 1 of 5 · Numbers agent |

G07 Intelligence, G03 Customer, G02 Operations and both end discs are dim. The tour runs Deals, Sales, Marketing, Back Office, as before.

**Every plan on the discs.** The templates make 27 plans: 6 templates × 3 tiers, plus 3 fallback lanes × 3 tiers. Between them they light only 9 different sets of discs.

| Discs lit | Plans |
|---|---|
| G01 | hiring lane, S |
| G01 + G02 | A-default, A-payments, A-numbers and A-team at S and M; hiring lane at M and L |
| G01 + G02 + G03 | A-default, A-payments, A-numbers and A-team at L; support lane at M and L |
| G01 + G03 | support lane, S |
| G01 + G06 | content lane, S |
| G01 + G02 + G06 | content lane, M and L |
| G04 | B-convert, S |
| G04 + G06 | B-volume, S |
| G01 + G04 + G05 + G06 | B-convert and B-volume, M and L |

What the table settles:
- A callout never lists more than 5 names, because no department has more than 5 agents.
- Intelligence (G07) never lights in a plan, only in the hero. The tour needs close-ups for G01 to G06 only.
- Template A lights the same two discs at S and M (Back Office and Operations). The callouts carry the difference, 3 names at S and 6 at M, so the tiers stay as they are.

**What the 3D delivery had to provide, and how §6.6 meets it:**
- A lit or dim switch for 8 parts: each department disc, G01 to G07, plus the two end discs together (G00 and G08, lit only in the hero). r17 already gives every disc its own light group. §6.6 renders a glow layer for each of the 9 discs over one quiet base, so any set lights from the same files. The hero is the approved still, so the end discs light there and nowhere else.
- If whole frames were baked instead of glow layers, 10 lighting states would cover the page: the hero with all 9 lit, and the 9 sets above. §6.6 doesn't bake, so those 10 states come from the hero still, one base and 9 layers.
- Every shipped frame comes with each disc's box on screen, measured the way `proj.py` does it: project the disc object's vertices and keep the 2nd to 98th percentile box. The callout anchor is the box's right edge, 20 % down from its top, which is where the visible band is. §6.6's `disc_boxes.py` writes these for every frame into `discs.json` and matches the anchors above to within 0.0006.
- Close-ups for discs G01 to G06: two camera moves each in §6.6, one ending with the spine on the left third and one on the right.
- In any frame that shows a plan, the model's cut ends stay out of view: the half vertebrae above G08 and below G00. §6.6 checks every end frame by eye before the batch.

**What changes in `templates.md` §2** when the data moves into the repo (the copy changes are in §4.5):

| Where | Now | Change to |
|---|---|---|
| First paragraph | "vertebra 1 at the top, 33 at the base, and the brain node above vertebra 1 (decision 10)" … "A result lights 3, 6 or 9 agents. The rest stay on the spine, present but quiet. Departments by vertebra: …" | "numbered 1 at the top to 33 at the base. On the owner's model each department has one disc, from G07 Intelligence at the top to G01 Back Office; the two end discs carry none. A result needs 3, 6 or 9 agents: the discs of their departments light, and the agents are named beside them. Every other disc dims. Agent numbers by department: …" |
| Hero line note | "the unlit vertebrae are the 'full spine can come later'" | "the dim discs and each part's 'for later' list are the 'full spine can come later'" |
| Brain node | "sits above vertebra 1" | "a text card at the top of the plan's text, and of the beat 1 callouts from phase 1b; not drawn in 3D" |
| Priority lists | "(agent · vertebra)" | "(agent · number)" |
| Worked example | "Agents lit (vertebra)"; "The other 27 vertebrae stay quiet." | "Agents needed (number)"; "G07 Intelligence, G03 Customer, G02 Operations and both end discs stay dim. The other 27 agents wait for later." |

The tiers, the priority lists, the job counts and the scroll order don't change. `agents-33.md` keeps its tables; its "vertebra" column now reads as the agent's number.

**Claims.** "33 · AI agents" beside a 10-vertebra drawing is allowed: 33 is the full spine as a product, and no line says the drawing has 33 vertebrae any more. A lit disc means "you need agents from this part today"; the lines say need, never running or live. "{k} of {m}" counts agents in the full spine and says nothing about what runs today.

**If the owner vetoes D1.** Then way 1, done in a .blend and never in his GLB: cut his model into single vertebrae, stack 33 along a longer S-curve with a taper, finish both ends, give the 32 discs their glow, and frame a pulled-back view of the whole column for beat 1. That's at least one extra modelling round and one extra approval round, on a picture he hasn't seen, before any web work starts.

---

## 7. The plan email (M)

- **When:** as the lead is saved, which is while S8 plays. A flagged lead's email waits for Adyut instead (§10).
- **From:** `PLAN_FROM`, "Adyut at ziiro" at a ziiroai.com address verified in Resend (D16, default, owner can veto). **Reply-To:** `PLAN_REPLY_TO`, Adyut's own inbox; until his address is set, the team inbox (D7, default, owner can veto).
- **To:** the email from S7.
- **Lines, in order** (`copy.md` M):
  1. `em.subject` (or `.fallback`) and `em.preview`.
  2. `em.hi`, `em.open`, then `em.said`, or `em.said.chips` if they only tapped chips.
  3. `em.need` (or `.fallback`), then `em.pilot` on lead-gen plans.
  4. For each department in the plan, in scroll order: `em.dept`, then an `em.agent` line for each of the plan's agents in it.
  5. `em.close`, `em.cta`, `em.link`, `em.cta.sub`, `em.sign`, `em.sign2`, `em.foot`.
- **Format:** plain text only. No images, no tracking pixel, and open and click tracking stay off in Resend so the link is never rewritten. The only link is `em.link`: the Calendly event with name and email filled in. It has to read on a phone without zooming.
- **Built on the server from IDs.** The browser sends agent IDs and never the email's text; every line comes from the shared copy module. Their words are cleaned before `em.said` quotes them (§13.3).
- **Golden copy:** Ananya's email in `copy.md`, with the new `em.pilot` from §4.5, is what the tests compare against (§12).
- **The lead alert** (D17, default, owner can veto) goes to `TEAM_INBOX` and to `PLAN_REPLY_TO`, once if they're the same address. The subject is "New funnel lead: {name}, {business type}, team of {team}". It carries every answer, their words, the plan's agents, the spam check's result, any flag, whether the plan email went out, and the Calendly link. When the plan email didn't go out, its first line reads "Plan email NOT sent. Send it by hand today." A flagged lead's first line reads "FLAGGED ({reason}). Check it today, and if a real person sent it, send the plan by hand."
- **Deletion requests** (D20, default, owner can veto): replies asking for deletion reach Adyut, or the team inbox until his address is set. He deletes that person's contact details and answers within 7 days with the saved query (Appendix C) and replies to confirm.
- **Sending limits:** Resend's free plan sends 100 emails a day, and each lead uses two. Move to Resend Pro before leads pass about 40 a day (§13.3).

---

## 8. Search pages and SEO

### 8.1 One page for everyone
Each route is one prerendered HTML document, served the same to every visitor and every bot. There is no crawler-only version, because that is cloaking.

### 8.2 The homepage `/`
- **The HTML holds** the greeting as the page's one H1 ("Hello." until the script fills it), `s0.sub.day`, `s0.promise`, S1's question as an H2 with its five options as real buttons, `g.about` as visible text, `g.noscript` inside `<noscript>`, and the site footer with links to every page. That's about 53 words outside the header and footer, above the 40-word floor `scripts/llms-full.mjs` enforces (§12).
- **The plan is never in the HTML.** The device builds it after the questions, so search engines only ever see the questions.
- **Title and description:** `seo.home.title` and `seo.home.desc` (§8.4).
- **Structured data:** the site's Organization schema only. There's no FAQ or Service schema, because no FAQ or service copy is on the page.
- **Canonical:** `/`.
- **Honest risk** (`templates.md` §5): the homepage will mostly rank for the brand name. Non-brand traffic has to come from the search pages.

### 8.3 No plan URL
There's no plan URL to index or to leave out (D8). `/` stays in the sitemap as it is today. `llms.txt` and `llms-full.txt` describe `/` from its prerendered HTML: the greeting, S1 and `g.about`.

### 8.4 Titles and descriptions
The site's `SEO` component adds " | Ziiro AI" to each title.

| ID | Line |
|---|---|
| `seo.home.title` | Your Business Spine: an AI plan in a minute |
| `seo.home.desc` | Answer a few questions and see which of the 33 agents in a full Business Spine your business needs today. ziiro AI is an AI consultancy based in India. |
| `seo.plan.title` | Your plan (the tab title while the plan is on screen) |
| `seo.spine.title` | Business Spine: one backbone for your whole business |
| `seo.spine.desc` | Your projects, payments and people in one place you can ask. The part that answers questions about your business is live, and we can show you one in 30 seconds. |
| `seo.lead.title` | AI lead generation pilot: every enquiry answered and followed up |
| `seo.lead.desc` | A pilot service from ziiro AI: fast first replies, enquiries sorted by how serious they are, and follow-ups that go out. Parts of it are still being built. |
| `seo.interior.title` | AI for interior designers: every project and payment in one place |
| `seo.interior.desc` | See which AI agents an interior design studio needs first, like chasing stage payments or sending clients site updates. Your own plan takes about a minute. |
| `seo.agency.title` | An AI consultancy in India that does the maths before it builds |
| `seo.agency.desc` | ziiro AI works from an industry map of 137 business jobs and builds only the agents you need today. Based in India, working with teams worldwide. |

### 8.5 The four search pages
They ship in phase 3 (§13.7), in this order (`templates.md` §6):

| Page | H1 | Lead keywords, monthly searches IN / US |
|---|---|---|
| /business-spine | `e.h1.brain` | ai business intelligence 2,900 / 2,900 · business dashboard 590 (IN) |
| /ai-lead-generation | `e.h1.lead` | lead generation agency 880 / 3,600 · ai lead generation 480 / 1,600 · whatsapp automation 3,600 (IN) |
| /ai-for-interior-designers | `e.h1.interior` | software for interior designers 170 / 170 · ai for interior designers 70 / 140 |
| /ai-automation-agency-india | `e.h1.agency` | ai automation agency 2,400 / 4,400 · ai consultancy 2,400 / 8,100 · ai automation agency india 110 |

Every search page:
- Opens with the what-and-where line, and has real content anyone can read without answering a question.
- Shows the r17 still of the spine, the film, and an FAQ whose FAQPage schema matches the visible questions.
- Pins `e.btn` "Get my plan" with `e.btn.sub`. It enters S1 at `/` with the page's intent saved.
- Never answers "What does it cost?" with a number.
- /ai-lead-generation carries the pilot label in its title and H1 (§4.5), and its "Qualified" film shows `rb.film.label` on the video itself.
- Is added to `scripts/routes.mjs`, so it is prerendered and in the sitemap, and to `llms.txt`.
- Gets its body copy in that phase, inside Appendix A.

Next in line, after these four: /ai-sales-follow-up, then /ai-content-creation.

### 8.6 Site-wide, in the funnel's release
- "Business Spine" replaces "Business Brain" (decision 26). `BrandFilm.tsx` holds the only "Business Brain" in `src/`, and it leaves with the old homepage.
- The "127 jobs / 30 agents" line goes with the old homepage (decision 28). It lives in `Hero.tsx:69` and `SystemDirectory.tsx:188` (D27 if launch is late).
- The nav pill opens Calendly on every page (D14).
- `llms.txt` and `llms-full.txt` are regenerated and pass the claims check (§12). The OG image is checked by eye for old claims.
- **Search Console:** the owner verifies ziiroai.com and submits the sitemap before the search pages ship. It has been open since the domain move.

---

## 9. What we record

- **Where it goes:** our own database (Neon, §13.5), through `/api/funnel/visit`, which keeps one anonymous row per visit and updates it at each step, and `/api/funnel/lead`, which saves the lead. No outside analytics tool in the first release (D22, default, owner can veto).
- **Typed words never go through `/visit`.** They travel only with the lead, after the consent tick (D13, default, owner can veto). The steps carry option IDs, chip IDs and counts.
- **Never stored:** IP address, raw audio, precise location, a WhatsApp number.
- **Saves never block the visitor** (§10).

| What | When | Stored as (Appendix C) | The question it answers | Phase |
|---|---|---|---|---|
| Landing | First paint of `/` or a search page | `landing_path`, `entry_intent`, `referrer_host`, `utm`, `country`, `timezone`, `locale`, `day_part`, `theme`, `device_class`, `is_returning` | Where people come from | 1 |
| Step reached | Each screen shown, S0 to S9 | `last_step`, which only moves forward | Drop-off by step | 1 |
| Answers | Each tap | `segment`, `non_owner_reason`, `business_type`, `years_band`, `team_band`, `revenue_band`, `revenue_currency`. All option IDs: "Other" is stored as the option, never its text | Who arrives | 1 |
| The problem | S6 "That's it" | `input_mode`, `chips` (IDs in tap order) | How people describe what hurts | 1 |
| The plan | S8 | `bucket_primary`, `bucket_secondary`, `bucket_scores`, `template`, `order_variant`, `tier`, `agent_ids` (scroll order), `job_ids`, `classifier_version`, `agents_version` | Which plans we hand out | 1 |
| Contact errors | A failed S7 send or field check | `contact_errors`: which check failed (name, email, phone, consent, bot, rate, server, timeout), never the value | Where S7 loses people | 1 |
| Time to plan | The plan painted | `seconds_to_result` | The 60-second target | 1 |
| The lead | The server saved it | A `contacts` row: name, email, phone, their words, the "Other" text, matched phrases, consent version and time, and any `flag` | Leads | 1 |
| The plan email | Sent, failed or held; later delivered or bounced | A `plan_emails` row: status, Resend ID, the agents and jobs it listed | Did the plan arrive | 1, delivery from 2 |
| How far they read | The furthest block reached | `plan_depth` | Do they read it | 1 |
| The film | Play, then 25, 50, 75 and 100 % | `film_played`, `film_pct` | Does the film help | 1 |
| "Book a call" | Any of the buttons | `cta_clicked_at`, `cta_from` (header, hero or close) | Intent to talk | 1 |
| Call booked | Adyut marks it when a Calendly booking's email matches a funnel lead (D21, default, owner can veto) | `call_booked_at` | The measure that matters | 1 |
| Plan view | The plan painted, and again if the live 3D falls back to the still | `plan_view` (motion meaning the live 3D model ran, or still) and `still_reason` (save data, slow connection, unsupported meaning no WebGL, failed meaning the 3D chunk or mesh didn't load or the context was lost). The values are unchanged, so the schema is too; reduced_motion is no longer used, since reduced motion keeps the model (§6.6) | Does the page hold up | 1 |
| Discs opened | A disc panel opened | `discs_opened` (department IDs) | Which parts interest them | 1b, superseded by the D2 veto until disc panels are specified on the live model |
| Voice | Mic tapped, permission result, transcript length, fallback used | Columns added with voice | Does voice earn its place | 2 |
| Return visit | A returning visitor lands on their plan | `is_returning` | Do plans get reopened | 2 |

**The contact-step rule** (decision 23, D23, default, owner can veto): of the real visitors who reached S7 in the 30 days after launch, the share who never sent it. If it's over 40 %, S7 moves: S6 goes straight to S8 and the plan, and the S7 form sits on the plan above the close. S7 is built as one self-contained piece so it can move without a rewrite. Bot-flagged visits are left out of every saved query (Appendix C).

---

## 10. Error handling

One rule covers every failed send at S7: the first failure goes back to S7 once, and the second opens the plan anyway. A visitor never gets a third try (D18, default, owner can veto).

| Where | What goes wrong | What the visitor sees | Behind the scenes |
|---|---|---|---|
| Any step save | Network error, server error | Nothing. The flow never waits | Sent with `keepalive`; a failure is dropped. Each save carries every answer so far, so the next one fills the gap |
| Greeting | Script error, or a language with no live row | The English greeting; the theme from the device setting | — |
| `/` with JavaScript off | — | The greeting, `g.about`, S1 as text, `g.noscript` with a plain Calendly link, the footer | — |
| S2 text box | Over 80 characters | The box stops at 80 | — |
| S6 | "That's it" with nothing entered | `s6.empty` | — |
| S6 | Over 600 characters | The box stops at 600 | — |
| S7 | A field fails its check on the device | `s7.err.name`, `.email`, `.phone` or `.consent` under the field; focus moves to the first one | `contact_errors` gets the field |
| S7, first failed send | The spam check failed or never loaded, meaning no token when they tapped send (403); too many tries (429); a field the server rejects (400); our server failed (502); or no answer within 8 s | Back to S7 with every field kept, the spam check reset and one tap to send again. The line is `s7.err.bot` for a 403, the field's line for a 400, and `g.error` for the rest | `contact_errors` gets the reason. A 403 or 429 saves nothing |
| S7, second failed send | Any of the above, again | The plan opens. If the server saved the lead flagged, nothing else shows. After a 400 or a 502, `sp.save.fail` shows at the top. After no answer, `sp.save.unsure` | On a second try the server saves a lead that failed only the spam check or the rate limit, with `flag` = `turnstile_unverified` (no token), `turnstile_failed` or `rate_limited`. It sends the alert marked FLAGGED and no plan email (`plan_emails.status` = `held`). Adyut checks it the same working day and, if a real person sent it, sends the plan by hand |
| Lead endpoint | The database is down | Nothing different | The alert carries the full lead, so nothing is lost. A lead counts as saved when it's in the database or in the alert |
| Lead endpoint | The database and the alert both fail | Back to S7 the first time; `sp.save.fail` the second | 502. The plan email doesn't go out either, because nobody could follow it up |
| Lead endpoint | The same visit sends twice (a double tap, or a retry after a slow success) | Their plan, as normal | The visit ID keys the lead. If the visit already has one, the server answers with the first result and does nothing else |
| Plan email | Resend refuses it or times out | Nothing different (ruling 8) | Two tries, then `plan_emails.status` = `failed`, and the alert says to send it by hand. Adyut does it the same working day |
| Plan email | It bounces | Nothing | Resend's dashboard shows it in the first release; `plan_emails.status` = `bounced` from phase 2 |
| The hero still | Doesn't load | The hero's words on the page colour, with the alt text in the picture's place; every word of the plan below it | — |
| The plan and the hero | No WebGL, the device saves data, or the connection is 2G or 3G | The r17 still stays and the 3D never starts (§6.6), with every word | `plan_view` = still, with its `still_reason` |
| The plan and the hero | The 3D chunk or mesh fails to load, or the WebGL context is lost | The r17 still, for the rest of the visit | `still_reason` = failed |
| The plan, from phase 1b | The frame for the scroll position hasn't arrived yet | The nearest frame already loaded; the words scroll as normal | — |
| The plan, from phase 1b | A still of the still version doesn't load | The last picture shown stays; every word is still there | — |
| Film | Doesn't load | The poster and `g.error` | — |
| Film | The "BRAIN · LIVE" re-render isn't done by launch | No "See how it works" button | — |
| Device storage | Blocked (private mode) | The flow works. There's no "Welcome back" later (phase 2) | The visit ID lives in memory for that page view |
| Calendly | Name or email prefill missing | Calendly asks for them | — |

---

## 11. Accessibility

Target: WCAG 2.2 AA on `/`, the questions and the plan, and on the search pages, in both themes, at 390 px and 1440 px.
1. **Options are real buttons.** Tapping one is expected to act, so moving on is not a surprise. In S3 + S4, the first row uses `aria-pressed`.
2. **Focus follows the flow.** On every step change, focus moves to the new question (an H2 with `tabindex="-1"`). The step is announced through `g.progress` ("Step 2 of 6").
3. **Targets** are at least 44 × 44 px, as the site already does. That's why the discs aren't buttons on phones (§6.2).
4. **Contrast:** at least 4.5:1 for text and 3:1 for large text and controls, in both themes. Orange is never used for small text on a light background. The orange button's label is near-black (about 7:1 on #FF7A00; white would be about 2.6:1). Near the spine (§6.6): on desktop the text column stays left of 55 % of the width, where the copy's own colours pass (the lowest, the eyebrow, measures 5.24 in light and 6.57 in dark). On a phone no text sits on the model: the hero's words stack above the spine on the page colour (D34), where the lowest measures 5.71 in light and 9.40 in dark, and the tour's words sit on a card.
5. **Language:** the page is `lang="en"`. The greeting carries its own `lang`, and `dir="rtl"` for Arabic and Urdu once those rows ship.
6. **Form:** visible labels; `autocomplete` set to `name`, `email` and `tel`; errors tied to their field with `aria-describedby` and announced; the consent box is a real checkbox, unticked, with a clickable label.
7. **S8** lines are announced politely (`aria-live="polite"`). No fake percentage.
8. **Reduced motion:** no slides or fades. The greeting appears at once. In the first release the plan is the hero still and the words. From phase 1b it's the still version (§6.6): nothing scrubs or cross-fades, and each stop's close-up swaps in without animation. The page scrolls normally either way, with no scroll-jacking.
9. **The spine is decoration plus a list.** The hero image has `hx.alt.*`. The live 3D canvas (§6.6) carries the same alt text as the still, as an image, on S0 too. It isn't focusable and takes no keys, since nothing needs a turn. Every agent, job and mark is HTML text. From phase 1b the disc buttons work from the keyboard (Tab, then Enter), in spine order, labelled with `sp.disc.aria`. Nothing needs a hover or a drag.
10. **Marks are never colour alone.** ● ◐ ○ each have a text label in the legend and an accessible name.
11. **Film lightbox:** focus moves in, Esc closes it, and focus returns to "See how it works". It has play and pause controls. The film has music and no speech, and its words are on screen, so it needs no captions. A one-line text description sits under it.
12. **Reflow:** usable at 200 % zoom and 320 px wide with no sideways scrolling.
13. **No time limits** anywhere in the flow. S8's 8 seconds is a wait on our server, not a limit on the visitor.

---

## 12. Testing

No tests exist in the repo today, and CI runs only CodeQL. The first release adds them (D25, default, owner can veto). The logic modules are written test-first.
- **Unit tests (Vitest), at least 80 % line coverage on the funnel logic:**
  - The greeting picker: English and Hindi at every day-part edge; Hindi showing English until its `checked` flag is on; a language with no live row falling back to English. Each later row brings its own tests when it ships (right-to-left, its own hours).
  - The theme rule: dark from 17:00 to 04:59 and light from 05:00 to 16:59 by the visitor's clock, with the edges at 04:59, 05:00, 16:59 and 17:00; a device set to dark wins.
  - The tier rule: every team and revenue combination, in rupees and dollars.
  - The classifier: cleaning, a tapped chip deciding (chip A plus words that score high for B gives A), longest phrase first, the negation window and its clause breaks (D35), ties, the `unclassified` rule, and Ananya resolving to sales, B-convert.
  - The composition: the plan's agents, scroll order, every job count in the §5.4 table, lane replacement, and the lit discs of all 27 plans matching the 9 sets in §6.7.
  - Copy filling: trailing punctuation, the 120- and 140-character cuts, `.words` only at the department their problem belongs to, or at the first stop when their words point at none (D36), the fallback variants, and `sp.hero.scroll.one` on one-part plans (D37).
  - The plan email builder: Ananya's email matches `copy.md` M exactly, with the new `em.pilot`, link aside.
  - The Calendly link builder, including how names with spaces and symbols are encoded.
- **API tests (Vitest),** with Neon, Resend and Turnstile mocked:
  - `/api/funnel/visit`: validation, unknown keys refused, no typed text accepted, saves;
  - `/api/funnel/lead`: validation; the spam check passing, failing and missing, on a first try (403, nothing saved) and on a second try (saved with its flag, the alert sent, no plan email); the rate limit on both tries; the database down (the alert still goes); the database and the alert both down (502, no plan email); the plan email failing (the alert says to send it by hand); a repeat send for the same visit (the first result, nothing new); and no answer text in the logs.
- **Claims check (Vitest).** Its patterns come from Appendix A: each "Never" entry is a pattern, and the lines allowed to put 33 near "today" are named by ID. It fails the build only on the funnel's own output: `/` with the questions and plans, the search pages, the email builder's output, the repo's copy data, `llms.txt`, and the `/` and search-page sections of `llms-full.txt`. Matches on other pages, like the rates on /pricing and /book-a-call or the cap in /terms, go into a report and don't fail it. Whether those rates come down is a separate call for the owner. It fails on:
  - "free audit" or a free consultation;
  - a price figure outside S5's revenue bands;
  - "127 jobs", "30 agents", "107", "11 run", "run end-to-end", "jobs live" or "all demoable";
  - 33 in the same sentence as running, live, built, ready or today, except in the lines Appendix A names; "our 33 agents"; "33 AI employees";
  - "Spine" in the same sentence as "live";
  - "case stud" or "testimonial" on a funnel page;
  - any call-to-action wording other than `cta.btn` at the close;
  - a lead-gen plan rendered without `sp.pilot`.
- **End-to-end (Playwright),** on the production build served by `vite preview`, with `/api/funnel/*` answered by Playwright's route mocks:
  - the full flow at 390 × 844 and 1440 × 900;
  - light at 10:00 and dark at 22:00 (with the clock set by the test), and a device set to dark;
  - a Hindi browser with the flag on and off;
  - reduced motion; from phase 1b also no AVIF, Save-Data, and a push-in file that fails to load, each ending on the still version;
  - the S1b path; every S7 error, including a 403 twice and no answer twice, which must open the plan;
  - Back going one step with the answers kept, and Back from the plan landing on S6;
  - Ananya's run producing her plan (6 agents, 4 stops in order, the Pilot tag), with her `/lead` body matching the fixture the API test turns into the golden email;
  - the live spine on SwiftShader (§6.6): on S0, with the probe told the GPU is real, it goes live without moving the options, the greeting stays the LCP, and a press on an S1 option, or Enter/Space on one, before its first frame gives the 3D up and frees its worker; on S0 as a software renderer, Save-Data or a slow connection it fetches no 3D; on the plan, with the probe told the GPU is real, the hero and the tour go live, fly and fall back as §6.6 says, and without it they keep their stills and fetch no 3D (W14-X).
- **Preview smoke test:** on each pull request's Vercel Preview, one run to the plan with Cloudflare's test keys, writing to the Neon preview branch and emailing the tester.
- **Accessibility (axe through Playwright)** on every screen in both themes, plus one full pass with VoiceOver on an iPhone before launch.
- **HTML check:** `/` without JavaScript contains `g.about`, S1's question and its five options, and the footer links. It keeps at least 40 words outside the header and footer, or `scripts/llms-full.mjs` refuses to build. The sitemap gains no URL in phase 1.
- **Speed:** the gates in §13.10, checked with Lighthouse mobile on `/` before each deploy.
- **The spine's files (Playwright and a script, phase 1 for the hero, phase 1b for the rest):**
  - the hero picks: at 390 × 844 at 3× the page fetches `phone-1170`, and on a 1200-wide window at 2× `hero-2560`, in AVIF;
  - theme isolation: a light visit fetches no file under `/spine/r17/dark/`, and a dark visit none under `/light/`;
  - nothing under `/spine/` is fetched before S5 (no r17 still or any other `/spine/` file), and no push-in file before the plan paints. The one exemption is S0's live mesh, `/spine/3d/m1/*`, and only when it loads after the first paint, never on Save-Data, a slow connection or a software renderer (W14-R, 9 Oct). CI runs on SwiftShader, so the check that the mesh comes after the first paint runs with the S0 probe told the GPU is real;
  - the weight check: a script reads every `manifest.json` and adds up each of the 27 plans' tours in both themes. It fails the build if a tour passes 3 MB on desktop or 1.5 MB on a phone, or a hero file passes its limit in §13.10;
  - compositor parity: the page's compositor and `web/test.js`, copied into the tests as the reference, draw Ananya's beat 1 and one frame on the way from the same files, and the pixels match;
  - the still version (reduced motion, and no AVIF) fetches no frame on the way, only beat 1 and the close-up stills;
  - smoothness: a Chrome trace scrolls Ananya's tour at 390 × 844 with the CPU slowed 4×, and needs at least 50 frames a second and no main-thread task over 50 ms.
- **Render checks (worker-2's tools, before any new render goes into the repo):** `layers.py --check` for layer accuracy, `disc_boxes.py` for the anchors, and `readability.py` on every new still that words sit beside (the desktop hero, and each close-up on its words' side), where each text block must reach 4.5, or 3 for large text.
- **Real devices:** one mid-range Android phone on 4G and one iPhone, in both themes.
- **Launch gate:** a live test lead on production, using the owner's own email, passes the launch bar in §3. The test row is deleted afterwards with the saved query.
- **CI:** a GitHub Actions job runs lint, the type check, the unit, API and claims tests, the build and the Playwright run on every pull request into `dev` and `main`. A second job runs the spine's 3D end-to-end tests (S0, the plan's hero and tour, the fallbacks and the `/spine/` files) under SwiftShader, one worker at a time. The speed gates of §13.10 run by hand against a Preview.

---

## 13. Architecture, data, phases and launch blockers

From worker-4's `funnel/spec-arch.md`, with the manager's rulings and the review fixes applied. worker-1's notes (`worker-1.md`, "Wave 8 merge") list every change from that file. Production was read on `ziiroai/main` at `02d5fa4` (29 Sep) after a `git fetch`. Nothing here is built.

### 13.1 How it fits on today's stack
```
VISITOR ─▶ Vercel CDN: prerendered "/" (S0 + S1 in the HTML); every other page as today
  "/" inline head script (≤2 KB, runs before paint, does nothing on other paths):
      OS asks for dark → dark, else 17:00–04:59 dark, 05:00–16:59 light · day-part · navigator.languages
  funnel chunk:  S0–S8, tap cards, CSS transitions, keyword classifier on the device (decision 4)
  plan chunk:    the plan + its data (agents, jobs, copy lines, disc map), prefetched at S5
  spine files:   /spine/r17/{theme}/…, static, cached a year (§6.6): hero still at S5;
                 from 1b, beat 1 at S8 and the camera moves after the plan paints
Vercel Functions, Node.js runtime, region sin1 (Singapore)
  POST /api/funnel/visit   anonymous step data, one upsert per step, fire and forget
  POST /api/funnel/lead    replay check → fields → rate limit → Turnstile → Neon → team alert → plan email
Neon Postgres: Vercel Marketplace, free plan, AWS Singapore (aws-ap-southeast-1)
Resend and Cloudflare Turnstile: the same key, domain and widget as /contact
Calendly: "Book a call" → calendly.com/ziiro-work/30min?name=…&email=…
```
- **Everything lives at `/`** (D8). S0 to S9 are client state on the homepage, with history entries as §4.1 sets out. In phase 1 a reload starts fresh, and the plan is in their inbox; phase 2 adds "Welcome back".
- **S8 covers the write.** The S7 button sends `/lead`, and S8 plays its three lines, then holds the last one until the answer comes or 8 s pass (§4.3). The plan is computed on the device, so it never waits on the server for longer than that.
- **The greeting is in their language at first paint.** An inline script placed right after the greeting element writes the visitor's line before the browser paints. Googlebot crawls with no language header, so it gets the English line. Every visitor and every bot receives the same HTML.
- **Theme.** The questions and the plan read their own light and dark tokens from `data-theme`, set by the head script (D9). Browsers can't tell "light on purpose" from "no setting", so the clock decides for everyone whose device doesn't ask for dark. Every other page keeps `forcedTheme="dark"` for now.
- **No new UI dependency.** One server dependency, `@neondatabase/serverless`, used only inside `api/`; it ships nothing to the browser.
- **Data and copy go into the repo.** `.team/` is git-ignored. The builders copy `agents-33.json` (with `vertebra` renamed `number`), the bucket rules from `templates.md` §1–2, the disc map from §6.7 and the copy lines this spec places (§4.5, same IDs) into `src/features/funnel/data/`. The browser and `/api/funnel/lead` import the same module, so the email always says what the page says.

### 13.2 The two functions
- **Files:** `api/funnel/visit.ts` and `api/funnel/lead.ts`.
- **Shape:** the Web handler (`export async function POST(request: Request)`), `export const config = { runtime: "nodejs", maxDuration: 15 }`, and the region from `"regions": ["sin1"]` in `vercel.json`.
- **Reused from `api/_lib.ts`:** CORS; JSON-only requests (`isJsonRequest`); the 10 KB body cap (`readJson`); `jsonResponse` (no-store); the IP rate limiter; and `logEvent` with its logging policy: no submitted field and no IP, ever.
- **Funnel helpers:** `api/funnel/_db.ts`, `_validate.ts` and `_email.ts`. Files starting with `_` are never routed.

**POST /api/funnel/visit (anonymous)**
- **Body** (4 KB at most): `{ id, step, fields }`.
  - `id` is a v4 UUID made in the browser and kept in sessionStorage, or in memory when storage is blocked.
  - `step` is one of S0, S1, S1b, S2, S3, S4, S5, S6, S7, S8, S9.
  - `fields` carries every answer so far, so a dropped save loses nothing the next one doesn't carry.
- **Allowed fields** (camelCase in, snake_case columns; any other key gets a 400):
  - context: landingPath, entryIntent, referrerHost, utm {source, medium, campaign, term, content}, timezone, locale, dayPart, theme, deviceClass, isReturning, noticeVersion;
  - taps: segment, nonOwnerReason (option ID), businessType (option ID), yearsBand, teamBand, revenueBand, revenueCurrency, chips (3 at most, IDs), inputMode;
  - classification: bucketPrimary, bucketSecondary, bucketScores, template, orderVariant, tier, agentIds (up to 9 of the 33), classifierVersion, agentsVersion;
  - progress: secondsToResult, contactErrors, planDepth, filmPlayed, filmPct, ctaFrom, ctaClicked, webdriver; from phase 1b also planView, stillReason, discsOpened.
- **Never in `/visit`: anything typed** (D13). Their words, the "Other" text and the matched phrases travel only inside `/lead`, after the consent tick.
- **Server:** checks every enum against the data module; derives `job_ids` from `agentIds`; reads `country` from `x-vercel-ip-country`; sets `bot_flag` when `webdriver` is true or the user agent is a known bot; upserts the row; moves `last_step` forward only.
- **Answers:** `200 {success:true, country}` (S7 uses `country` to prefill the phone code), 400, 415, 429.
- **Client:** one `fetch` per step with `keepalive: true`. The UI never waits for it, and failures are dropped.

**POST /api/funnel/lead (the lead)**
- **Body** (10 KB at most): `{ visitId, retry?, name, email, phone?, consent: {given: true, version}, turnstileToken?, answers: {businessOther?, problemText?, chips, inputMode}, plan: {template, orderVariant, tier, agentIds, matchedPhrases, classifierVersion, agentsVersion} }`. `retry: true` marks the visitor's second try (§10).
- **Checks, in order:**
  1. JSON only, then the size cap.
  2. Replay: if this visit already has a contact, answer with that lead's result and do nothing else.
  3. Fields: name 1 to 80 characters, with at least one letter left after cleaning (§13.3); email through `isValidEmail`, which includes the disposable-domain list; phone empty or E.164; consent given, with the current version; agentIds 1 to 9 of the 33; problemText 600 characters at most. A failure answers 400 with the field.
  4. The IP rate limit: 5 per 10 minutes, the /contact setting.
  5. Turnstile, with action `funnel_lead`.

  On a first try, a failed step 4 answers 429, a failed step 5 answers 403, and nothing is saved. On a second try the lead is saved anyway, with `flag` set to `rate_limited`, `turnstile_unverified` (no token) or `turnstile_failed` (token refused); it gets the alert, marked FLAGGED, and no plan email. A flagged save never mails a stranger, so the second-try path can't be used to send email.
- **Writes, in order:**
  1. One Neon transaction: upsert the visit (the final snapshot, `last_step` S8) and insert the contact with its flag (`on conflict (visit_id) do nothing`).
  2. The team alert, to `TEAM_INBOX` and to `PLAN_REPLY_TO`, once if they're the same. Resend idempotency key `alert-<visitId>`.
  3. The plan email, to the visitor, key `plan-<visitId>`. Skipped for a flagged lead, and when writes 1 and 2 both failed.
  4. The `plan_emails` row: the Resend ID, the status (`sent`, `failed` or `held`), and the agents and jobs it listed.

  If one write fails, the function logs it, never the fields, and carries on. A lead survives a database outage, because the alert carries it, and a Resend outage, because the row carries it.
- **Answers:**
  - `200 {success:true, planEmail}`, with planEmail `sent`, `failed` or `held`, when the lead reached the database or the alert;
  - `400 {success:false, field}`, where field is name, email, phone, consent or payload;
  - 403 for the spam check and 429 for the rate limit, on a first try only; 415;
  - `502 {success:false}` only when the database write and the alert both failed, so the lead is nowhere and no plan email went out.
- **Idempotent, keyed by the visit ID.** A double tap or a retry stores one contact and sends one email of each kind. The replay check covers it, and Resend also keeps each idempotency key for 24 hours.
- **What the visitor sees** when any of this fails is in §10.

### 13.3 Email: Resend, shared with /contact
- **One key, one verified domain.** /contact and the funnel share `RESEND_API_KEY`.
- **The sending domain is ziiroai.com,** the domain the visitor just used. ziiro.work carries the cold outreach and stays out of it (D16).
  - `PLAN_FROM` = `Adyut at ziiro <adyut@ziiroai.com>`. It needs only ziiroai.com verified in Resend (B1).
  - `PLAN_REPLY_TO` = the inbox Adyut reads (decision 29). Until he sends it, `TEAM_INBOX` (D7).
- **The plan email follows `copy.md` section M exactly:** plain text, no images, no tracking pixel, one link.
  - Open and click tracking stay off for the domain in Resend, so the link is never rewritten.
  - The link is the Calendly event, with `name` and `email` filled in.
- **The server writes it from IDs.** The visitor's browser sends agent IDs and never sends text for the email. Every line comes from the shared copy module.
- **Their words go out cleaned.** Anyone can type any address, so the email must not carry someone else's link.
  - Before `em.said` quotes their words, the server removes links, web and email addresses and long runs of digits, then trims to 140 characters.
  - If nothing is left, the line is dropped. When they tapped chips, `em.said.chips` is used instead.
  - The name gets the same cleaning and must keep at least one letter. If it doesn't, S7 rejects it with `s7.err.name`.
- **Changes to `api/_lib.ts`:**
  - `sendResendEmail` takes `text` (and `html` becomes optional), plus an `idempotencyKey`. It keeps `replyTo`.
  - `verifyTurnstile` takes an optional expected action, and tells a missing token apart from a refused one.
  - The disposable-domain list moves to a shared module that the S7 form also imports, so a throwaway address is caught before S8.
  - The header comment loses "does NOT persist to a database" and points to `api/funnel/`.
- **Limits.** Resend's free plan sends 100 emails a day and 3,000 a month, and each lead uses two. Move to Resend Pro ($20 a month, no daily cap) before leads pass about 40 a day.

### 13.4 Turnstile: shared with /contact
- **One widget** for `ziiroai.com`: one site key and one secret, used by /contact and S7. Decision 27 creates it.
  - S7 renders it with action `funnel_lead` and `appearance: "interaction-only"`, so most visitors never see it.
  - The script loads when S6 opens. No token when they tap send counts as a failed check (§10).
- **One loader.** The loader that sits inside `src/pages/Contact.tsx` today moves into a shared hook used by both forms.
- **Tokens.** A token lasts 300 s and can be checked once (Cloudflare). The widget renews an expired token by itself, and after a failed send it resets, so the second try carries a fresh token.
- **Test keys outside Production** (D25). Preview and local builds use Cloudflare's test keys: site `1x00000000000000000000AA`, secret `1x0000000000000000000000000000000AA`. The real keys stay ticked for Production only, as `contact-fix.md` says.

### 13.5 Data: Neon through the Vercel Marketplace
- **Install (B3).** Neon ("Serverless Postgres", plans from $0) from the Vercel Marketplace:
  - on project `ziiro-ai-vision` in the "ziiro" team;
  - free plan, region AWS Singapore (`aws-ap-southeast-1`);
  - connected to Production and Preview.

  Billing runs through Vercel. The integration sets `DATABASE_URL` and its siblings, and gives each Preview deployment its own copy-on-write branch.
- **Why Neon.**
  - The free plan gives 1 GB and 100 compute-hours per project a month.
  - It sleeps after 5 idle minutes and wakes on the next query. Supabase's free plan pauses after a week and needs a manual restore; that is the failure that already lost this site's submissions.
  - Neon has no India region. Singapore is the closest, so the functions run in `sin1`.
- **Three tables** (DDL in Appendix C):
  - `visits`, anonymous: one row per visitor, with taps, the plan and progress. Never free text, never contact details.
  - `contacts`: one row per lead, with name, email, phone (optional), their words, the "Other" text, matched phrases, consent version and time, the flag, and the withdrawal time. There is no WhatsApp field.
  - `plan_emails`: one row per lead, with the Resend ID, the status and the agents and jobs listed.
- **Never stored:** IP address, raw audio, precise location, WhatsApp number.
- **Deletion** (D20, default, owner can veto). A request arrives as a reply to the plan email (`em.foot`). Deleting the person's `contacts` row deletes their words and their plan-email row with it. The anonymous visit stays.
- **Retention.** Contacts and plan emails are deleted 12 months after the lead, visits after 24 months. A saved query does it on the first working day of each month.
- **Team view, with nothing to build.** Neon's console Tables page plus nine saved queries (Appendix C): new leads; drop-off by step; plan emails to send by hand; the contact-step rule; leads and booked calls by template; mark a plan email sent by hand; mark a call booked; delete a person; the monthly clean-up. Every lead's alert also reaches the team inbox and Adyut.
- **"Whether it arrived."** Phase 1 stores sent, failed or held, and the Resend ID; Resend's dashboard shows delivery for 30 days. Phase 2 adds Resend's delivery webhook, which writes delivered, bounced or complained into `plan_emails`.

### 13.6 Environment variables (Vercel team "ziiro", project `ziiro-ai-vision`)

| Name | Production | Preview and Development | Used by | New |
|---|---|---|---|---|
| `RESEND_API_KEY` | real | real (tests send to the tester) | /contact, /lead | no |
| `TURNSTILE_SECRET_KEY` | real | Cloudflare test secret | /contact, /lead | no |
| `VITE_TURNSTILE_SITE_KEY` | real | Cloudflare test site key | Contact page, S7 | no |
| `RESEND_FROM` | the contact sender | same | /contact | no |
| `TEAM_INBOX` | team inbox | the tester's inbox | /contact, team alert | no |
| `DATABASE_URL` and siblings | Neon main branch | Neon preview branch | /visit, /lead | set by the integration |
| `PLAN_FROM` | `Adyut at ziiro <adyut@ziiroai.com>` | same | plan email | yes |
| `PLAN_REPLY_TO` | Adyut's inbox; the team inbox until he sends it (D7) | the tester's inbox | plan email, team alert | yes |

- `.env.example` gains the two new names and drops "no database".
- The Calendly link is not an env var. It stays `INTERIM_BOOKING_URL` in `src/features/pricing/entities/rates.ts:155`, imported rather than copied.

### 13.7 Phases
Working days with Claude Code. Phase 1 splits into four lanes that own separate files, so four builders work at once. The critical path is lane A plus integration.

| Phase | What ships | Calendar days (4 builders) | Builder-days |
|---|---|---|---|
| **0 · Unblock** | Owner items B1 and B3 (§13.8); schema on Neon main and preview; Node function skeleton in `sin1`; Turnstile test keys on Preview | 0.5 | 0.5, plus about an hour of the owner's time |
| **1 · First real lead** | S0–S8 at `/`, with English and Hindi greetings; both functions; Neon; team alert; plan email; the live 3D spine on the hero and the plan, with the r17 still as its first paint and fallback (§6.6, D2 veto); the plan with the r17 still (§6.6; on a phone, the words first and a band of the still below them) and words: "you need only N", the brain card, one block per department in the plan (agents, jobs, marks), the Pilot tag on template B, "See how it works" (the Spine film with its one string changed) and "Book a call"; old homepage sections out, the 127/30 line with them; nav; Privacy page; a live test lead in production | 6 | 20 |
| **1b · The 3D scroll** (superseded by the D2 veto, 8 Oct 2026: the live 3D spine is in the first release, §6.6) | The plan's lit discs from §6.7 (one disc per department, 9 lit sets across all 27 plans, a callout per lit disc at its anchor in each frame); the disc panels on desktop; the lit and quiet legend; the canvas compositor and the scroll from §6.6, built against `web/test.js`; the still version (§6.6) for reduced motion, Save-Data, 2G and 3G, browsers without AVIF and failed loads | 3 | 6, plus one render night by worker-2 during phase 1: about 4 hours of renders and 1 of processing, through the render lock |
| **2 · Voice + return** | Voice in English (decision 20) with the typed fallback and `microphone=(self)`; "Welcome back, {name}"; Resend delivery webhook | 3 | 5 |
| **3 · Reach** | The four search pages (`routes.mjs`); more greeting languages as their native checks land, with right-to-left markup and their own hours; templates C and D once their films exist; `hydrateRoot`; `send-contact` and `geo` moved off Edge | 3 | 7, plus films |
| **Later** | Calendly booking events into `call_booked_at`, a team dashboard, Indian state languages | not sized | |

**Dates.** Working days run Monday to Friday. The build starts the day after the owner approves the build plan, the step after this spec. Phases 0 and 1 take about 6.5 working days with four builders, so the first release goes live around midday on the seventh working day:
- approve Thursday 8 Oct, start Friday 9 Oct, live around midday Monday 19 Oct;
- approve Friday 9 Oct, start Monday 12 Oct, live around midday Tuesday 20 Oct, the last day before the VIT talk;
- approve Monday 12 Oct, start Tuesday 13 Oct, live around midday Wednesday 21 Oct, the day of the talk.

The first real lead comes from the first visitor who finishes the questions, so launch day is the earliest it can arrive. If the live date would fall after Tuesday 20 Oct, lane D ships the removal of the 127/30 line on its own first, so the talk never shows it (D27, default, owner can veto). Phase 1b lands about 3 working days after launch.

**Phase 1 lanes** (the files don't overlap):

| Lane | Owns | Days |
|---|---|---|
| A · Questions | head script and greeting script in `index.html` (English and Hindi, Hindi behind its flag); funnel tokens; S0–S8 with progress, Back and history (`src/features/funnel/flow/**`); the S7 form with the shared Turnstile hook and the one-retry rule | 4.5 |
| B · Server and data | `api/funnel/**`; the `api/_lib.ts` changes; `db/funnel.sql`; `regions` and the year-long immutable cache rule for `/spine/` in `vercel.json`; `.env.example`; saved queries; Privacy page text | 4 |
| C · Plan | data module (with the §6.7 disc map) and classifier (`src/features/funnel/data/**`, tested on the `templates.md` cases and Ananya); the plan as the first release shows it, with the brain card and the hero `<picture>` from §6.6: on desktop the words beside the still; on a phone the words first, on the page colour in the copy's own colours, then the spine band at full strength with no veil, then the stats row (`src/features/funnel/plan/**`); film reuse; the Calendly button | 3 |
| D · Site and QA | day 1: the film's one-string change, re-render and `web.py` (§6.5); the `src/pages/Index.tsx` swap; old home sections deleted; Preloader skipped on `/`; nav (merge `feat/mobile-burger-nav`, pill opens Calendly); the film files into `public/media/` and the hero stills into `public/spine/r17/`, with the phone band cut from worker-2's master render (§6.6); Vitest and Playwright set up; a Playwright run to the plan; Lighthouse and prerender checks | 2.5 |
| All four | integration; claims review (Appendix A); iOS Safari and Android Chrome in both themes; production deploy; live test lead | 1.5 |

Three contracts are fixed on day 1 so no lane waits: the plan descriptor (`template, orderVariant, tier, agentIds, …`), the two request bodies in §13.2, and the shape of the data module.

**Why phase 1 is this small:**
- The scroll animation stays out of the first release. The phase 1 plan is the hero still and the words, and every line on it is true.
- The plan's lit discs come with the scroll in phase 1b. §6.7 brings them down to 9 lighting sets, and §6.6 draws them from one base and 9 glow layers, so they are cheap. They still need the canvas compositor and the callouts, though, and the first release shouldn't wait for either.
- Greetings launch in English and Hindi. Every other language shows English until a native speaker has checked it (the decision 21 rule).
- The calculator, the plan link and the WhatsApp send are gone (decisions 14 and 18).

### 13.8 Launch blockers

| # | Blocker | Owner | What it blocks | How to close it |
|---|---|---|---|---|
| B1 | /contact keys and one test message (decision 27) | Div | the build start: S7 and both emails use the same keys | `contact-fix.md`, eight steps, about 20 minutes. Verify ziiroai.com in Resend during step 1, because `PLAN_FROM` needs it |
| B2 | Vercel Pro for the "ziiro" team | Div | launch | Settings, then Billing. Hobby is "non-commercial, personal use only"; Pro is $20 per developer seat a month |
| B3 | Neon installed from the Marketplace | Div. It needs the "ziiro" team; the CLI account on the Mac can't see the project | lane B, day 1 | §13.5, about 5 minutes |
| B4 | Adyut's reply-to inbox | Adyut gives it; Div sets `PLAN_REPLY_TO` | nothing: until it's set, replies and alerts go to the team inbox (D7) | Change the variable and redeploy |
| B5 | The Tripo plan behind the two GLBs | Div | launch: the first release shows the spine image, and a model made on the free plan can't be used commercially (Tripo Terms §5.2.1) | Tell us which plan made them. A paid plan closes it. If it was the free plan, move to Pro ($20 a month) and ask Tripo support for written permission for the two existing models. Regenerating them is the last resort: new geometry means re-measuring the gap map (`full-gaps.json`), the glow per gap, the camera fit (`r13-cam-fit.json`) and the disc anchors in §6.7, so it's a new look round with a new approval |
| B6 | Privacy page text | builders draft it in phase 1; Div approves | launch | It must name Neon (Singapore), Resend, Cloudflare Turnstile, Calendly and Vercel, say what is stored, and say that a reply to the plan email is enough to get deleted. Today the only service it names is ipwho.is (`src/pages/Privacy.tsx:275`) |
| B7 | Someone answers deletion replies and resends failed or held plan emails | Adyut | launch, because the copy promises both | deletions done within 7 days with the saved query; failed and held plan emails handled the same working day |
| B8 | The live 3D spine (D2 vetoed on 8 Oct 2026) | builders; Div approves the look | launch | The spine turns under a drag on the hero and the plan and passes the §13.10 gates, and Div approves the look by eye, from the sheets and on his own phone on the Preview |

Not a blocker: the Hindi greeting check (decision 21). Until Div checks the three lines, Hindi visitors see the English line.

### 13.9 What is on ziiroai/main now
Checked with `git fetch ziiroai` and `git show` on 7 Oct.
- **`ziiroai/main` is `02d5fa4`** (29 Sep, PR #31): the homepage plays the Business Brain launch film in place of the brand anthem.
- **Same files elsewhere.** The local branch `feat/business-brain-film` (`993cc2a`) and `ziiroai/dev` hold exactly the same files; only the commit IDs differ, because of squash merges.
- **How to ship:** branch from `ziiroai/main`, open a PR into `ziiroai/dev`, then dev into main. Merge main into dev first.
- **Not on main:** `ziiroai/feat/mobile-burger-nav` (`f6bf9ec`, 24 Sep), the phone burger menu that `copy.md` `ph.nav.menu` describes.

| Area | On main today | What the funnel changes | Phase |
|---|---|---|---|
| `/` | `Index.tsx`: glass-brain hero (WebGL), film, system directory, final CTA, dot art | The funnel replaces it. The 127/30 line lives in `Hero.tsx:69` and `SystemDirectory.tsx:188` and leaves with them (decision 28). Unused home components are deleted (D26, default, owner can veto) | 1 |
| Routes | 14 page routes in `src/app/App.tsx`; the same 14 prerendered by `scripts/routes.mjs` | None in phase 1, since everything stays at `/`. Phase 3 adds the four search pages to `routes.mjs` | 3 |
| App shell | `forcedTheme="dark"` (`App.tsx:194`); Preloader on first load (`:233`); Lenis (`:238`) | Theme tokens from the head script, on `/` only; Preloader skipped on `/` | 1 |
| `api/_lib.ts` | Edge helpers; HTML-only email; header says "no database" | `text` email, idempotency key, Turnstile action and missing-token check, shared disposable list, header rewritten | 1 |
| `api/send-contact.ts`, `api/geo.ts` | Edge runtime (`export const config = { runtime: "edge" }`) | Untouched in phase 1; moved to Node in phase 3 | 3 |
| New files | none | `api/funnel/{visit,lead,_db,_validate,_email}.ts`, `db/funnel.sql`, `src/features/funnel/**` | 1 |
| Spine images | none | `public/spine/r17/**` (§6.6): the hero stills in phase 1, about 0.9 MB for both themes; about 21 MB in all once phase 1b adds beat 1 and the camera moves | 1, 1b |
| Homepage film | `BrandFilm.tsx` plays `ziiro-business-brain-*` (35.8 MB master, 23.0 MB phone; the poster reads "Introducing Business Brain") | It moves to "See how it works" on the plan. The files swap to the renamed film in `funnel/film-trim/spine/out/` (35.3 MB, 22.8 MB, 84 KB poster), re-rendered once more for "BRAIN · LIVE" (§6.5). `BrandFilm.tsx` holds the only "Business Brain" in `src/` (decisions 25 and 26) | 1 |
| Nav | Mission, Who We Are, Products; a "Book a Call" pill to `/book-a-call` (`Navbar.tsx:49`, `:534`) | The same three links (`copy.md` `nav.*`). The pill reads "Book a call" and opens the Calendly event on every page, with name and email when we have them (D14). Phones get the burger branch | 1 |
| Contact page | Turnstile loader inside `Contact.tsx` | The loader moves to a shared hook; the form is unchanged | 1 |
| `vercel.json` | Permissions-Policy blocks the microphone (`:209`); no CSP; no `regions` | `"regions": ["sin1"]` and a year-long immutable cache rule for `/spine/` in phase 1; `microphone=(self)` in phase 2 | 1, 2 |
| `package.json` | no database driver, no test tools (CI runs CodeQL only) | `@neondatabase/serverless`; Vitest, Playwright and axe as dev tools | 1 |
| Privacy | names ipwho.is only | B6 | 1 |
| `src/main.tsx` | `createRoot`, which throws the prerendered DOM away | `hydrateRoot` | 3 |
| `public/media/` | the brand-anthem films (45.9 MB) are no longer referenced | left alone; not the funnel's | – |

### 13.10 Weight and speed budgets
**First screen, `/`.** Phase 1 gates, measured with the Lighthouse mobile profile (a mid phone on 4G):

| Metric | Gate |
|---|---|
| LCP | 2.0 s or less. The greeting text is the LCP, painted from static HTML. On the hero and the plan the r17 still is the spine's LCP element, never the 3D canvas. S0's live spine has no still, and the greeting stays S0's LCP |
| INP | 100 ms or less on taps. No network call between steps. It includes a real first tap made while the 3D is loading (S0's first S1 option, and the plan's hero): the worst of 5 runs at 4× CPU slowdown on Fast 4G. That gate is judged on a real GPU, at 100 ms or less. On SwiftShader, which stands in for a low-end phone's software GL, the runs with the 3D on are held to their own 3D-off baseline (Save-Data, the same steps): their worst tap may be at most one frame (16 ms) slower. S0's gate also times the longest main-thread task up to the tap, held the same way: 50 ms or less on a real GPU, at most one frame over the baseline on SwiftShader |
| CLS | 0.02 or less |
| JS before first paint | 150 KB gz or less (entry plus the funnel chunk, which is 25 KB gz at most). No WebGL, Spline, framer-motion or Preloader before the first paint on `/`. The 3D spine's code is a lazy chunk loaded after the first paint (below) |
| HTML for `/` | 30 KB gz or less, with the head script at 2 KB and the greeting map at 3 KB at most |
| Lighthouse mobile performance | 90 or more on `/` |

**The plan.** §6.6 meets every limit below. The right-hand column is what worker-2 measured on the test files, in light mode, the heavier theme. The plan is never the first load: it opens after S8. Its files load during S5 to S8, which is about 15 to 25 seconds of answering, so the plan appears with no wait. From phase 1b the camera moves stream after the plan paints.

| Item | Limit | Measured (§6.6) |
|---|---|---|
| Plan chunk, code and data | 60 KB gz at most, data 12 KB gz at most, prefetched at S5 | Built in phase 1; held by this gate |
| Hero still, one theme, phone | 120 KB AVIF at most (WebP fallback 180 KB) | The band (D34): 59.2 KB AVIF and 85.0 KB WebP at 1170 × 1230; 37.4 and 55.9 KB at 828 × 870. No 1290 file (D31) |
| Hero still, one theme, desktop | 220 KB AVIF at most (WebP 320 KB), `srcset` at 1280, 1920 and 2560 wide | 52.8 KB AVIF and 89.1 KB WebP at 2560; 36.3 and 60.0 KB at 1920; 21.2 and 33.8 KB at 1280 |
| A plan's lit-disc state (1b), one of the 9 sets in §6.7, superseded by the D2 veto | the same limits as the hero still; a visitor loads only their own set | Ananya's 4 lit discs, the most any plan lights: 38.2 KB AVIF on desktop, 28.2 KB on a phone |
| Everything prefetched before the plan | 500 KB on a phone, 800 KB on desktop | About 119 KB on a phone and 113 KB on desktop in phase 1, with the plan chunk at its limit; about 147 KB and 151 KB from 1b, with beat 1 |
| Scroll sequence (1b), streamed after the plan paints, superseded by the D2 veto | 1.5 MB on a phone and 3 MB on desktop in total, with the next department stop prefetched | Ananya's tour, the heaviest of the 27: 1.29 MB on a phone and 1.94 MB on desktop. Each stop is fetched when she reaches the one before |
| Smoothness (1b), superseded by the D2 veto | 50 fps or more at 4× CPU slowdown, 390 wide; no main-thread task over 50 ms while scrolling; images decoded off the main thread | 120 fps, the display's limit, at 390 × 844 with 4× slowdown; slowest frame 17 ms at the phone size and 10 ms on desktop; no long task; decoded with `createImageBitmap` |
| Decoded frames held (1b), superseded by the D2 veto | 9 composed frames at most: the current one and 4 on each side | About 33 MB on desktop and 23 MB on a phone |
| The still version (1b), superseded by the D2 veto | reduced motion, Save-Data, a 2G or 3G connection, or no AVIF gets the still version (§6.6) | About 53 KB per stop on desktop and 39 KB on a phone, plus beat 1 |
| Film | never preloaded; poster 90 KB at most; video fetched only on tap | Today's poster is 84 KB (§13.9) |
| 3D spine code (D2 veto), a lazy chunk loaded after the first paint | 182,272 bytes (178 KiB) gzip at level 9, all of the 3D code one visit fetches: about 5 % headroom over the 173,754 bytes the gate measured on the f23a457 Preview, so a rebuild's byte jitter or a small fix doesn't trip it (W14-X). The gate is `spine3d-gates.spec.ts` (e); growing past it means updating this row first | W14-X build: 172,795 bytes on the worker path (`host` 1,363 + `spine.worker` 171,432, three.js inside the worker bundle) and 170,697 on the main-thread path (`host` + `scene` 169,334). The software-GL probe worker (`gl-probe.worker`, 324 bytes) loads on every visit that can draw 3D and isn't counted here. 957a755: 172,141 |
| 3D spine mesh (D2 veto), streamed after the first paint | 1.5 MB on a phone, 3 MB on desktop, as transferred | `m1`: 1,402,784 bytes on a phone (94 % of its limit) and 2,674,616 bytes on desktop (89 %), from the 67.8 MB source |

### 13.11 Top risks

| # | Risk | Guard |
|---|---|---|
| 1 | Leads lost without anyone noticing. The same Resend and Turnstile setup fails on /contact today | B1 first; every lead in two places (database and alert); `plan_emails.status`; one retry, then the plan, never a loop; a live test lead in production gates launch; the saved queries read daily in week one |
| 2 | The plan email lands in spam, or the form is used to mail strangers | ziiroai.com verified in Resend (SPF and DKIM); plain text; tracking off; one link; Turnstile on every automatic send, and none for flagged leads; the cleaned echo; the IP limit plus a Vercel Firewall rate-limit rule on `/api/funnel/*`; Resend's 100-a-day cap watched |
| 3 | The forced flow and the required email lose finishers | `last_step` and `contact_errors` from day one; decision 23: if more than 40 % leave at S7 in the first 30 days, the step moves to after the plan |
| 4 | Claims drift | job marks come from data; template B keeps its Pilot tag; the claims check built from Appendix A runs in CI (§12); a claims review before every deploy |
| 5 | Licences | B5 covers the Tripo models. r17 uses only the owner's GLB, so no BodyParts3D credit line is needed unless a BodyParts3D mesh ships again |
| 6 | The render night for phase 1b overruns, or freezes the Mac | Every Blender run goes through the render lock, one job at a time, since three Cycles jobs at once froze the Mac before; it runs during phase 1, off the critical path; each end frame is checked by eye before the batch. If it slips, phase 1b slips and the first release doesn't |

---

## Appendix A. Claims (binding)
From `worker-3.md` §E and `funnel/agents-33.md` §5. A line that isn't allowed here doesn't ship: not on a page, in the email, in the film or in `llms.txt`. The claims check in §12 is built from this table.

| Topic | Allowed | Never |
|---|---|---|
| Jobs | "137 jobs mapped across 7 departments", credited as an industry map | "137", "127" or "107" jobs built, automated or run; "127 jobs · 30 agents" |
| What runs | "We run 6 of these jobs on our own company today" | "11 run today"; "9 run end-to-end"; "9 jobs live"; "all demoable" |
| 33 agents | "The full Business Spine is 33 agents, one for each function in the 137-job map." · "Out of 137 jobs across 33 agents, you need only N today." · "Pay only for the ones you need today. The full spine can come later." The only lines that may put 33 in the same sentence as "today": `sp.hero.h`, `ph.hero.h`, `em.need`, `em.need.fallback`, `seo.home.desc` | "33 agents running", "live", "built" or "ready"; "our 33 agents"; "33 AI employees"; a 33 next to "today" or "live" in any other form |
| Business Spine | The product's name, and the full spine of 33 agents we'd build: the 33 row's rules apply | "live", "running", "built" or "ready" about the Spine, in any form; "used by clients"; "trusted by businesses" |
| The live part (`sp.brain.*`) | "The part that answers questions about your business is live, and we can show you one in 30 seconds"; "live and demoable in 30 seconds"; in the film, "Brain live ✓" and "BRAIN · LIVE" | "used by clients"; any count of users or businesses |
| Our own org | "We run our own company on a 9-agent org", as its own sentence | "9 of the 33 agents run today"; "30 agents" |
| An agent | A mark on each job | "ready agent", "live agent" |
| The lead-gen service | "Pilot", "in development", a film labelled "Concept" | "an AI calls every lead inside 60 s" |
| Clients | Nothing, or "now taking our first clients" | testimonials, logos, "clients", "case study" |
| Price | "Pay only for the agents you need today" | any figure; "save ₹X"; "cheaper than hiring"; "free audit"; any free session |
| Location | "based in India, working with teams worldwide" | a city or an office address |
| Value | Nothing on the funnel | any client ROI; "AI that pays for itself" as a promise |

## Appendix B. Sources
- Decisions: `funnel/wave2.md` (1–9 and 18–29), `wave2b.md` §4, `wave2c.md`, `wave3.md` (10–12), `wave4.md` (13–17), `wave6b.md`, `sketch-v2.md`, `sketch/index.html` (approved 7 Oct), `wave7.md`, `wave8.md`, and the manager's rulings in `wave8-merge.md`.
- The merged sections: `funnel/spec-3d.md` (worker-2), `funnel/spec-33.md` (worker-3) and `funnel/spec-arch.md` (worker-4); the review in `funnel/spec-review.md` (worker-3, 25 findings).
- The web delivery's test files and tools: `funnel/proto/look/web/` (`README.md`, `tools/`, `sheets/`, `hero/`, `seq/`, `layers/` and `test.js`).
- Words and data: `funnel/copy.md`, `templates.md`, `agents-33.md` and `agents-33.json`, `job-buckets.json`, `owner-models/full-gaps.json`.
- Claims: `worker-3.md` §E, `agents-33.md` §5.
- The old plan: `funnel/build-plan.md` and `worker-4-schema.sql`, both replaced by §13 and Appendix C.
- The film: `funnel/film-trim/REPORT.md` and `worker-3.md` wave 6c, parts 3 and 4, which list the film's remaining "brain" lines.
- The site today: `ziiroai/main` at `02d5fa4`, read with `git show` on 7 Oct (`scripts/routes.mjs`, `scripts/llms-full.mjs`, `vercel.json`, `api/_lib.ts`, `src/shared/components/SEO.tsx`, `Navbar.tsx`, `Footer.tsx`, `src/features/pricing/entities/rates.ts`).
- Services, read 7 Oct 2026: Neon pricing (neon.com/pricing) and its Vercel-managed integration (neon.com/docs/guides/vercel-managed-integration); the Vercel Marketplace listing for Neon; Vercel Functions (vercel.com/docs/functions/functions-api-reference) and regions (vercel.com/docs/functions/configuring-functions/region); Resend's send API (resend.com/docs/api-reference/emails/send-email) and pricing (resend.com/pricing); Turnstile's server-side validation and test keys (developers.cloudflare.com/turnstile); Calendly's `name` and `email` prefill (help.calendly.com/hc/en-us/articles/226766767).
- Launch blockers: `funnel/contact-fix.md`; Vercel's Hobby terms (vercel.com/docs/plans/hobby); Tripo Terms §5.2.1 and §5.2.2 (tripo3d.ai/terms), via worker-1's Tripo note (`worker-1.md`, wave 7).

## Appendix C. Schema v3.1 and saved queries
worker-4's schema v3 from `spec-arch.md`, with the merge's additions: `contacts.flag`, the plan-email statuses `held` and `sent_by_hand`, and the visit columns §9 needs.

```sql
-- (C) Funnel schema v3.1, 7 Oct 2026. Neon Postgres via the Vercel Marketplace, aws-ap-southeast-1.
-- v3 (worker-4) replaced worker-4-schema.sql v2: email required, phone optional, no WhatsApp, typed text
-- in contacts, plan_emails added, calculator columns dropped (decision 18).
-- v3.1 (the merge) adds contacts.flag, plan_emails 'held' and 'sent_by_hand', and the visit columns
-- contact_errors, plan_depth, cta_from, plan_view, still_reason and discs_opened.
create table visits (
  id                 uuid primary key,                 -- crypto.randomUUID() in the browser
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  landing_path       text check (char_length(landing_path) <= 200),
  entry_intent       text check (char_length(entry_intent) <= 60),   -- search-page slug (phase 3)
  referrer_host      text check (char_length(referrer_host) <= 120),
  utm                jsonb,
  country            char(2),                          -- x-vercel-ip-country
  timezone           text check (char_length(timezone) <= 64),
  locale             text check (char_length(locale) <= 35),
  day_part           text check (day_part in ('morning','afternoon','evening')),
  theme              text check (theme in ('light','dark')),
  device_class       text check (device_class in ('mobile','tablet','desktop')),
  is_returning       boolean not null default false,
  segment            text check (segment in ('business','agency','freelance','starting','student')),
  non_owner_reason   text,                             -- S1b option id, never typed text
  business_type      text,                             -- S2 option id; 'other' when they typed one
  years_band         text,
  team_band          text,
  revenue_band       text,
  revenue_currency   char(3),
  chips              text[] check (cardinality(chips) <= 3),         -- chip ids, tap order
  input_mode         text check (input_mode in ('typed','chips','mixed','voice')),
  bucket_primary     text,
  bucket_secondary   text,
  bucket_scores      jsonb,
  template           char(1) check (template in ('A','B')),
  order_variant      text,
  tier               char(1) check (tier in ('S','M','L')),
  agent_ids          text[] check (cardinality(agent_ids) <= 9),     -- the plan's agents, scroll order
  job_ids            text[],
  classifier_version text,
  agents_version     text,
  last_step          text check (last_step in ('S0','S1','S1b','S2','S3','S4','S5','S6','S7','S8','S9')),
  seconds_to_result  integer check (seconds_to_result >= 0),
  contact_errors     text[] check (cardinality(contact_errors) <= 10 and contact_errors
                       <@ array['name','email','phone','consent','bot','rate','server','timeout']::text[]),
  plan_depth         smallint check (plan_depth >= 0), -- furthest block: 0 = "you need only", i = stop i, stops + 1 = close
  film_played        boolean not null default false,
  film_pct           smallint check (film_pct between 0 and 100),
  cta_clicked_at     timestamptz,
  cta_from           text check (cta_from in ('header','hero','close')),
  call_booked_at     timestamptz,                      -- set by hand (D21) until a booking tool reports back
  plan_view          text check (plan_view in ('motion','still')),                                  -- phase 1b
  still_reason       text check (still_reason in ('reduced_motion','save_data','slow_connection','unsupported','failed')),
  discs_opened       text[] check (cardinality(discs_opened) <= 7),  -- department ids, phase 1b
  bot_flag           boolean not null default false,
  notice_version     text not null
);

create table contacts (
  id                 uuid primary key default gen_random_uuid(),
  visit_id           uuid not null unique references visits(id) on delete cascade,
  created_at         timestamptz not null default now(),
  name               text not null check (char_length(name) between 1 and 80),
  email              text not null check (char_length(email) between 3 and 254),
  phone_e164         text check (phone_e164 ~ '^\+[1-9][0-9]{6,14}$'),
  business_other     text check (char_length(business_other) <= 80),   -- S2 "Other (type it)"
  problem_text       text check (char_length(problem_text) <= 600),    -- S6, typed
  matched_phrases    text[],
  consent_version    text not null,                    -- version of the exact s7.consent wording
  consent_at         timestamptz not null,
  flag               text check (flag in ('turnstile_unverified','turnstile_failed','rate_limited')),
  withdrawn_at       timestamptz
);

create table plan_emails (
  id                 uuid primary key default gen_random_uuid(),
  contact_id         uuid not null unique references contacts(id) on delete cascade,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  resend_id          text,
  status             text not null check (status in ('sent','failed','held','sent_by_hand','delivered','bounced','complained')),
  agent_ids          text[] not null,
  job_ids            text[] not null,
  error_name         text                              -- Resend's error name only, never a body
);

create index visits_created_idx      on visits (created_at desc);
create index visits_step_idx         on visits (last_step);
create index contacts_created_idx    on contacts (created_at desc);
create index contacts_email_idx      on contacts (lower(email));
create index contacts_flag_idx       on contacts (flag) where flag is not null;
create index plan_emails_status_idx  on plan_emails (status);

-- Saved queries (Neon console). Bot-flagged visits are left out wherever visits are counted.
-- 1. New leads, last 7 days
select c.created_at, c.name, c.email, c.phone_e164, c.flag, v.business_type, v.team_band, v.revenue_band,
       v.template, v.tier, v.agent_ids, p.status as plan_email
from contacts c join visits v on v.id = c.visit_id left join plan_emails p on p.contact_id = c.id
where c.created_at > now() - interval '7 days' order by c.created_at desc;
-- 2. Drop-off by step, last 30 days
select last_step, count(*) from visits
where created_at > now() - interval '30 days' and not bot_flag group by last_step order by last_step;
-- 3. Plan emails to send by hand: failed, or held because the lead was flagged (check a flagged one first)
select c.name, c.email, c.flag, p.status, p.created_at, p.error_name
from plan_emails p join contacts c on c.id = p.contact_id
where p.status in ('failed','held') order by p.created_at;
-- 4. Contact-step rule (decision 23, D23): share of real visitors reaching S7 who never sent it, first 30 days
select round(100.0 * count(*) filter (where last_step = 'S7') / nullif(count(*), 0), 1) as pct_leave_at_s7
from visits
where last_step in ('S7','S8','S9') and not bot_flag
  and created_at < (select min(created_at) from visits where not bot_flag) + interval '30 days';
-- 5. Leads and booked calls by template and tier, last 30 days
select v.template, v.tier, count(c.id) as leads, count(v.call_booked_at) as calls_booked
from visits v left join contacts c on c.visit_id = v.id
where v.created_at > now() - interval '30 days' and not v.bot_flag and v.template is not null
group by v.template, v.tier order by v.template, v.tier;
-- 6. Mark a plan email sent by hand ($1 = the lead's email)
update plan_emails set status = 'sent_by_hand', updated_at = now()
where contact_id = (select id from contacts where lower(email) = lower($1) order by created_at desc limit 1);
-- 7. Mark a call booked (D21): the Calendly booking's email matches a funnel lead
update visits set call_booked_at = now(), updated_at = now()
where id = (select visit_id from contacts where lower(email) = lower($1) order by created_at desc limit 1);
-- 8. Delete a person (D20); their plan-email row goes with it
delete from contacts where lower(email) = lower($1);
-- 9. Monthly clean-up (retention, D20)
delete from contacts where created_at < now() - interval '12 months';
delete from visits   where created_at < now() - interval '24 months';
```
