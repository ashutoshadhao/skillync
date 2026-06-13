import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/drizzle";
import { applications, users, userEmployment } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function POST(req: NextRequest) {
  const { userId: clerkId } = auth();
  if (!clerkId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await db.select().from(users).where(eq(users.clerkId, clerkId)).limit(1);
  if (!user.length) return NextResponse.json({ error: "User not found" }, { status: 404 });
  const userId = user[0].id;

  const { appId, updateEmployment } = await req.json();
  // appId: the accepted offer application id
  // updateEmployment: boolean — whether to sync the job details to the Employment profile

  // 1. Archive every active application for this user.
  await db
    .update(applications)
    .set({ archived: true, updatedAt: new Date() })
    .where(eq(applications.userId, userId));

  // 2. Optionally update the Employment profile with the accepted offer's details.
  if (updateEmployment && appId) {
    const accepted = await db
      .select()
      .from(applications)
      .where(eq(applications.id, appId))
      .limit(1);

    if (accepted.length) {
      const a = accepted[0];
      const existing = await db
        .select()
        .from(userEmployment)
        .where(eq(userEmployment.userId, userId))
        .limit(1);
      const cur = existing[0];

      const merged = {
        company:        a.company        ?? cur?.company        ?? null,
        role:           a.title          ?? cur?.role           ?? null,
        compensation:   a.salary         ?? cur?.compensation   ?? null,
        employmentType: cur?.employmentType ?? "full-time",
        startDate:      cur?.startDate   ?? null,
        hasFreelancing: cur?.hasFreelancing ?? false,
        freelanceIncome: cur?.freelanceIncome ?? null,
        freelanceType:   cur?.freelanceType   ?? null,
        updatedAt: new Date(),
      };

      await db
        .insert(userEmployment)
        .values({ userId, ...merged })
        .onConflictDoUpdate({ target: userEmployment.userId, set: merged });
    }
  }

  return NextResponse.json({ success: true });
}
