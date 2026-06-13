import { NextRequest, NextResponse } from "next/server";
import { fetchAndSaveJobs } from "@/lib/scraper";

const KEYWORDS = [
  "software engineer",
  "frontend developer",
  "backend developer",
  "full stack developer",
  "data scientist",
  "product manager",
  "devops engineer",
  "ui ux designer",
];

const LOCATIONS = ["India", "Bangalore", "Mumbai", "Delhi", "Hyderabad", "Pune", "Remote"];

export async function GET(req: NextRequest) {
  const cronSecret = req.headers.get("x-cron-secret");
  if (cronSecret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let totalSaved = 0;
  let totalSkipped = 0;

  // Fetch for a sample of keyword/location combos
  for (const keyword of KEYWORDS.slice(0, 3)) {
    for (const location of LOCATIONS.slice(0, 2)) {
      try {
        const { saved, skipped } = await fetchAndSaveJobs(keyword, location);
        totalSaved += saved;
        totalSkipped += skipped;
      } catch (err) {
        console.error(`Failed for ${keyword} / ${location}:`, err);
      }
    }
  }

  return NextResponse.json({
    success: true,
    saved: totalSaved,
    skipped: totalSkipped,
    timestamp: new Date().toISOString(),
  });
}
