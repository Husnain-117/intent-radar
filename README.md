# LeadPulse CA — Social Post Intelligence System

Automated California real estate lead generation. Scrapes Quora, Facebook, and Twitter/X using 265,637 keyword queries, scores every post 1–10 with GPT-4o, stores results in PostgreSQL, and surfaces high-intent leads in a Next.js review dashboard.

---

## Tech Stack hi hi hi hi hi

| Layer | Tech |
|---|---|
| Frontend | Next.js 14 (App Router) + React 18 + Tailwind CSS |
| Database | PostgreSQL via Supabase + Prisma 5.x |
| AI Scoring | OpenAI GPT-4o (JSON mode) |
| Post Fetching | RapidAPI — Quora, Facebook, Twitter/X scrapers |
| Queue | BullMQ 5.x + Upstash Redis |
| Deployment | Vercel (UI) + Railway (workers) |

## Setup

```bash
# 1. Install dependencies
pnpm install

# 2. Copy env template and fill in your values
cp .env.example .env

# 3. Run database migration
npx prisma migrate dev --name init

# 4. Start dev server
pnpm dev
```

## Environment Variables

See `.env.example` for the full list. Required for Phase 1:

- `DATABASE_URL` — Supabase PostgreSQL connection string
- `NEXT_PUBLIC_SUPABASE_URL` — Supabase project URL
- `SUPABASE_ANON_KEY` — Supabase anon/public key
- `NEXTAUTH_SECRET` — Random 32-char string

## Implementation Phases

| Phase | Status | What |
|---|---|---|
| 1 — Foundation | ✅ Complete | Next.js + Prisma + env + core libs |
| 2 — Keyword Engine | ⏳ Next | CSV loader + artifact cleaning + weighted rotation |
| 3 — Platform Fetchers | ⏳ Pending | 3 RapidAPI fetchers + retry wrapper |
| 4 — AI Filter | ⏳ Pending | GPT-4o scoring + batch processing |
| 5 — Queue System | ⏳ Pending | BullMQ scheduler + worker entry point |
| 6 — Dashboard UI | ⏳ Pending | API routes + React components |
| 7 — Deployment | ⏳ Pending | Vercel + Railway + Sentry |

## Keywords

265,637 unique keyword queries generated from:
- 183 templates across 15 intent categories (A–O)
- 1,400+ California places (counties, cities, neighborhoods, slang)
- Intent weights scoring 37 phrases (weight 2–12)

## Project Structure

```
leadpulse-ca/
├── keywords/               # Keyword generation files
│   ├── generated_keywords.csv
│   ├── intent_weights_v2.json
│   ├── master_templates_v3_complete.txt
│   └── places_california_complete_v2.txt
├── prisma/
│   └── schema.prisma       # Post, Worker, FetchLog models
├── src/
│   ├── app/                # Next.js App Router pages
│   ├── lib/                # Core singletons (prisma, redis, env, utils)
│   └── types/              # Shared TypeScript types
├── worker/                 # BullMQ workers (Phase 5)
└── scripts/                # Test scripts (Phase 2+)
```
