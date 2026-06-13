import { db } from "@/db/drizzle";
import { jobListings, jobMatches, resumes } from "@/db/schema";
import { and, eq, desc, isNull, inArray } from "drizzle-orm";
import { scoreJobMatch } from "@/lib/gemini";

// ── Stage 1: cheap deterministic skill-overlap (no AI) ──────────────────────────

function normalize(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9+#.]/g, " ").replace(/\s+/g, " ").trim();
}

/**
 * Score how well a resume's skills overlap with a job's title + description.
 * Returns a 0-100 prefilter score and the list of skills that appeared in the job.
 * Deterministic, instant, and free — used to rank ALL jobs before any AI call.
 */
export function computeSkillOverlap(
  resumeSkills: string[],
  job: { title: string | null; description: string | null }
): { prefilterScore: number; matchedSkills: string[] } {
  const skills = (resumeSkills || []).map(normalize).filter(Boolean);
  if (skills.length === 0) return { prefilterScore: 0, matchedSkills: [] };

  const haystack = normalize(`${job.title || ""} ${job.description || ""}`);
  if (!haystack) return { prefilterScore: 0, matchedSkills: [] };

  const matched: string[] = [];
  for (let i = 0; i < skills.length; i++) {
    const skill = skills[i];
    // Word-boundary-ish match so "java" doesn't match "javascript"
    const re = new RegExp(`(^|[^a-z0-9])${escapeRegExp(skill)}([^a-z0-9]|$)`);
    if (re.test(haystack)) matched.push(resumeSkills[i]);
  }

  const coverage = matched.length / skills.length; // 0..1
  // Title hits count double — a skill in the title is a strong signal
  const titleHay = normalize(job.title || "");
  const titleHits = matched.filter((m) =>
    new RegExp(`(^|[^a-z0-9])${escapeRegExp(normalize(m))}([^a-z0-9]|$)`).test(titleHay)
  ).length;
  const titleBonus = Math.min(titleHits * 0.1, 0.3); // up to +30%

  const prefilterScore = Math.min(100, Math.round((coverage + titleBonus) * 100));
  return { prefilterScore, matchedSkills: matched };
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// ── Helpers ─────────────────────────────────────────────────────────────────────

async function getActiveResume(userId: string) {
  const rows = await db
    .select()
    .from(resumes)
    .where(and(eq(resumes.userId, userId), eq(resumes.isActive, true)))
    .limit(1);
  return rows[0] || null;
}

/**
 * Stage 1 for a user: prefilter the given jobs (or all jobs) against the active
 * resume and upsert jobMatches rows with a prefilterScore. Does NOT call AI.
 * Returns the number of jobs that had a non-zero overlap.
 */
export async function prefilterJobsForUser(
  userId: string,
  jobIds?: string[]
): Promise<number> {
  const resume = await getActiveResume(userId);
  if (!resume) return 0;
  const skills = resume.parsedSkills || [];
  if (skills.length === 0) return 0;

  const jobs = jobIds && jobIds.length
    ? await db.select().from(jobListings).where(inArray(jobListings.id, jobIds))
    : await db.select().from(jobListings);

  let relevant = 0;
  for (const job of jobs) {
    const { prefilterScore, matchedSkills } = computeSkillOverlap(skills, job);
    if (prefilterScore <= 0) continue; // skip irrelevant jobs entirely
    relevant++;

    await db
      .insert(jobMatches)
      .values({
        userId,
        jobId: job.id,
        resumeId: resume.id,
        prefilterScore,
        matchedSkills,
        isAiScored: false,
      })
      .onConflictDoUpdate({
        target: [jobMatches.userId, jobMatches.jobId],
        set: {
          prefilterScore,
          matchedSkills,
          resumeId: resume.id,
        },
      });
  }
  return relevant;
}

/**
 * Stage 2 for a user: take the top `limit` not-yet-AI-scored matches by
 * prefilterScore and deep-score them with Gemini. Errors on individual jobs are
 * swallowed so one bad job doesn't abort the batch.
 * Returns the number of jobs successfully AI-scored.
 */
export async function aiScoreTopMatches(userId: string, limit = 20): Promise<number> {
  const resume = await getActiveResume(userId);
  if (!resume) return 0;
  const skills = resume.parsedSkills || [];

  const candidates = await db
    .select({
      matchId: jobMatches.id,
      jobId: jobMatches.jobId,
      title: jobListings.title,
      company: jobListings.company,
      description: jobListings.description,
    })
    .from(jobMatches)
    .innerJoin(jobListings, eq(jobMatches.jobId, jobListings.id))
    .where(and(eq(jobMatches.userId, userId), isNull(jobMatches.matchScore)))
    .orderBy(desc(jobMatches.prefilterScore))
    .limit(limit);

  let scored = 0;
  for (const c of candidates) {
    try {
      const jobDesc = c.description || `${c.title} at ${c.company}`;
      const result = await scoreJobMatch(skills, jobDesc);
      await db
        .update(jobMatches)
        .set({
          matchScore: result.matchScore,
          matchedSkills: result.matchedSkills,
          missingSkills: result.missingSkills,
          reasoning: result.reasoning,
          isAiScored: true,
        })
        .where(eq(jobMatches.id, c.matchId));
      scored++;
    } catch (err) {
      console.error(`AI scoring failed for job ${c.jobId}:`, err);
    }
  }
  return scored;
}

/** Convenience: run both stages for a user. */
export async function runMatchingForUser(
  userId: string,
  opts: { jobIds?: string[]; aiLimit?: number } = {}
): Promise<{ prefiltered: number; aiScored: number }> {
  const prefiltered = await prefilterJobsForUser(userId, opts.jobIds);
  const aiScored = await aiScoreTopMatches(userId, opts.aiLimit ?? 20);
  return { prefiltered, aiScored };
}
