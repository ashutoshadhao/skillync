import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/drizzle";
import { resumes, users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { parseResume, scoreResume } from "@/lib/gemini";
import { prefilterJobsForUser } from "@/lib/matching";
import { supabaseAdmin } from "@/lib/supabase";
import type { ResumeScoreResult } from "@/types";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";

async function extractTextFromPDF(buffer: ArrayBuffer): Promise<string> {
  try {
    const pdf = await getDocument({ data: buffer }).promise;
    const texts: string[] = [];
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      const pageText = content.items
        .map((item: unknown) => (item as { str: string }).str)
        .join(" ");
      texts.push(pageText);
    }
    return texts.join("\n");
  } catch {
    return "Unable to extract PDF text";
  }
}

export async function POST(req: NextRequest) {
  const { userId: clerkId } = auth();
  if (!clerkId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const label = (formData.get("label") as string) || "My Resume";

  if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });
  if (file.type !== "application/pdf") {
    return NextResponse.json({ error: "Only PDF files are supported" }, { status: 400 });
  }
  if (file.size > 5 * 1024 * 1024) {
    return NextResponse.json({ error: "File size must be under 5MB" }, { status: 400 });
  }

  // Get user
  const user = await db.select().from(users).where(eq(users.clerkId, clerkId)).limit(1);
  if (!user.length) return NextResponse.json({ error: "User not found" }, { status: 404 });
  const userId = user[0].id;

  // Count existing resumes (for isActive logic) and enforce a flat 5-resume cap
  const existingResumes = await db
    .select({ id: resumes.id })
    .from(resumes)
    .where(eq(resumes.userId, userId));

  if (existingResumes.length >= 5) {
    return NextResponse.json({ error: "Maximum 5 resumes allowed. Delete one to add another." }, { status: 403 });
  }

  const buffer = await file.arrayBuffer();
  const rawText = await extractTextFromPDF(buffer);

  // Upload to Supabase Storage (skipped gracefully if keys are not configured)
  let fileUrl: string | null = null;
  if (supabaseAdmin) {
    const fileName = `${userId}/${Date.now()}-${file.name}`;
    const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
      .from("resumes")
      .upload(fileName, buffer, { contentType: "application/pdf" });

    if (!uploadError && uploadData) {
      const { data: { publicUrl } } = supabaseAdmin.storage
        .from("resumes")
        .getPublicUrl(fileName);
      fileUrl = publicUrl;
    }
  }

  // Parse with Gemini
  let parsed = { skills: [], jobTitles: [], experienceYears: 0, education: "", summary: "" };
  try {
    parsed = await parseResume(rawText);
  } catch (err) {
    console.error("Gemini parsing failed:", err);
  }

  // Score resume quality with Gemini (non-fatal if it fails)
  let resumeScore: number | null = null;
  let scoreBreakdown: Record<string, unknown> | null = null;
  try {
    const s: ResumeScoreResult = await scoreResume(rawText);
    resumeScore = s.overallScore;
    scoreBreakdown = {
      ats: s.atsScore,
      completeness: s.completenessScore,
      clarity: s.clarityScore,
      keywords: s.keywordScore,
      strengths: s.strengths,
      improvements: s.improvements,
      missingSections: s.missingSections,
    };
  } catch (err) {
    console.error("Resume scoring failed:", err);
  }

  // Deactivate other resumes if this is the first
  if (existingResumes.length === 0) {
    await db.update(resumes)
      .set({ isActive: false })
      .where(eq(resumes.userId, userId));
  }

  // Insert resume
  const [newResume] = await db.insert(resumes).values({
    userId,
    label,
    rawText,
    parsedSkills: parsed.skills,
    parsedTitles: parsed.jobTitles,
    experienceYears: parsed.experienceYears,
    resumeScore,
    scoreBreakdown,
    fileUrl,
    isActive: existingResumes.length === 0,
  }).returning();

  // If this is the active resume, run the fast (free, no-AI) prefilter inline so
  // the dashboard shows skill-ranked jobs immediately. The slower Gemini deep-scoring
  // of top matches is triggered by the client via POST /api/match/run.
  if (newResume.isActive) {
    try {
      await prefilterJobsForUser(userId);
    } catch (err) {
      console.error("Initial prefilter after upload failed:", err);
    }
  }

  return NextResponse.json({ resume: newResume, parsed });
}
