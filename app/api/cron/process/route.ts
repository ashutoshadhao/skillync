import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/drizzle";
import {
  jobListings,
  jobMatches,
  users,
  resumes,
  alerts,
  emailConfigs,
  notifications,
} from "@/db/schema";
import { and, eq, gte, isNull, or, ilike, desc } from "drizzle-orm";
import { computeGhostScore } from "@/lib/ghost";
import { detectScamRules } from "@/lib/scam";
import { recomputeCompanyStats } from "@/lib/surge";
import { estimateSalary, confirmScam } from "@/lib/gemini";
import { prefilterJobsForUser, aiScoreTopMatches } from "@/lib/matching";
import { sendDailyDigest, type EmailConfig } from "@/lib/mailer";

// This cron does the heavy post-scrape work. Allow a longer budget for AI batches.
export const maxDuration = 60;

// Per-run caps to protect the Gemini free-tier quota.
const SALARY_ESTIMATE_CAP = 12;
const SCAM_AI_CAP = 8;
const AI_SCORE_PER_USER = 10;
const DAY_MS = 24 * 60 * 60 * 1000;

const FREQUENCY_MS: Record<string, number> = {
  instant: 0,
  daily: DAY_MS,
  weekly: 7 * DAY_MS,
};

export async function GET(req: NextRequest) {
  if (req.headers.get("x-cron-secret") !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = Date.now();
  const report = {
    companiesUpdated: 0,
    ghostRescored: 0,
    scamScanned: 0,
    salaryEstimated: 0,
    usersMatched: 0,
    alertsSent: 0,
  };

  // ── 1. Surge detection ────────────────────────────────────────────────────────
  try {
    report.companiesUpdated = await recomputeCompanyStats(now);
  } catch (err) {
    console.error("Surge recompute failed:", err);
  }

  // ── 2. Ghost re-score (rule-based, cheap) ──────────────────────────────────────
  try {
    const all = await db.select().from(jobListings);
    for (const job of all) {
      const ghostScore = computeGhostScore(job, now);
      if (ghostScore !== (job.ghostScore ?? 0)) {
        await db
          .update(jobListings)
          .set({ ghostScore, isGhost: ghostScore >= 70 })
          .where(eq(jobListings.id, job.id));
        report.ghostRescored++;
      }
    }
  } catch (err) {
    console.error("Ghost rescore failed:", err);
  }

  // ── 3. Scam detection (rule-first; AI only for borderline, capped) ──────────────
  try {
    const unscanned = await db
      .select()
      .from(jobListings)
      .where(isNull(jobListings.scamFlags));
    let aiUsed = 0;
    for (const job of unscanned) {
      const rule = detectScamRules(job.description, job.title);
      let { scamScore, scamFlags } = rule;
      if (rule.needsAiConfirm && aiUsed < SCAM_AI_CAP) {
        aiUsed++;
        try {
          const ai = await confirmScam(job.title, job.company, job.description || "");
          scamScore = Math.max(scamScore, ai.scamScore ?? scamScore);
          scamFlags = Array.from(new Set([...scamFlags, ...(ai.scamFlags ?? [])]));
        } catch (err) {
          console.error(`Scam AI confirm failed for ${job.id}:`, err);
        }
      }
      await db
        .update(jobListings)
        .set({ scamScore, scamFlags: scamFlags.length ? scamFlags : [] })
        .where(eq(jobListings.id, job.id));
      report.scamScanned++;
    }
  } catch (err) {
    console.error("Scam scan failed:", err);
  }

  // ── 4. Hidden salary estimation (AI, only when salary missing, capped) ──────────
  try {
    const missing = await db
      .select()
      .from(jobListings)
      .where(
        and(
          isNull(jobListings.salaryMin),
          isNull(jobListings.salaryMax),
          eq(jobListings.salaryIsEstimated, false)
        )
      )
      .limit(SALARY_ESTIMATE_CAP);
    for (const job of missing) {
      try {
        const est = await estimateSalary(
          job.title,
          job.company,
          job.location || "India",
          job.description || "",
          job.isRemote ?? false
        );
        await db
          .update(jobListings)
          .set({
            estSalaryMin: est.estSalaryMin,
            estSalaryMax: est.estSalaryMax,
            salaryIsEstimated: true,
          })
          .where(eq(jobListings.id, job.id));
        report.salaryEstimated++;
      } catch (err) {
        console.error(`Salary estimate failed for ${job.id}:`, err);
      }
    }
  } catch (err) {
    console.error("Salary estimation step failed:", err);
  }

  // ── 5. Per-user matching (prefilter all, AI-score a few new ones) ───────────────
  let activeUsers: { userId: string | null }[] = [];
  try {
    activeUsers = await db
      .select({ userId: resumes.userId })
      .from(resumes)
      .where(eq(resumes.isActive, true));
    for (const u of activeUsers) {
      if (!u.userId) continue;
      try {
        await prefilterJobsForUser(u.userId);
        await aiScoreTopMatches(u.userId, AI_SCORE_PER_USER);
        report.usersMatched++;
      } catch (err) {
        console.error(`Matching failed for user ${u.userId}:`, err);
      }
    }
  } catch (err) {
    console.error("Per-user matching step failed:", err);
  }

  // ── 6. Alert digests + in-app notifications ─────────────────────────────────────
  try {
    report.alertsSent = await processAlerts(now);
  } catch (err) {
    console.error("Alert processing failed:", err);
  }

  return NextResponse.json({ success: true, ...report, timestamp: new Date(now).toISOString() });
}

// Map a DB emailConfigs row to the mailer's snake_case EmailConfig.
function toMailerConfig(c: typeof emailConfigs.$inferSelect): EmailConfig | null {
  if (!c.smtpHost || !c.smtpUser || !c.smtpPass || !c.fromEmail) return null;
  return {
    smtp_host: c.smtpHost,
    smtp_port: c.smtpPort ?? 587,
    smtp_user: c.smtpUser,
    smtp_pass: c.smtpPass,
    from_email: c.fromEmail,
  };
}

async function processAlerts(now: number): Promise<number> {
  let sent = 0;
  const activeAlerts = await db.select().from(alerts).where(eq(alerts.isActive, true));

  for (const alert of activeAlerts) {
    if (!alert.userId) continue;

    // Frequency throttle.
    const minGap = FREQUENCY_MS[alert.frequency || "daily"] ?? DAY_MS;
    if (alert.lastSentAt && now - alert.lastSentAt.getTime() < minGap) continue;

    // Only consider jobs first seen since the last digest (or last 7 days on first run).
    const since = alert.lastSentAt ?? new Date(now - 7 * DAY_MS);

    const keywordConds = (alert.keywords || [])
      .filter(Boolean)
      .flatMap((k) => [
        ilike(jobListings.title, `%${k}%`),
        ilike(jobListings.description, `%${k}%`),
      ]);

    // Pull new matching jobs joined with this user's match scores.
    const rows = await db
      .select({
        jobId: jobListings.id,
        title: jobListings.title,
        company: jobListings.company,
        location: jobListings.location,
        salaryMin: jobListings.salaryMin,
        salaryMax: jobListings.salaryMax,
        matchScore: jobMatches.matchScore,
        prefilterScore: jobMatches.prefilterScore,
      })
      .from(jobListings)
      .leftJoin(
        jobMatches,
        and(eq(jobMatches.jobId, jobListings.id), eq(jobMatches.userId, alert.userId))
      )
      .where(
        and(
          gte(jobListings.fetchedAt, since),
          keywordConds.length ? or(...keywordConds) : undefined,
          alert.location ? ilike(jobListings.location, `%${alert.location}%`) : undefined,
          alert.remoteOnly ? eq(jobListings.isRemote, true) : undefined,
          alert.salaryMin ? gte(jobListings.salaryMax, alert.salaryMin) : undefined
        )
      )
      .orderBy(desc(jobMatches.matchScore), desc(jobMatches.prefilterScore))
      .limit(10);

    if (rows.length === 0) {
      // Nothing new — advance the throttle clock so we don't re-query the same window.
      await db.update(alerts).set({ lastSentAt: new Date(now) }).where(eq(alerts.id, alert.id));
      continue;
    }

    // Look up the user + their email config.
    const user = (await db.select().from(users).where(eq(users.id, alert.userId)).limit(1))[0];
    const cfgRow = (
      await db.select().from(emailConfigs).where(eq(emailConfigs.userId, alert.userId)).limit(1)
    )[0];

    const mailerCfg = cfgRow ? toMailerConfig(cfgRow) : null;
    if (user?.email && mailerCfg) {
      try {
        await sendDailyDigest(
          mailerCfg,
          user.email,
          rows.map((r) => ({
            title: r.title,
            company: r.company,
            matchScore: r.matchScore ?? r.prefilterScore ?? 0,
            location: r.location || "",
            salaryMin: r.salaryMin ?? undefined,
            salaryMax: r.salaryMax ?? undefined,
            jobId: r.jobId,
          }))
        );
        sent++;
      } catch (err) {
        console.error(`Digest email failed for user ${alert.userId}:`, err);
      }
    }

    // In-app notification regardless of email delivery.
    await db.insert(notifications).values({
      userId: alert.userId,
      type: "alert_digest",
      title: `${rows.length} new job${rows.length > 1 ? "s" : ""} match your alert`,
      body: rows
        .slice(0, 3)
        .map((r) => `${r.title} · ${r.company}`)
        .join("  •  "),
      jobId: rows[0].jobId,
    });

    await db.update(alerts).set({ lastSentAt: new Date(now) }).where(eq(alerts.id, alert.id));
  }
  return sent;
}
