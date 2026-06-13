import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/drizzle";
import { jobMatches, resumes, users } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { prefilterJobsForUser } from "@/lib/matching";

export async function GET(req: NextRequest) {
  const { userId: clerkId } = auth();
  if (!clerkId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await db.select().from(users).where(eq(users.clerkId, clerkId)).limit(1);
  if (!user.length) return NextResponse.json({ resumes: [] });

  const userResumes = await db
    .select()
    .from(resumes)
    .where(eq(resumes.userId, user[0].id));

  return NextResponse.json({ resumes: userResumes });
}

export async function PATCH(req: NextRequest) {
  const { userId: clerkId } = auth();
  if (!clerkId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, isActive } = await req.json();

  const user = await db.select().from(users).where(eq(users.clerkId, clerkId)).limit(1);
  if (!user.length) return NextResponse.json({ error: "User not found" }, { status: 404 });

  if (isActive) {
    // Deactivate all first
    await db.update(resumes).set({ isActive: false }).where(eq(resumes.userId, user[0].id));
  }

  // Set the selected one
  const [updated] = await db
    .update(resumes)
    .set({ isActive })
    .where(and(eq(resumes.id, id), eq(resumes.userId, user[0].id)))
    .returning();

  // Re-match against the newly activated resume: clear prior AI scores so they
  // get recomputed for the new skill set, then re-run the two-stage pipeline.
  if (isActive) {
    try {
      await db
        .update(jobMatches)
        .set({ matchScore: null, isAiScored: false, missingSkills: null, reasoning: null })
        .where(eq(jobMatches.userId, user[0].id));
      await prefilterJobsForUser(user[0].id);
    } catch (err) {
      console.error("Re-matching after resume activation failed:", err);
    }
  }

  return NextResponse.json(updated);
}

export async function DELETE(req: NextRequest) {
  const { userId: clerkId } = auth();
  if (!clerkId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Resume ID required" }, { status: 400 });

  const user = await db.select().from(users).where(eq(users.clerkId, clerkId)).limit(1);
  if (!user.length) return NextResponse.json({ error: "User not found" }, { status: 404 });

  await db
    .delete(resumes)
    .where(and(eq(resumes.id, id), eq(resumes.userId, user[0].id)));

  return NextResponse.json({ success: true });
}
