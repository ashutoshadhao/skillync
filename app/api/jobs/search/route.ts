import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/drizzle";
import { jobListings, jobMatches, resumes, users } from "@/db/schema";
import { and, desc, eq, ilike, inArray, or } from "drizzle-orm";
import { fetchAndSaveJobs } from "@/lib/scraper";
import { computeSkillOverlap } from "@/lib/matching";

// Live-scrape can take a few seconds across the three sources.
export const maxDuration = 60;

// On-demand "search jobs by skill": scrape the sources live for a keyword,
// surface every matching listing for this user (ranked by resume overlap when a
// resume exists), and return them in the same shape as GET /api/jobs.
export async function POST(req: NextRequest) {
  const { userId: clerkId } = auth();
  if (!clerkId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const keyword = (body.keyword ?? "").toString().trim();
  const location = ((body.location ?? "India").toString().trim()) || "India";
  if (!keyword) {
    return NextResponse.json({ error: "A skill or keyword is required" }, { status: 400 });
  }

  const user = await db.select().from(users).where(eq(users.clerkId, clerkId)).limit(1);
  if (!user.length) return NextResponse.json({ error: "User not found" }, { status: 404 });
  const userId = user[0].id;

  // Active resume powers the skill-overlap score — optional (search still works without one).
  const activeResume =
    (await db
      .select()
      .from(resumes)
      .where(and(eq(resumes.userId, userId), eq(resumes.isActive, true)))
      .limit(1))[0] || null;
  const skills = activeResume?.parsedSkills || [];

  // 1. Fetch jobs live for this keyword (Adzuna API + Naukri/Internshala scrapers).
  let saved = 0;
  let sources: { name: string; ok: boolean; count: number; error?: string }[] = [];
  try {
    const r = await fetchAndSaveJobs(keyword, location);
    saved = r.saved;
    sources = r.sources;
  } catch (err) {
    console.error("Live fetch failed during skill search:", err);
    // Fall through — listings from earlier fetches may still match.
  }

  // 2. Find listings relevant to the keyword (title OR description), newest first.
  const kw = `%${keyword}%`;
  const jobs = await db
    .select()
    .from(jobListings)
    .where(or(ilike(jobListings.title, kw), ilike(jobListings.description, kw)))
    .orderBy(desc(jobListings.postedAt))
    .limit(40);

  // 3. Upsert a jobMatches row per listing so it surfaces on the dashboard.
  //    The user explicitly searched these, so keep them even at score 0.
  //    Only prefilter fields are touched — any existing AI score is preserved.
  for (const job of jobs) {
    const { prefilterScore, matchedSkills } = computeSkillOverlap(skills, job);
    await db
      .insert(jobMatches)
      .values({
        userId,
        jobId: job.id,
        resumeId: activeResume?.id ?? null,
        prefilterScore,
        matchedSkills,
        isAiScored: false,
      })
      .onConflictDoUpdate({
        target: [jobMatches.userId, jobMatches.jobId],
        set: { prefilterScore, matchedSkills, resumeId: activeResume?.id ?? null },
      });
  }

  // 4. Return the matches (same shape as GET /api/jobs), ranked.
  const jobIds = jobs.map((j) => j.id);
  const matches = jobIds.length
    ? await db
        .select({
          matchId: jobMatches.id,
          matchScore: jobMatches.matchScore,
          prefilterScore: jobMatches.prefilterScore,
          isAiScored: jobMatches.isAiScored,
          matchedSkills: jobMatches.matchedSkills,
          missingSkills: jobMatches.missingSkills,
          reasoning: jobMatches.reasoning,
          createdAt: jobMatches.createdAt,
          jobId: jobListings.id,
          title: jobListings.title,
          company: jobListings.company,
          location: jobListings.location,
          description: jobListings.description,
          sourceUrl: jobListings.sourceUrl,
          sourcePlatform: jobListings.sourcePlatform,
          salaryMin: jobListings.salaryMin,
          salaryMax: jobListings.salaryMax,
          estSalaryMin: jobListings.estSalaryMin,
          estSalaryMax: jobListings.estSalaryMax,
          salaryIsEstimated: jobListings.salaryIsEstimated,
          isRemote: jobListings.isRemote,
          isGhost: jobListings.isGhost,
          ghostScore: jobListings.ghostScore,
          scamScore: jobListings.scamScore,
          scamFlags: jobListings.scamFlags,
          postedAt: jobListings.postedAt,
        })
        .from(jobMatches)
        .innerJoin(jobListings, eq(jobMatches.jobId, jobListings.id))
        .where(and(eq(jobMatches.userId, userId), inArray(jobListings.id, jobIds)))
        .orderBy(
          desc(jobMatches.isAiScored),
          desc(jobMatches.matchScore),
          desc(jobMatches.prefilterScore)
        )
    : [];

  return NextResponse.json({ keyword, location, saved, sources, found: matches.length, matches });
}
