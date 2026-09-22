# Ziiro AI: Agentic AI Systems

> **Agentic AI systems for startups and solo founders.**  
> Live at [ziiro.work](https://ziiro.work)

---

## What is Ziiro?

Ziiro builds agentic AI systems for startups, solo founders, and lean teams. We turn repeated work into agents, self-optimizing marketing, outreach, website, and workflow loops, plus role diagnostics so founders can get leverage before they can afford headcount.

The company direction is agentic AI consultancy and productized systems for lean, founder-led teams..

---

## What We Do

| Service | Outcome |
|---|---|
| **Agentic Systems** | Custom AI operators for research, routing, reporting, follow-ups, and repeated decisions |
| **Self-Optimizing Systems** | Marketing, outreach, website, and workflow loops that track outcomes and improve automatically |
| **UGC Ads & Management** | Creator sourcing, UGC-style ads, and paid campaign management as a focused side growth channel |
| **AI Strategy Sprint** | A focused roadmap for the highest-leverage agentic system to build first |
| **Role Analyzer** | A diagnostic that maps people to the work they should own and identifies role bottlenecks |

---

## How It Works

1. **Systems Audit**: We find the manual loops, decisions, and founder tasks that should become agents
2. **Agent Blueprint**: We design the agents, tools, data, feedback loops, and guardrails
3. **Build & Connect**: We ship the system into your stack
4. **Measure & Improve**: The system tracks outcomes and gets sharper over time

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React + Vite + TypeScript |
| Styling | Tailwind CSS, with CSS custom properties for the palette |
| UI primitives | Radix, for the toast and tooltip only |
| Server | One Vercel Edge Function in `api/`, for geo lookup. No database |
| SEO | react-helmet-async + JSON-LD schema, prerendered at build time |
| Deployment | Vercel + custom domain (ziiro.work) |

The site started as a shadcn scaffold and no longer uses it: there is no
`src/components/ui`, no shadcn CLI config, and the component library is the
project's own under `src/shared` and `src/features`.

---

## Local Development

```bash
# Clone the repo
git clone https://github.com/ziiroAi/ziiro-website.git
cd ziiro-website

# Install dependencies
npm install

# No environment variables are needed. See .env.example for why.

# Start the dev server
npm run dev
```

The app runs at `http://localhost:8081` by default.

---

## Environment Variables

There are none. `api/geo.ts` reads a header Vercel sets for it and takes no
configuration, and the client bundle reads no environment variables at all.

The `RESEND_*` and `TEAM_INBOX` vars documented here previously were read by
`api/send-contact.ts`, which has been deleted. See `.env.example`.

---

## Pages

| Route | Description |
|---|---|
| `/` | Home: agentic systems positioning, how it works, strategic focus, CTA |
| `/services` | All 5 agentic offers with orbital diagram |
| `/contact` | Booking card: rate, what the hour covers, and a link out to Calendly |
| `/privacy` | Privacy Policy |
| `/terms` | Terms & Conditions |

---

## Contact

**Email:** contact@ziiroai.com  
**X / Twitter:** [@ziir0ai](https://x.com/ziir0ai)  
**LinkedIn:** [Ziiro AI](https://www.linkedin.com/company/zirroai/)  
**Instagram:** [@ziiroai](https://www.instagram.com/ziiroai)
