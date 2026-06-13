import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/drizzle";
import { alerts, users } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export async function GET(req: NextRequest) {
  const { userId: clerkId } = auth();
  if (!clerkId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await db.select().from(users).where(eq(users.clerkId, clerkId)).limit(1);
  if (!user.length) return NextResponse.json({ alerts: [] });

  const userAlerts = await db
    .select()
    .from(alerts)
    .where(eq(alerts.userId, user[0].id));

  return NextResponse.json({ alerts: userAlerts });
}

export async function POST(req: NextRequest) {
  const { userId: clerkId } = auth();
  if (!clerkId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { keywords, location, salaryMin, remoteOnly, frequency } = body;

  const user = await db.select().from(users).where(eq(users.clerkId, clerkId)).limit(1);
  if (!user.length) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const [alert] = await db
    .insert(alerts)
    .values({
      userId: user[0].id,
      keywords: keywords || [],
      location,
      salaryMin,
      remoteOnly: remoteOnly || false,
      frequency: frequency || "daily",
      isActive: true,
    })
    .returning();

  return NextResponse.json(alert);
}

export async function DELETE(req: NextRequest) {
  const { userId: clerkId } = auth();
  if (!clerkId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Alert ID required" }, { status: 400 });

  const user = await db.select().from(users).where(eq(users.clerkId, clerkId)).limit(1);
  if (!user.length) return NextResponse.json({ error: "User not found" }, { status: 404 });

  await db
    .delete(alerts)
    .where(and(eq(alerts.id, id), eq(alerts.userId, user[0].id)));

  return NextResponse.json({ success: true });
}
