import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/drizzle";
import { users, userEmployment } from "@/db/schema";
import { eq } from "drizzle-orm";

async function resolveUser() {
  const { userId: clerkId } = auth();
  if (!clerkId) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  const user = await db.select().from(users).where(eq(users.clerkId, clerkId)).limit(1);
  if (!user.length) return { error: NextResponse.json({ error: "User not found" }, { status: 404 }) };
  return { userId: user[0].id };
}

export async function GET() {
  const { userId, error } = await resolveUser();
  if (error) return error;

  const rows = await db
    .select()
    .from(userEmployment)
    .where(eq(userEmployment.userId, userId))
    .limit(1);

  return NextResponse.json(rows[0] ?? null);
}

// Full upsert — used by EmploymentTab and accept-offer flow.
export async function POST(req: NextRequest) {
  const { userId, error } = await resolveUser();
  if (error) return error;

  const {
    company, role, employmentType, compensation, startDate,
    hasFreelancing, freelanceIncome, freelanceType,
  } = await req.json();

  const [row] = await db
    .insert(userEmployment)
    .values({
      userId, company, role, employmentType, compensation, startDate,
      hasFreelancing: hasFreelancing ?? false,
      freelanceIncome: hasFreelancing ? freelanceIncome : null,
      freelanceType: hasFreelancing ? freelanceType : null,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: userEmployment.userId,
      set: {
        company, role, employmentType, compensation, startDate,
        hasFreelancing: hasFreelancing ?? false,
        freelanceIncome: hasFreelancing ? freelanceIncome : null,
        freelanceType: hasFreelancing ? freelanceType : null,
        updatedAt: new Date(),
      },
    })
    .returning();

  return NextResponse.json(row);
}

// Partial update — each settings tab only sends its own fields.
export async function PATCH(req: NextRequest) {
  const { userId, error } = await resolveUser();
  if (error) return error;

  const body = await req.json();

  // Fetch existing row so we can merge without clobbering the other tab's fields.
  const existing = await db
    .select()
    .from(userEmployment)
    .where(eq(userEmployment.userId, userId))
    .limit(1);
  const cur = existing[0];

  const merged = {
    company:        body.company        ?? cur?.company        ?? null,
    role:           body.role           ?? cur?.role           ?? null,
    employmentType: body.employmentType ?? cur?.employmentType ?? "full-time",
    compensation:   body.compensation   ?? cur?.compensation   ?? null,
    startDate:      body.startDate      ?? cur?.startDate      ?? null,
    hasFreelancing: body.hasFreelancing !== undefined ? body.hasFreelancing : (cur?.hasFreelancing ?? false),
    freelanceIncome: body.hasFreelancing === false ? null : (body.freelanceIncome ?? cur?.freelanceIncome ?? null),
    freelanceType:   body.hasFreelancing === false ? null : (body.freelanceType   ?? cur?.freelanceType   ?? null),
    updatedAt: new Date(),
  };

  const [row] = await db
    .insert(userEmployment)
    .values({ userId, ...merged })
    .onConflictDoUpdate({ target: userEmployment.userId, set: merged })
    .returning();

  return NextResponse.json(row);
}
