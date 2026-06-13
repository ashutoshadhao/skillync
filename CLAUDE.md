# CLAUDE.md

Guidance for working in this repo.

## What this project is

**Skillync** — an AI job-search co-pilot focused on the Indian market. It:

- Scrapes job listings from **Indeed (India), Naukri, and Internshala** (`lib/scraper.ts`).
- Parses uploaded PDF resumes with **Google Gemini** to extract skills/titles/experience.
- Scores how well a resume matches a job (also Gemini), and can tailor bullet points / generate cover letters.
- Tracks applications on a **Kanban board** (`/tracker`), manages **job alerts**, and emails a **daily digest** via user-configured SMTP.

The app is **fully free** — there is no billing/subscription. All features are available to every signed-in user.

> History: this repo was originally forked from a personal-finance app called **finnlo**. The finance code (accounts/transactions/categories, Plaid, charts, the Hono API) and the old subscription/billing layer (Razorpay, LemonSqueezy, Pro plans) have since been **removed**. If you find a stray reference to any of those, it's a leftover worth deleting.

## Tech stack

- **Next.js 14.2.3** App Router, React 18, TypeScript. Path alias `@/*` → repo root.
- **Clerk** for auth (`middleware.ts` protects everything except `/`, sign-in/up, the Clerk webhook, and `/api/cron/*`).
- **Drizzle ORM** + **Postgres** (`db/drizzle.ts`, schema in `db/schema.ts`). DB is Supabase Postgres (pooler) in `.env`, with a singleton client to survive dev hot-reloads.
- **Supabase Storage** for resume PDFs (`lib/supabase.ts` — clients return `null` if env keys are absent, and callers degrade gracefully).
- **Google Gemini** (`@google/generative-ai`) — all AI lives in `lib/gemini.ts`.
- **nodemailer** for email digests; **cheerio + axios** for scraping; **TanStack React Query**; **recharts** (dashboard charts); **Tailwind + Radix UI** (shadcn-style primitives in `components/ui/`).

## Commands

```bash
npm run dev            # next dev (port 3000)
npm run build          # next build
npm run lint           # next lint
npm run db:generate    # drizzle-kit generate
npm run db:migrate     # drizzle-kit migrate
npm run db:push        # drizzle-kit push (push schema directly — handy in dev)
npm run db:studio      # drizzle-kit studio
npm run db:run-migrate # npx tsx scripts/migrate.ts (applies drizzle/ migrations)
npm run jobs:fetch     # hit the local fetch-jobs cron endpoint with the dev secret
```

Migrations under `drizzle/` are **hand-maintained** (there is no drizzle-kit snapshot in `drizzle/meta/`, so `db:generate` won't diff a schema change — add a numbered `.sql` file and register it in `drizzle/meta/_journal.json`, or just use `db:push` in dev).

## Data model (`db/schema.ts`)

Tables: `users`, `resumes`, `jobListings`, `jobMatches`, `applications`, `alerts`, `emailConfigs`, `companyWatchers`. All keyed by UUID; everything hangs off `users` (cascade delete). `jobListings.sourceUrl` is unique (used for scrape dedup). `resumes.isActive` marks the resume used for matching. `applications.status` is one of `saved | applied | viewed | interview | offer | rejected`.

## Conventions & patterns

- **API routes are Next.js Route Handlers** under `app/api/`. Each handler:
  1. Gets the Clerk user: `const { userId: clerkId } = auth()` (from `@clerk/nextjs/server`); 401 if missing.
  2. Resolves the internal user via `SELECT ... FROM users WHERE clerkId = ...`. This clerkId → internal-UUID lookup is repeated in nearly every route.
- **User provisioning:** `POST /api/user/sync` upserts the DB user on every client auth load (the `Sidebar` calls it) — the app does not depend on the Clerk webhook firing.
- **Gemini calls** (`lib/gemini.ts`) all use `generateWithFallback` (model chain: `gemini-2.5-flash-preview-04-17` → `2.0-flash` → `2.0-flash-lite`, retrying on 429/404) and strip ```json fences before `JSON.parse`. Keep that pattern when adding new prompts.
- **Scraping** (`lib/scraper.ts`): rotates user-agents, runs the three site scrapers via `Promise.allSettled`, dedups by `sourceUrl`, flags `isGhost` if `postedAt` > 45 days old. Scrapers cap at 20 results each. Selectors are site-specific and brittle — expect to re-tune when sites change markup.
- **Cron:** `vercel.json` runs `GET /api/cron/fetch-jobs` every 6 hours. It is gated by an `x-cron-secret` header that must equal `CRON_SECRET` (not Clerk auth).
- **Styling:** the UI uses inline-style hex theming (dark teal `#0d9488`/`#162020` palette, `Space Grotesk` font), not the Tailwind config tokens. Match the surrounding component when editing.
- **Resume limit:** a flat cap of 5 resumes per user, enforced in `app/api/resume/upload/route.ts` and surfaced in `app/(dashboard)/resume/page.tsx`.

## Unused-but-kept scaffolding

These job-feature files exist but nothing imports them yet — left in place intentionally for future wiring (do not assume they're live): `components/dashboard/{JobCard,FilterBar,StatsBar}.tsx`, `hooks/{useJobs,useMatches,useUser}.ts`, `components/welcome-msg.tsx`.

## Env vars

See `.env.example`. Required: Clerk (`NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, `CLERK_WEBHOOK_SECRET`), Supabase (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`), `DATABASE_URL`, `GEMINI_API_KEY`, `NEXT_PUBLIC_APP_URL`, and `CRON_SECRET`.

## Known minor issues

- `app/onboarding/page.tsx` has a stray `}` in a JSX comment near the "Step 1: Preferences" block (renders a literal `}`).
- `promt.txt` (sic) at the repo root is a product spec / prompt doc, not code.
</content>
