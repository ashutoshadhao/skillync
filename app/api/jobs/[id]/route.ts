import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/drizzle";
import { jobListings, companyStats } from "@/db/schema";
import { eq } from "drizzle-orm";
import { surgeDaysLeft } from "@/lib/surge";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { userId } = auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const job = await db
    .select()
    .from(jobListings)
    .where(eq(jobListings.id, params.id))
    .limit(1);

  if (!job.length) return NextResponse.json({ error: "Job not found" }, { status: 404 });

  // Attach hiring-surge info for the company, if any.
  const stats = await db
    .select()
    .from(companyStats)
    .where(eq(companyStats.companyName, job[0].company))
    .limit(1);

  const surge = stats[0]?.isSurge
    ? { isSurge: true, daysLeft: surgeDaysLeft(stats[0].surgeStartedAt), jobsThisWeek: stats[0].jobCountThisWeek }
    : { isSurge: false, daysLeft: null, jobsThisWeek: null };

  return NextResponse.json({ ...job[0], surge });
}
