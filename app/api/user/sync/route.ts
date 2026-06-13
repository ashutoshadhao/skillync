import { auth, currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { db } from "@/db/drizzle";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

/**
 * Called client-side on every auth load.
 * Upserts the user row so we never rely on webhooks.
 */
export async function POST() {
  const { userId: clerkId } = auth();
  if (!clerkId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const clerkUser = await currentUser();
  const name =
    [clerkUser?.firstName, clerkUser?.lastName].filter(Boolean).join(" ") || null;
  const email = clerkUser?.emailAddresses?.[0]?.emailAddress || null;

  const existing = await db
    .select()
    .from(users)
    .where(eq(users.clerkId, clerkId))
    .limit(1);

  if (existing.length === 0) {
    const [row] = await db
      .insert(users)
      .values({ clerkId, name, email })
      .returning();
    return NextResponse.json(row);
  }

  // Update name/email in case they changed in Clerk
  const [row] = await db
    .update(users)
    .set({ name, email })
    .where(eq(users.clerkId, clerkId))
    .returning();

  return NextResponse.json(row);
}

export async function GET() {
  const { userId: clerkId } = auth();
  if (!clerkId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [row] = await db
    .select()
    .from(users)
    .where(eq(users.clerkId, clerkId))
    .limit(1);

  return NextResponse.json(row ?? null);
}
