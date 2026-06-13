-- Skillync feature build — idempotent migration.
-- Apply via the Supabase SQL editor or psql once the database is reachable.
-- Safe to run more than once. (Alternatively just run `npm run db:push`.)

-- ── resumes: standalone resume-quality score ───────────────────────────────────
ALTER TABLE "resumes" ADD COLUMN IF NOT EXISTS "resume_score" integer;
ALTER TABLE "resumes" ADD COLUMN IF NOT EXISTS "score_breakdown" jsonb;

-- ── job_listings: tracking + differentiator columns ────────────────────────────
ALTER TABLE "job_listings" ADD COLUMN IF NOT EXISTS "content_hash" text;
ALTER TABLE "job_listings" ADD COLUMN IF NOT EXISTS "last_seen_at" timestamp with time zone DEFAULT now();
ALTER TABLE "job_listings" ADD COLUMN IF NOT EXISTS "seen_count" integer DEFAULT 1;
ALTER TABLE "job_listings" ADD COLUMN IF NOT EXISTS "repost_count" integer DEFAULT 0;
ALTER TABLE "job_listings" ADD COLUMN IF NOT EXISTS "ghost_score" integer DEFAULT 0;
ALTER TABLE "job_listings" ADD COLUMN IF NOT EXISTS "scam_score" integer DEFAULT 0;
ALTER TABLE "job_listings" ADD COLUMN IF NOT EXISTS "scam_flags" text[];
ALTER TABLE "job_listings" ADD COLUMN IF NOT EXISTS "est_salary_min" integer;
ALTER TABLE "job_listings" ADD COLUMN IF NOT EXISTS "est_salary_max" integer;
ALTER TABLE "job_listings" ADD COLUMN IF NOT EXISTS "salary_is_estimated" boolean DEFAULT false;

-- ── job_matches: two-stage matching fields ─────────────────────────────────────
ALTER TABLE "job_matches" ADD COLUMN IF NOT EXISTS "prefilter_score" integer;
ALTER TABLE "job_matches" ADD COLUMN IF NOT EXISTS "is_ai_scored" boolean DEFAULT false;

-- Remove any pre-existing duplicate (user_id, job_id) rows before adding the
-- unique constraint the upsert pipeline relies on. Keeps the most recent row.
DELETE FROM "job_matches" a
USING "job_matches" b
WHERE a.user_id = b.user_id
  AND a.job_id = b.job_id
  AND a.ctid < b.ctid;

DO $$ BEGIN
  ALTER TABLE "job_matches" ADD CONSTRAINT "job_matches_user_job_unique" UNIQUE ("user_id", "job_id");
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- ── alerts: frequency throttle ─────────────────────────────────────────────────
ALTER TABLE "alerts" ADD COLUMN IF NOT EXISTS "last_sent_at" timestamp with time zone;

-- ── company_stats: global hiring-surge tracking ────────────────────────────────
CREATE TABLE IF NOT EXISTS "company_stats" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "company_name" text NOT NULL,
  "job_count_this_week" integer DEFAULT 0,
  "job_count_last_week" integer DEFAULT 0,
  "is_surge" boolean DEFAULT false,
  "surge_started_at" timestamp with time zone,
  "last_checked" timestamp with time zone DEFAULT now(),
  CONSTRAINT "company_stats_company_name_unique" UNIQUE ("company_name")
);

-- ── notifications: in-app alert bell ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "notifications" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid,
  "type" text DEFAULT 'job_match',
  "title" text NOT NULL,
  "body" text,
  "job_id" uuid,
  "is_read" boolean DEFAULT false,
  "created_at" timestamp with time zone DEFAULT now()
);

DO $$ BEGIN
  ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk"
    FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
