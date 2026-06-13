-- ─────────────────────────────────────────────────────────────────────────────
-- Skillync – Supabase RLS Policies
-- Run this in Supabase SQL editor after running Drizzle migrations
-- ─────────────────────────────────────────────────────────────────────────────

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE resumes ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_watchers ENABLE ROW LEVEL SECURITY;

-- ─── Helper: get Skillync user_id from clerk_id stored in JWT ───────────────
-- Clerk stores the user id as the JWT "sub" claim.
-- We expose it as auth.uid() alias via a custom function:
CREATE OR REPLACE FUNCTION skillync_user_id()
RETURNS uuid
LANGUAGE sql STABLE
AS $$
  SELECT id FROM users WHERE clerk_id = auth.jwt() ->> 'sub' LIMIT 1;
$$;

-- ─── users ───────────────────────────────────────────────────────────────────
CREATE POLICY "users: self read"
  ON users FOR SELECT
  USING (clerk_id = auth.jwt() ->> 'sub');

CREATE POLICY "users: self update"
  ON users FOR UPDATE
  USING (clerk_id = auth.jwt() ->> 'sub');

-- Service role (server-side) can do everything – handled by bypassing RLS
-- with supabaseAdmin client which uses the service_role key.

-- ─── resumes ─────────────────────────────────────────────────────────────────
CREATE POLICY "resumes: owner read"
  ON resumes FOR SELECT
  USING (user_id = skillync_user_id());

CREATE POLICY "resumes: owner insert"
  ON resumes FOR INSERT
  WITH CHECK (user_id = skillync_user_id());

CREATE POLICY "resumes: owner update"
  ON resumes FOR UPDATE
  USING (user_id = skillync_user_id());

CREATE POLICY "resumes: owner delete"
  ON resumes FOR DELETE
  USING (user_id = skillync_user_id());

-- ─── job_listings ─────────────────────────────────────────────────────────────
-- All authenticated users can read job listings
CREATE POLICY "job_listings: authenticated read"
  ON job_listings FOR SELECT
  TO authenticated
  USING (true);

-- Only service role writes job listings (cron scraper)

-- ─── job_matches ──────────────────────────────────────────────────────────────
CREATE POLICY "job_matches: owner read"
  ON job_matches FOR SELECT
  USING (user_id = skillync_user_id());

CREATE POLICY "job_matches: owner insert"
  ON job_matches FOR INSERT
  WITH CHECK (user_id = skillync_user_id());

CREATE POLICY "job_matches: owner update"
  ON job_matches FOR UPDATE
  USING (user_id = skillync_user_id());

-- ─── applications ─────────────────────────────────────────────────────────────
CREATE POLICY "applications: owner read"
  ON applications FOR SELECT
  USING (user_id = skillync_user_id());

CREATE POLICY "applications: owner insert"
  ON applications FOR INSERT
  WITH CHECK (user_id = skillync_user_id());

CREATE POLICY "applications: owner update"
  ON applications FOR UPDATE
  USING (user_id = skillync_user_id());

CREATE POLICY "applications: owner delete"
  ON applications FOR DELETE
  USING (user_id = skillync_user_id());

-- ─── alerts ───────────────────────────────────────────────────────────────────
CREATE POLICY "alerts: owner read"
  ON alerts FOR SELECT
  USING (user_id = skillync_user_id());

CREATE POLICY "alerts: owner insert"
  ON alerts FOR INSERT
  WITH CHECK (user_id = skillync_user_id());

CREATE POLICY "alerts: owner delete"
  ON alerts FOR DELETE
  USING (user_id = skillync_user_id());

-- ─── email_configs ────────────────────────────────────────────────────────────
CREATE POLICY "email_configs: owner read"
  ON email_configs FOR SELECT
  USING (user_id = skillync_user_id());

CREATE POLICY "email_configs: owner insert"
  ON email_configs FOR INSERT
  WITH CHECK (user_id = skillync_user_id());

CREATE POLICY "email_configs: owner update"
  ON email_configs FOR UPDATE
  USING (user_id = skillync_user_id());

-- ─── company_watchers ────────────────────────────────────────────────────────
CREATE POLICY "company_watchers: owner read"
  ON company_watchers FOR SELECT
  USING (user_id = skillync_user_id());

CREATE POLICY "company_watchers: owner insert"
  ON company_watchers FOR INSERT
  WITH CHECK (user_id = skillync_user_id());

CREATE POLICY "company_watchers: owner delete"
  ON company_watchers FOR DELETE
  USING (user_id = skillync_user_id());

-- ─── Storage bucket for resumes ───────────────────────────────────────────────
-- Run this to create the resumes storage bucket (if not already done via dashboard)
INSERT INTO storage.buckets (id, name, public)
VALUES ('resumes', 'resumes', false)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload their own files
CREATE POLICY "resumes bucket: owner upload"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'resumes' AND (storage.foldername(name))[1] = auth.jwt() ->> 'sub');

CREATE POLICY "resumes bucket: owner read"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'resumes' AND (storage.foldername(name))[1] = auth.jwt() ->> 'sub');

CREATE POLICY "resumes bucket: owner delete"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'resumes' AND (storage.foldername(name))[1] = auth.jwt() ->> 'sub');
