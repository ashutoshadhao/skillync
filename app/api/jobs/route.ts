import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/drizzle";
import { jobListings, jobMatches, users } from "@/db/schema";
import { desc, eq, gte, ilike, and, or } from "drizzle-orm";

export async function GET(req: NextRequest) {
  const { userId: clerkId } = auth();
  if (!clerkId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const keyword = searchParams.get("keyword") || "";
  const location = searchParams.get("location") || "";
  const remote = searchParams.get("remote") === "true";
  const minScore = parseInt(searchParams.get("minScore") || "0");
  const page = parseInt(searchParams.get("page") || "1");
  const limit = 20;
  const offset = (page - 1) * limit;

  // Get the user
  const user = await db
    .select()
    .from(users)
    .where(eq(users.clerkId, clerkId))
    .limit(1);

  if (!user.length) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const userId = user[0].id;

  // Fetch job matches with job listings joined
  const matches = await db
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
    .where(
      and(
        eq(jobMatches.userId, userId),
        minScore > 0 ? gte(jobMatches.matchScore, minScore) : undefined,
        location ? ilike(jobListings.location, `%${location}%`) : undefined,
        remote ? eq(jobListings.isRemote, true) : undefined,
        keyword ? or(
          ilike(jobListings.title, `%${keyword}%`),
          ilike(jobListings.company, `%${keyword}%`)
        ) : undefined
      )
    )
    // AI-scored matches first (non-null matchScore), then by score, then prefilter rank
    .orderBy(desc(jobMatches.isAiScored), desc(jobMatches.matchScore), desc(jobMatches.prefilterScore))
    .limit(limit)
    .offset(offset);

  return NextResponse.json({ matches, page, limit });
}
