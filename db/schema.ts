import { createInsertSchema } from "drizzle-zod";
import { relations } from "drizzle-orm";
import {
  integer,
  pgTable,
  text,
  timestamp,
  boolean,
  uuid,
  jsonb,
  unique,
} from "drizzle-orm/pg-core";

// ── Users (synced from Clerk webhook) ─────────────────────────────────────────
export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  clerkId: text("clerk_id").unique().notNull(),
  name: text("name"),
  email: text("email"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const usersRelations = relations(users, ({ many, one }) => ({
  resumes: many(resumes),
  jobMatches: many(jobMatches),
  applications: many(applications),
  alerts: many(alerts),
  emailConfig: one(emailConfigs, {
    fields: [users.id],
    references: [emailConfigs.userId],
  }),
  companyWatchers: many(companyWatchers),
  employment: one(userEmployment, {
    fields: [users.id],
    references: [userEmployment.userId],
  }),
}));

export const insertUserSchema = createInsertSchema(users);

// ── Resumes ────────────────────────────────────────────────────────────────────
export const resumes = pgTable("resumes", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),
  label: text("label").default("My Resume"),
  rawText: text("raw_text"),
  parsedSkills: text("parsed_skills").array(),
  parsedTitles: text("parsed_titles").array(),
  experienceYears: integer("experience_years"),
  fileUrl: text("file_url"),
  isActive: boolean("is_active").default(false),
  // Standalone resume-quality score (0-100) + structured breakdown
  resumeScore: integer("resume_score"),
  scoreBreakdown: jsonb("score_breakdown"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const resumesRelations = relations(resumes, ({ one, many }) => ({
  user: one(users, { fields: [resumes.userId], references: [users.id] }),
  jobMatches: many(jobMatches),
}));

export const insertResumeSchema = createInsertSchema(resumes);

// ── Job Listings ───────────────────────────────────────────────────────────────
export const jobListings = pgTable("job_listings", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: text("title").notNull(),
  company: text("company").notNull(),
  location: text("location"),
  description: text("description"),
  sourceUrl: text("source_url").unique(),
  sourcePlatform: text("source_platform"),
  salaryMin: integer("salary_min"),
  salaryMax: integer("salary_max"),
  isRemote: boolean("is_remote").default(false),
  isGhost: boolean("is_ghost").default(false),
  // Repost / re-seen tracking (used by ghost + surge detection)
  contentHash: text("content_hash"),
  lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).defaultNow(),
  seenCount: integer("seen_count").default(1),
  repostCount: integer("repost_count").default(0),
  // Ghost Job Confidence Score (0-100)
  ghostScore: integer("ghost_score").default(0),
  // Scam detection
  scamScore: integer("scam_score").default(0),
  scamFlags: text("scam_flags").array(),
  // AI-estimated salary (when source hides it)
  estSalaryMin: integer("est_salary_min"),
  estSalaryMax: integer("est_salary_max"),
  salaryIsEstimated: boolean("salary_is_estimated").default(false),
  postedAt: timestamp("posted_at", { withTimezone: true }),
  fetchedAt: timestamp("fetched_at", { withTimezone: true }).defaultNow(),
});

export const jobListingsRelations = relations(jobListings, ({ many }) => ({
  jobMatches: many(jobMatches),
  applications: many(applications),
}));

export const insertJobListingSchema = createInsertSchema(jobListings);

// ── Job Matches ────────────────────────────────────────────────────────────────
export const jobMatches = pgTable(
  "job_matches",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),
    jobId: uuid("job_id").references(() => jobListings.id, { onDelete: "cascade" }),
    resumeId: uuid("resume_id").references(() => resumes.id),
    // Cheap deterministic skill-overlap score (stage 1) — set for every relevant job
    prefilterScore: integer("prefilter_score"),
    // Whether Gemini has deep-scored this match (stage 2)
    isAiScored: boolean("is_ai_scored").default(false),
    matchScore: integer("match_score"),
    matchedSkills: text("matched_skills").array(),
    missingSkills: text("missing_skills").array(),
    reasoning: text("reasoning"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (table) => ({
    // Required by onConflictDoUpdate target [userId, jobId] used in match upserts
    userJobUnique: unique("job_matches_user_job_unique").on(table.userId, table.jobId),
  })
);

export const jobMatchesRelations = relations(jobMatches, ({ one }) => ({
  user: one(users, { fields: [jobMatches.userId], references: [users.id] }),
  job: one(jobListings, { fields: [jobMatches.jobId], references: [jobListings.id] }),
  resume: one(resumes, { fields: [jobMatches.resumeId], references: [resumes.id] }),
}));

export const insertJobMatchSchema = createInsertSchema(jobMatches);

