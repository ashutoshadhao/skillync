// ── Ghost Job Confidence Score ──────────────────────────────────────────────────
// Rule-based (no AI). Combines how long a listing has stayed open, how many times
// it has been re-seen / reposted, and content quality signals into a 0-100 score.
// Higher = more likely a "ghost" (never-filled / perpetual / evergreen) listing.

const DAY_MS = 24 * 60 * 60 * 1000;

const GENERIC_TITLE_SIGNALS = [
  "urgent",
  "immediate",
  "multiple openings",
  "multiple positions",
  "walk-in",
  "walk in",
  "hiring now",
  "mega hiring",
  "bulk hiring",
];

export interface GhostInput {
  fetchedAt: Date | null;
  lastSeenAt: Date | null;
  seenCount: number | null;
  repostCount: number | null;
  description: string | null;
  title: string | null;
  salaryMin: number | null;
  salaryMax: number | null;
}

export function computeGhostScore(job: GhostInput, now: number = Date.now()): number {
  let score = 0;

  // 1. Longevity — a listing that stays open for weeks is increasingly ghost-like.
  const first = job.fetchedAt ? job.fetchedAt.getTime() : now;
  const ageDays = Math.max(0, (now - first) / DAY_MS);
  if (ageDays > 60) score += 45;
  else if (ageDays > 45) score += 35;
  else if (ageDays > 30) score += 22;
  else if (ageDays > 21) score += 12;

  // 2. Reposts — the same role re-listed under fresh URLs is a classic ghost signal.
  const reposts = job.repostCount || 0;
  score += Math.min(reposts * 15, 35);

  // 3. Re-seen many scrape cycles while still open.
  const seen = job.seenCount || 1;
  if (seen >= 12) score += 15;
  else if (seen >= 6) score += 8;

  // 4. Content quality — vague/empty descriptions and missing salary are weak signals.
  const desc = (job.description || "").trim();
  if (desc.length === 0) score += 12;
  else if (desc.length < 120) score += 6;
  if (job.salaryMin == null && job.salaryMax == null) score += 5;

  const title = (job.title || "").toLowerCase();
  if (GENERIC_TITLE_SIGNALS.some((s) => title.includes(s))) score += 8;

  return Math.max(0, Math.min(100, Math.round(score)));
}
