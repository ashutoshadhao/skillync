CREATE TABLE IF NOT EXISTS "alerts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"keywords" text[],
	"location" text,
	"salary_min" integer,
	"remote_only" boolean DEFAULT false,
	"frequency" text DEFAULT 'daily',
	"is_active" boolean DEFAULT true,
	"last_sent_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "applications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"job_id" uuid,
	"title" text,
	"company" text,
	"location" text,
	"url" text,
	"salary" text,
	"status" text DEFAULT 'saved',
	"notes" text,
	"applied_at" timestamp with time zone,
	"updated_at" timestamp with time zone DEFAULT now(),
	"archived" boolean DEFAULT false
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "company_stats" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_name" text NOT NULL,
	"job_count_this_week" integer DEFAULT 0,
	"job_count_last_week" integer DEFAULT 0,
	"is_surge" boolean DEFAULT false,
	"surge_started_at" timestamp with time zone,
	"last_checked" timestamp with time zone DEFAULT now(),
	CONSTRAINT "company_stats_company_name_unique" UNIQUE("company_name")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "company_watchers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"company_name" text,
	"job_count_last_week" integer DEFAULT 0,
	"job_count_this_week" integer DEFAULT 0,
	"is_surge" boolean DEFAULT false,
	"last_checked" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "email_configs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"smtp_host" text,
	"smtp_port" integer DEFAULT 587,
	"smtp_user" text,
	"smtp_pass" text,
	"from_email" text,
	"is_verified" boolean DEFAULT false,
	CONSTRAINT "email_configs_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "job_listings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"company" text NOT NULL,
	"location" text,
	"description" text,
	"source_url" text,
	"source_platform" text,
	"salary_min" integer,
	"salary_max" integer,
	"is_remote" boolean DEFAULT false,
	"is_ghost" boolean DEFAULT false,
	"content_hash" text,
	"last_seen_at" timestamp with time zone DEFAULT now(),
	"seen_count" integer DEFAULT 1,
	"repost_count" integer DEFAULT 0,
	"ghost_score" integer DEFAULT 0,
	"scam_score" integer DEFAULT 0,
	"scam_flags" text[],
	"est_salary_min" integer,
	"est_salary_max" integer,
	"salary_is_estimated" boolean DEFAULT false,
	"posted_at" timestamp with time zone,
	"fetched_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "job_listings_source_url_unique" UNIQUE("source_url")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "job_matches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"job_id" uuid,
	"resume_id" uuid,
	"prefilter_score" integer,
	"is_ai_scored" boolean DEFAULT false,
	"match_score" integer,
	"matched_skills" text[],
	"missing_skills" text[],
	"reasoning" text,
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "job_matches_user_job_unique" UNIQUE("user_id","job_id")
);
--> statement-breakpoint
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
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "resumes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"label" text DEFAULT 'My Resume',
	"raw_text" text,
	"parsed_skills" text[],
	"parsed_titles" text[],
	"experience_years" integer,
	"file_url" text,
	"is_active" boolean DEFAULT false,
	"resume_score" integer,
	"score_breakdown" jsonb,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
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
	CONSTRAINT "user_employment_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"clerk_id" text NOT NULL,
	"name" text,
	"email" text,
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "users_clerk_id_unique" UNIQUE("clerk_id")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "alerts" ADD CONSTRAINT "alerts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "applications" ADD CONSTRAINT "applications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "applications" ADD CONSTRAINT "applications_job_id_job_listings_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."job_listings"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "company_watchers" ADD CONSTRAINT "company_watchers_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "email_configs" ADD CONSTRAINT "email_configs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "job_matches" ADD CONSTRAINT "job_matches_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "job_matches" ADD CONSTRAINT "job_matches_job_id_job_listings_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."job_listings"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "job_matches" ADD CONSTRAINT "job_matches_resume_id_resumes_id_fk" FOREIGN KEY ("resume_id") REFERENCES "public"."resumes"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "resumes" ADD CONSTRAINT "resumes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "user_employment" ADD CONSTRAINT "user_employment_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
