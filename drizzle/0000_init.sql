-- Skillync schema — generated from db/schema.ts
-- Replaces all legacy Finnlo tables

CREATE TABLE IF NOT EXISTS "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"clerk_id" text UNIQUE NOT NULL,
	"name" text,
	"email" text,
	"created_at" timestamptz DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "resumes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid REFERENCES "users"("id") ON DELETE CASCADE,
	"label" text DEFAULT 'My Resume',
	"raw_text" text,
	"parsed_skills" text[],
	"parsed_titles" text[],
	"experience_years" integer,
	"file_url" text,
	"is_active" boolean DEFAULT false,
	"created_at" timestamptz DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "job_listings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"company" text NOT NULL,
	"location" text,
	"description" text,
	"source_url" text UNIQUE,
	"source_platform" text,
	"salary_min" integer,
	"salary_max" integer,
	"is_remote" boolean DEFAULT false,
	"is_ghost" boolean DEFAULT false,
	"posted_at" timestamptz,
	"fetched_at" timestamptz DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "job_matches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid REFERENCES "users"("id") ON DELETE CASCADE,
	"job_id" uuid REFERENCES "job_listings"("id") ON DELETE CASCADE,
	"resume_id" uuid REFERENCES "resumes"("id"),
	"match_score" integer,
	"matched_skills" text[],
	"missing_skills" text[],
	"reasoning" text,
	"created_at" timestamptz DEFAULT now(),
	CONSTRAINT "job_matches_user_id_job_id_unique" UNIQUE("user_id", "job_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "applications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid REFERENCES "users"("id") ON DELETE CASCADE,
	"job_id" uuid REFERENCES "job_listings"("id"),
	"status" text DEFAULT 'saved',
	"notes" text,
	"applied_at" timestamptz,
	"updated_at" timestamptz DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "alerts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid REFERENCES "users"("id") ON DELETE CASCADE,
	"keywords" text[],
	"location" text,
	"salary_min" integer,
	"remote_only" boolean DEFAULT false,
	"frequency" text DEFAULT 'daily',
	"is_active" boolean DEFAULT true
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "email_configs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid REFERENCES "users"("id") ON DELETE CASCADE UNIQUE,
	"smtp_host" text,
	"smtp_port" integer DEFAULT 587,
	"smtp_user" text,
	"smtp_pass" text,
	"from_email" text,
	"is_verified" boolean DEFAULT false
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "company_watchers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid REFERENCES "users"("id") ON DELETE CASCADE,
	"company_name" text,
	"job_count_last_week" integer DEFAULT 0,
	"job_count_this_week" integer DEFAULT 0,
	"is_surge" boolean DEFAULT false,
	"last_checked" timestamptz DEFAULT now()
);
