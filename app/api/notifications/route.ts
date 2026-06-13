import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/drizzle";
import { notifications, users } from "@/db/schema";
import { and, desc, eq } from "drizzle-orm";

async function resolveUserId(clerkId: string) {
  const user = await db.select().from(users).where(eq(users.clerkId, clerkId)).limit(1);
  return user[0]?.id ?? null;
}

// GET — latest notifications + unread count for the bell.
export async function GET() {
  const { userId: clerkId } = auth();
  if (!clerkId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = await resolveUserId(clerkId);
  if (!userId) return NextResponse.json({ notifications: [], unread: 0 });

  const items = await db
    .select()
    .from(notifications)
    .where(eq(notifications.userId, userId))
    .orderBy(desc(notifications.createdAt))
    .limit(30);

  const unread = items.filter((n) => !n.isRead).length;
  return NextResponse.json({ notifications: items, unread });
}

// PATCH — mark one (by id) or all (markAll: true) as read.
export async function PATCH(req: NextRequest) {
  const { userId: clerkId } = auth();
  if (!clerkId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = await resolveUserId(clerkId);
  if (!userId) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const { id, markAll } = await req.json();

  if (markAll) {
    await db.update(notifications).set({ isRead: true }).where(eq(notifications.userId, userId));
  } else if (id) {
    await db
      .update(notifications)
      .set({ isRead: true })
      .where(and(eq(notifications.id, id), eq(notifications.userId, userId)));
  }

  return NextResponse.json({ success: true });
}
