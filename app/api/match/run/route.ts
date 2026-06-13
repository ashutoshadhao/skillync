import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { db } from "@/db/drizzle";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { runMatchingForUser } from "@/lib/matching";

// Allow up to 60s for the Gemini deep-scoring batch (Vercel Pro; hobby caps at 10s).
export const maxDuration = 60;

// Run the two-stage matching pipeline for the current user against ALL jobs.
// Stage 1 (free skill overlap) ranks everything; stage 2 (Gemini) deep-scores the top matches.
export async function POST() {
  const { userId: clerkId } = auth();
  if (!clerkId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await db.select().from(users).where(eq(users.clerkId, clerkId)).limit(1);
  if (!user.length) return NextResponse.json({ error: "User not found" }, { status: 404 });

  try {
    const result = await runMatchingForUser(user[0].id);
    return NextResponse.json({ success: true, ...result });
  } catch (err) {
    console.error("Matching run failed:", err);
    return NextResponse.json({ error: "Matching failed" }, { status: 500 });
  }
}