// ── Applications ───────────────────────────────────────────────────────────────
export const applications = pgTable("applications", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),
  // jobId is nullable: a manual entry describes a job that has no scraped jobListings row.
  jobId: uuid("job_id").references(() => jobListings.id),
  // Free-text fields for manually added applications (used when jobId is null).
  title: text("title"),
  company: text("company"),
  location: text("location"),
  url: text("url"),
  salary: text("salary"),
  status: text("status").default("saved"),
  notes: text("notes"),
  appliedAt: timestamp("applied_at", { withTimezone: true }),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  // archived = true means this belongs to a past job-search cycle (offer was accepted).
  archived: boolean("archived").default(false),
});

export const applicationsRelations = relations(applications, ({ one }) => ({
  user: one(users, { fields: [applications.userId], references: [users.id] }),
  job: one(jobListings, { fields: [applications.jobId], references: [jobListings.id] }),
}));

export const insertApplicationSchema = createInsertSchema(applications);

// ── Alerts ─────────────────────────────────────────────────────────────────────
export const alerts = pgTable("alerts", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),
  keywords: text("keywords").array(),
  location: text("location"),
  salaryMin: integer("salary_min"),
  remoteOnly: boolean("remote_only").default(false),
  frequency: text("frequency").default("daily"),
  isActive: boolean("is_active").default(true),
  // Last time a digest was sent for this alert (frequency throttling)
  lastSentAt: timestamp("last_sent_at", { withTimezone: true }),
});

export const alertsRelations = relations(alerts, ({ one }) => ({
  user: one(users, { fields: [alerts.userId], references: [users.id] }),
}));

export const insertAlertSchema = createInsertSchema(alerts);

// ── Email Configs ──────────────────────────────────────────────────────────────
export const emailConfigs = pgTable("email_configs", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).unique(),
  smtpHost: text("smtp_host"),
  smtpPort: integer("smtp_port").default(587),
  smtpUser: text("smtp_user"),
  smtpPass: text("smtp_pass"),
  fromEmail: text("from_email"),
  isVerified: boolean("is_verified").default(false),
});

export const emailConfigsRelations = relations(emailConfigs, ({ one }) => ({
  user: one(users, { fields: [emailConfigs.userId], references: [users.id] }),
}));

export const insertEmailConfigSchema = createInsertSchema(emailConfigs);

// ── Company Watchers ───────────────────────────────────────────────────────────
export const companyWatchers = pgTable("company_watchers", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),
  companyName: text("company_name"),
  jobCountLastWeek: integer("job_count_last_week").default(0),
  jobCountThisWeek: integer("job_count_this_week").default(0),
  isSurge: boolean("is_surge").default(false),
  lastChecked: timestamp("last_checked", { withTimezone: true }).defaultNow(),
});

export const companyWatchersRelations = relations(companyWatchers, ({ one }) => ({
  user: one(users, { fields: [companyWatchers.userId], references: [users.id] }),
}));

export const insertCompanyWatcherSchema = createInsertSchema(companyWatchers);

// ── User Employment (current job + freelance income) ──────────────────────────
export const userEmployment = pgTable("user_employment", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).unique(),
  company: text("company"),
  role: text("role"),
  employmentType: text("employment_type").default("full-time"), // full-time | part-time | contract
  compensation: text("compensation"), // free text: "18 LPA", "₹1.5L/mo", etc.
  startDate: text("start_date"),      // free text: "Jan 2024"
  hasFreelancing: boolean("has_freelancing").default(false),
  freelanceIncome: text("freelance_income"),
  freelanceType: text("freelance_type"), // e.g. "Web dev, design"
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const userEmploymentRelations = relations(userEmployment, ({ one }) => ({
  user: one(users, { fields: [userEmployment.userId], references: [users.id] }),
}));

// ── Company Stats (global hiring-surge tracking) ───────────────────────────────
export const companyStats = pgTable("company_stats", {
  id: uuid("id").primaryKey().defaultRandom(),
  companyName: text("company_name").unique().notNull(),
  jobCountThisWeek: integer("job_count_this_week").default(0),
  jobCountLastWeek: integer("job_count_last_week").default(0),
  isSurge: boolean("is_surge").default(false),
  surgeStartedAt: timestamp("surge_started_at", { withTimezone: true }),
  lastChecked: timestamp("last_checked", { withTimezone: true }).defaultNow(),
});

export const insertCompanyStatsSchema = createInsertSchema(companyStats);

// ── Notifications (in-app alert bell) ──────────────────────────────────────────
export const notifications = pgTable("notifications", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),
  type: text("type").default("job_match"),
  title: text("title").notNull(),
  body: text("body"),
  jobId: uuid("job_id"),
  isRead: boolean("is_read").default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, { fields: [notifications.userId], references: [users.id] }),
}));

export const insertNotificationSchema = createInsertSchema(notifications);
