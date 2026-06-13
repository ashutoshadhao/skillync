import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/drizzle";
import { applications, users, jobListings } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";

async function resolveUser() {
  const { userId: clerkId } = auth();
  if (!clerkId) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  const user = await db.select().from(users).where(eq(users.clerkId, clerkId)).limit(1);
  if (!user.length) return { error: NextResponse.json({ error: "User not found" }, { status: 404 }) };
  return { userId: user[0].id };
}

function formatScrapedSalary(min: number | null, max: number | null): string | null {
  const lakh = (n: number) => `₹${(n / 100000).toFixed(0)}L`;
  if (min && max) return `${lakh(min)}–${lakh(max)}`;
  if (min) return `${lakh(min)}+`;
  if (max) return `up to ${lakh(max)}`;
  return null;
}

export async function GET(req: NextRequest) {
  const { userId, error } = await resolveUser();
  if (error) return error;

  // ?archived=true returns past job-search cycles; default shows active only.
  const showArchived = req.nextUrl.searchParams.get("archived") === "true";

  const rows = await db
    .select({
      id: applications.id,
      status: applications.status,
      notes: applications.notes,
      appliedAt: applications.appliedAt,
      updatedAt: applications.updatedAt,
      archived: applications.archived,
      jobId: applications.jobId,
      mTitle: applications.title,
      mCompany: applications.company,
      mLocation: applications.location,
      mUrl: applications.url,
      mSalary: applications.salary,
      jlTitle: jobListings.title,
      jlCompany: jobListings.company,
      jlLocation: jobListings.location,
      jlSalaryMin: jobListings.salaryMin,
      jlSalaryMax: jobListings.salaryMax,
      jlSourceUrl: jobListings.sourceUrl,
    })
    .from(applications)
    .leftJoin(jobListings, eq(applications.jobId, jobListings.id))
    .where(and(
      eq(applications.userId, userId),
      eq(applications.archived, showArchived),
    ))
    .orderBy(desc(applications.updatedAt));

  const apps = rows.map((r) => ({
    id: r.id,
    status: r.status,
    notes: r.notes,
    appliedAt: r.appliedAt,
    updatedAt: r.updatedAt,
    archived: r.archived,
    jobId: r.jobId,
    job: {
      title: r.mTitle ?? r.jlTitle ?? null,
      company: r.mCompany ?? r.jlCompany ?? null,
      location: r.mLocation ?? r.jlLocation ?? null,
      salary: r.mSalary ?? formatScrapedSalary(r.jlSalaryMin, r.jlSalaryMax),
      sourceUrl: r.mUrl ?? r.jlSourceUrl ?? null,
    },
  }));

  return NextResponse.json({ applications: apps });
}

export async function POST(req: NextRequest) {
  const { userId, error } = await resolveUser();
  if (error) return error;

  const { jobId, title, company, location, salary, url, status = "saved", notes } =
    await req.json();

  if (!jobId && !title && !company) {
    return NextResponse.json(
      { error: "Provide at least a job title or company" },
      { status: 400 }
    );
  }

  const [app] = await db
    .insert(applications)
    .values({
      userId,
      jobId: jobId ?? null,
      title: title ?? null,
      company: company ?? null,
      location: location ?? null,
      url: url ?? null,
      salary: salary ?? null,
      status,
      notes: notes ?? null,
      appliedAt: status === "applied" ? new Date() : null,
    })
    .returning();

  return NextResponse.json(app);
}

export async function PATCH(req: NextRequest) {
  const { userId, error } = await resolveUser();
  if (error) return error;

  const { id, status, notes, archived, salary } = await req.json();

  const [updated] = await db
    .update(applications)
    .set({
      ...(status !== undefined && { status }),
      ...(notes !== undefined && { notes }),
      ...(archived !== undefined && { archived }),
      ...(salary !== undefined && { salary }),
      updatedAt: new Date(),
      ...(status === "applied" && { appliedAt: new Date() }),
    })
    .where(and(eq(applications.id, id), eq(applications.userId, userId)))
    .returning();

  return NextResponse.json(updated);
}

export async function DELETE(req: NextRequest) {
  const { userId, error } = await resolveUser();
  if (error) return error;

  const { id } = await req.json();

  await db
    .delete(applications)
    .where(and(eq(applications.id, id), eq(applications.userId, userId)));

  return NextResponse.json({ success: true });
}
