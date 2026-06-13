-- Sync the skillync feature layer onto databases that only ever received the
-- generated 0000–0002 migrations. Those used CREATE TABLE IF NOT EXISTS, which
-- silently no-ops on pre-existing tables — so production was left missing
-- columns (applications.archived, resumes.resume_score, …) and the
-- user_employment table entirely. Every statement here is idempotent and safe
-- to run repeatedly.

-- ── applications: archive past job-search cycles (accepted offers) ─────────────
ALTER TABLE "applications" ADD COLUMN IF NOT EXISTS "archived" boolean DEFAULT false;
--> statement-breakpoint

-- ── resumes: standalone resume-quality score ───────────────────────────────────
ALTER TABLE "resumes" ADD COLUMN IF NOT EXISTS "resume_score" integer;--> statement-breakpoint
ALTER TABLE "resumes" ADD COLUMN IF NOT EXISTS "score_breakdown" jsonb;--> statement-breakpoint

-- ── job_listings: tracking + differentiator columns ────────────────────────────
ALTER TABLE "job_listings" ADD COLUMN IF NOT EXISTS "content_hash" text;--> statement-breakpoint
ALTER TABLE "job_listings" ADD COLUMN IF NOT EXISTS "last_seen_at" timestamp with time zone DEFAULT now();--> statement-breakpoint
ALTER TABLE "job_listings" ADD COLUMN IF NOT EXISTS "seen_count" integer DEFAULT 1;--> statement-breakpoint
ALTER TABLE "job_listings" ADD COLUMN IF NOT EXISTS "repost_count" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "job_listings" ADD COLUMN IF NOT EXISTS "ghost_score" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "job_listings" ADD COLUMN IF NOT EXISTS "scam_score" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "job_listings" ADD COLUMN IF NOT EXISTS "scam_flags" text[];--> statement-breakpoint
ALTER TABLE "job_listings" ADD COLUMN IF NOT EXISTS "est_salary_min" integer;--> statement-breakpoint
ALTER TABLE "job_listings" ADD COLUMN IF NOT EXISTS "est_salary_max" integer;--> statement-breakpoint
ALTER TABLE "job_listings" ADD COLUMN IF NOT EXISTS "salary_is_estimated" boolean DEFAULT false;--> statement-breakpoint

-- ── job_matches: two-stage matching fields + dedup constraint ──────────────────
ALTER TABLE "job_matches" ADD COLUMN IF NOT EXISTS "prefilter_score" integer;--> statement-breakpoint
ALTER TABLE "job_matches" ADD COLUMN IF NOT EXISTS "is_ai_scored" boolean DEFAULT false;--> statement-breakpoint
DELETE FROM "job_matches" a
USING "job_matches" b
WHERE a.user_id = b.user_id
  AND a.job_id = b.job_id
  AND a.ctid < b.ctid;--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "job_matches" ADD CONSTRAINT "job_matches_user_job_unique" UNIQUE ("user_id", "job_id");
EXCEPTION WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

-- ── alerts: frequency throttle ─────────────────────────────────────────────────
ALTER TABLE "alerts" ADD COLUMN IF NOT EXISTS "last_sent_at" timestamp with time zone;--> statement-breakpoint

-- ── user_employment: current-job context ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS "user_employment" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid,
  "company" text,
  "role" text,
  "employment_type" text DEFAULT 'full-time',
  "compensation" text,
  "start_date" text,
  "has_freelancing" boolean DEFAULT false,
  "freelance_income" text,
  "freelance_type" text,
  "updated_at" timestamp with time zone DEFAULT now(),
  CONSTRAINT "user_employment_user_id_unique" UNIQUE ("user_id")
);--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "user_employment" ADD CONSTRAINT "user_employment_user_id_users_id_fk"
    FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

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
);--> statement-breakpoint

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
);--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk"
    FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
