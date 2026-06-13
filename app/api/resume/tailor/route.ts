import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/drizzle";
import { resumes, users, jobListings } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { tailorResume, generateCoverLetter } from "@/lib/gemini";

export async function POST(req: NextRequest) {
  const { userId: clerkId } = auth();
  if (!clerkId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { jobId, type = "tailor" } = await req.json();

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
    return NextResponse.json({ error: "No active resume found." }, { status: 400 });
  }

  const resume = activeResume[0];

  // Get job
  const job = await db.select().from(jobListings).where(eq(jobListings.id, jobId)).limit(1);
  if (!job.length) return NextResponse.json({ error: "Job not found" }, { status: 404 });

  if (type === "tailor") {
    const result = await tailorResume(
      resume.rawText || "",
      job[0].description || `${job[0].title} at ${job[0].company}`
    );
    return NextResponse.json(result);
  }

  if (type === "cover_letter") {
    const text = await generateCoverLetter(
      user[0].name || "Candidate",
      resume.parsedSkills || [],
      job[0].title,
      job[0].company,
      job[0].description || `${job[0].title} at ${job[0].company}`
    );
    return NextResponse.json({ coverLetter: text });
  }

  return NextResponse.json({ error: "Invalid type" }, { status: 400 });
}
