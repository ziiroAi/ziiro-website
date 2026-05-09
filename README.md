# Ziiro AI — AI Automation Agency

> **Scale your business on autopilot.**  
> Live at [ziiro.work](https://ziiro.work)

---

## What is Ziiro?

Ziiro is an AI automation agency that builds custom systems to help businesses grow without growing their headcount. We replace manual, repetitive work with intelligent pipelines that run 24/7 — so founders and teams can focus on what actually moves the needle.

Our own go-to-market runs entirely on the same system we build for clients. 24+ AI workflows. ~$200/mo in infra. 20 minutes of human oversight per day.

---

## What We Do

| Service | Outcome |
|---|---|
| **Cold Outreach** | Hyper-personalised email and LinkedIn sequences that land in inboxes, not spam — and get replies |
| **UGC Ads & Management** | Creator-sourced UGC ads + paid campaign management across Meta and TikTok |
| **Pipeline Automation** | Automated follow-ups, CRM updates, and deal-stage triggers so your pipeline runs itself |
| **Lead Generation** | Targeted prospect lists and multi-channel flows that deliver sales-ready leads daily |
| **Social Content** | Scroll-stopping posts, carousels, and short-form video that keeps your brand always-on |

---

## How It Works

1. **Discovery Call** — We learn your business and find where automation creates the biggest leverage
2. **Architecture Blueprint** — Custom system design with clear timeline and fixed pricing
3. **Build & Deploy** — Your AI system goes live in weeks, fully connected to your stack
4. **Autonomous Growth** — Pipeline runs 24/7. You stay in control in 15–20 minutes per day

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
| `/` | Home — hero, how it works, case study, CTA |
| `/services` | All 5 services with orbital diagram |
| `/audit` | Free AI audit tool with instant results + Calendly booking |
| `/contact` | Contact form (sends email notification via Resend) |
| `/privacy` | Privacy Policy |
| `/terms` | Terms & Conditions |

---

## Contact

**Email:** govind@ziiro.work · aniket@ziiro.work  
**X / Twitter:** [@ziir0ai](https://x.com/ziir0ai)  
**LinkedIn:** [Ziiro AI](https://www.linkedin.com/company/zirroai/)  
**Instagram:** [@ziiroai](https://www.instagram.com/ziiroai)
