import { db } from "@/db/drizzle";
import { jobListings, companyStats } from "@/db/schema";
import { eq } from "drizzle-orm";

// ── Apply-Before-Surge Predictor ────────────────────────────────────────────────
// Recompute per-company hiring stats: jobs first seen in the last 7 days vs the
// 7 days before that. A surge = a meaningful spike this week relative to last week.

const DAY_MS = 24 * 60 * 60 * 1000;
export const SURGE_WINDOW_DAYS = 14; // assumed typical surge duration for "days left"

function isSurging(thisWeek: number, lastWeek: number): boolean {
  return thisWeek >= 3 && thisWeek >= 2 * lastWeek;
}

export async function recomputeCompanyStats(now: number = Date.now()): Promise<number> {
  const weekAgo = now - 7 * DAY_MS;
  const twoWeeksAgo = now - 14 * DAY_MS;

  // Aggregate in app code (simple + portable for early-stage data volumes).
  const rows = await db
    .select({ company: jobListings.company, fetchedAt: jobListings.fetchedAt })
    .from(jobListings);

  const counts = new Map<string, { thisWeek: number; lastWeek: number }>();
  for (const r of rows) {
    if (!r.company) continue;
    const t = r.fetchedAt ? r.fetchedAt.getTime() : 0;
    const entry = counts.get(r.company) || { thisWeek: 0, lastWeek: 0 };
    if (t >= weekAgo) entry.thisWeek++;
    else if (t >= twoWeeksAgo) entry.lastWeek++;
    counts.set(r.company, entry);
  }

  let updated = 0;
  for (const [company, { thisWeek, lastWeek }] of Array.from(counts.entries())) {
    const surge = isSurging(thisWeek, lastWeek);

    const existing = await db
      .select()
      .from(companyStats)
      .where(eq(companyStats.companyName, company))
      .limit(1);

    // Preserve surgeStartedAt across runs; stamp it only on a fresh surge.
    let surgeStartedAt: Date | null = existing[0]?.surgeStartedAt ?? null;
    if (surge && !existing[0]?.isSurge) surgeStartedAt = new Date(now);
    if (!surge) surgeStartedAt = null;

    await db
      .insert(companyStats)
      .values({
        companyName: company,
        jobCountThisWeek: thisWeek,
        jobCountLastWeek: lastWeek,
        isSurge: surge,
        surgeStartedAt,
        lastChecked: new Date(now),
      })
      .onConflictDoUpdate({
        target: companyStats.companyName,
        set: {
          jobCountThisWeek: thisWeek,
          jobCountLastWeek: lastWeek,
          isSurge: surge,
          surgeStartedAt,
          lastChecked: new Date(now),
        },
      });
    updated++;
  }
  return updated;
}

/** Days remaining in a surge window, or null if not surging. */
export function surgeDaysLeft(surgeStartedAt: Date | null, now: number = Date.now()): number | null {
  if (!surgeStartedAt) return null;
  const end = surgeStartedAt.getTime() + SURGE_WINDOW_DAYS * DAY_MS;
  const left = Math.ceil((end - now) / DAY_MS);
  return left > 0 ? left : 0;
}
