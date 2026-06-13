import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/drizzle";
import { jobMatches, jobListings, resumes, users } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { scoreJobMatch } from "@/lib/gemini";

export async function POST(req: NextRequest) {
  const { userId: clerkId } = auth();
  if (!clerkId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { jobId } = await req.json();
  if (!jobId) return NextResponse.json({ error: "jobId is required" }, { status: 400 });

  // Get user
  const user = await db.select().from(users).where(eq(users.clerkId, clerkId)).limit(1);
  if (!user.length) return NextResponse.json({ error: "User not found" }, { status: 404 });
  const userId = user[0].id;

  // Get active resume
  const activeResume = await db
    .select()
    .from(resumes)
    .where(and(eq(resumes.userId, userId), eq(resumes.isActive, true)))
    .limit(1);

  if (!activeResume.length) {
    return NextResponse.json({ error: "No active resume found. Please upload a resume first." }, { status: 400 });
  }

  const resume = activeResume[0];
  const skills = resume.parsedSkills || [];

  // Get job listing
  const job = await db.select().from(jobListings).where(eq(jobListings.id, jobId)).limit(1);
  if (!job.length) return NextResponse.json({ error: "Job not found" }, { status: 404 });

  const jobDesc = job[0].description || `${job[0].title} at ${job[0].company}`;

  // Score with Gemini
  const result = await scoreJobMatch(skills, jobDesc);

  // Upsert match
  await db
    .insert(jobMatches)
    .values({
      userId,
      jobId,
      resumeId: resume.id,
      matchScore: result.matchScore,
      matchedSkills: result.matchedSkills,
      missingSkills: result.missingSkills,
      reasoning: result.reasoning,
      isAiScored: true,
    })
    .onConflictDoUpdate({
      target: [jobMatches.userId, jobMatches.jobId],
      set: {
        matchScore: result.matchScore,
        matchedSkills: result.matchedSkills,
        missingSkills: result.missingSkills,
        reasoning: result.reasoning,
        resumeId: resume.id,
        isAiScored: true,
      },
    });

  return NextResponse.json(result);
}
