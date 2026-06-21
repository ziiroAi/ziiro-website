# Ziiro AI — Agentic AI Systems

> **Agentic AI systems for startups and solo founders.**  
> Live at [ziiro.work](https://ziiro.work)

---

## What is Ziiro?

Ziiro builds agentic AI systems for startups, solo founders, and lean teams. We turn repeated work into agents, self-optimizing marketing, outreach, website, and workflow loops, plus role diagnostics so founders can get leverage before they can afford headcount.

The company direction is agentic AI consultancy and productized systems for lean, founder-led teams.

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

1. **Systems Audit** — We find the manual loops, decisions, and founder tasks that should become agents
2. **Agent Blueprint** — We design the agents, tools, data, feedback loops, and guardrails
3. **Build & Connect** — We ship the system into your stack
4. **Measure & Improve** — The system tracks outcomes and gets sharper over time

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React + Vite + TypeScript |
| Styling | Tailwind CSS + shadcn/ui |
| Backend / DB | Supabase (Postgres + Edge Functions) |
| Email | Resend API |
| SEO | react-helmet-async + JSON-LD schema |
| Deployment | Vercel + custom domain (ziiro.work) |

---

## Local Development

```bash
# Clone the repo
git clone https://github.com/Govind0404/ziiro-ai-vision.git
cd ziiro-ai-vision

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Fill in your Supabase and Resend keys in .env

# Start the dev server
npm run dev
```

The app runs at `http://localhost:8080` by default.

---

## Environment Variables

```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your_supabase_anon_key
VITE_SUPABASE_PROJECT_ID=your_project_id
```

> `RESEND_API_KEY` and `SUPABASE_ACCESS_TOKEN` are only needed for deploying Supabase Edge Functions — they never go in the frontend bundle.

---

## Pages

| Route | Description |
|---|---|
| `/` | Home — agentic systems positioning, how it works, strategic focus, CTA |
| `/services` | All 5 agentic offers with orbital diagram |
| `/audit` | Free Agentic Systems Audit with instant results + Calendly booking |
| `/contact` | Contact form (sends email notification via Resend) |
| `/privacy` | Privacy Policy |
| `/terms` | Terms & Conditions |

---

## Contact

**Email:** govind@ziiro.work · aniket@ziiro.work  
**X / Twitter:** [@ziir0ai](https://x.com/ziir0ai)  
**LinkedIn:** [Ziiro AI](https://www.linkedin.com/company/zirroai/)  
**Instagram:** [@ziiroai](https://www.instagram.com/ziiroai)
