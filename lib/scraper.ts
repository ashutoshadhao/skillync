import axios from "axios";
import * as cheerio from "cheerio";
import crypto from "crypto";
import { db } from "@/db/drizzle";
import { jobListings } from "@/db/schema";
import { eq, and, sql, gte } from "drizzle-orm";
import { computeGhostScore } from "@/lib/ghost";

const USER_AGENTS = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36",
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/119.0",
];

function randomUserAgent() {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

function hashJob(company: string, title: string, location: string) {
  return crypto
    .createHash("md5")
    .update(`${company.toLowerCase()}${title.toLowerCase()}${(location || "").toLowerCase()}`)
    .digest("hex");
}

async function fetchHTML(url: string): Promise<string | null> {
  try {
    const { data } = await axios.get(url, {
      headers: {
        "User-Agent": randomUserAgent(),
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
        "Accept-Encoding": "gzip, deflate, br",
        Connection: "keep-alive",
        "Upgrade-Insecure-Requests": "1",
      },
      timeout: 15000,
    });
    return data;
  } catch (error) {
    console.error(`Failed to fetch ${url}:`, error);
    return null;
  }
}

// Per-source outcome so callers can distinguish "blocked/unconfigured" from "no results".
export interface SourceResult {
  name: string;
  ok: boolean;
  count: number;
  error?: string;
}

export interface ScrapedJob {
  title: string;
  company: string;
  location: string;
  description: string;
  sourceUrl: string;
  sourcePlatform: string;
  salaryMin?: number;
  salaryMax?: number;
  isRemote: boolean;
  postedAt?: Date;
}

// Strip HTML tags and collapse whitespace (Adzuna titles/descriptions contain markup).
function stripHtml(s: string): string {
  return s.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

// ── Adzuna API (primary source) ──────────────────────────────────────────────────
// Free dev tier at https://developer.adzuna.com — needs ADZUNA_APP_ID + ADZUNA_APP_KEY.
// India country code is "in". Throws when unconfigured so the caller can surface it.
async function fetchAdzuna(keyword: string, location: string): Promise<ScrapedJob[]> {
  const appId = process.env.ADZUNA_APP_ID;
  const appKey = process.env.ADZUNA_APP_KEY;
  if (!appId || !appKey) {
    throw new Error("ADZUNA_APP_ID / ADZUNA_APP_KEY not set — add them to .env.local");
  }

  const params = new URLSearchParams({
    app_id: appId,
    app_key: appKey,
    results_per_page: "20",
    what: keyword,
    where: location,
    max_days_old: "30",
    "content-type": "application/json",
  });
  const url = `https://api.adzuna.com/v1/api/jobs/in/search/1?${params.toString()}`;

  const { data } = await axios.get(url, { timeout: 15000 });
  const results: unknown[] = Array.isArray(data?.results) ? data.results : [];

  return results
    .map((raw): ScrapedJob => {
      const r = raw as Record<string, any>;
      const loc: string = r.location?.display_name || location;
      const predicted = String(r.salary_is_predicted) === "1";
      const haystack = `${r.title || ""} ${loc} ${r.description || ""}`.toLowerCase();
      return {
        title: stripHtml(r.title || ""),
        company: stripHtml(r.company?.display_name || "Unknown") || "Unknown",
        location: loc,
        description: stripHtml(r.description || "").slice(0, 500),
        sourceUrl: r.redirect_url || "",
        sourcePlatform: "adzuna",
        // Adzuna India salaries are annual INR; skip predicted ones (they're estimates).
        salaryMin: !predicted && r.salary_min ? Math.round(r.salary_min) : undefined,
        salaryMax: !predicted && r.salary_max ? Math.round(r.salary_max) : undefined,
        isRemote: haystack.includes("remote") || haystack.includes("work from home"),
        postedAt: r.created ? new Date(r.created) : new Date(),
      };
    })
    .filter((j) => j.title && j.sourceUrl);
}

// ── Naukri Scraper ─────────────────────────────────────────────────────────────
async function scrapeNaukri(keyword: string): Promise<ScrapedJob[]> {
  const slug = keyword.toLowerCase().replace(/\s+/g, "-");
  const url = `https://www.naukri.com/${slug}-jobs`;
  const html = await fetchHTML(url);
  if (!html) return [];

  const $ = cheerio.load(html);
  const jobs: ScrapedJob[] = [];

  $(".jobTuple, article.joblistingwithapply").each((_, el) => {
    const title = $(el).find(".title, .jobTitle").first().text().trim();
    const company = $(el).find(".companyInfo strong, .companyName").first().text().trim();
    const loc = $(el).find(".location, .locWdth").text().trim();
    const desc = $(el).find(".job-description, .job-desc").text().trim().slice(0, 500);
    const href = $(el).find("a.title, a.jobTitle").attr("href") || "";

    const salaryText = $(el).find(".salary, .salaryText").text().trim();
    let salaryMin: number | undefined;
    let salaryMax: number | undefined;
    const salaryMatch = salaryText.match(/(\d+(?:\.\d+)?)\s*[-–]\s*(\d+(?:\.\d+)?)\s*L/i);
    if (salaryMatch) {
      salaryMin = Math.round(parseFloat(salaryMatch[1]) * 100000);
      salaryMax = Math.round(parseFloat(salaryMatch[2]) * 100000);
    }

    if (title && company && href) {
      jobs.push({
        title,
        company,
        location: loc,
        description: desc,
        sourceUrl: href,
        sourcePlatform: "naukri",
        salaryMin,
        salaryMax,
        isRemote: loc.toLowerCase().includes("remote") || loc.toLowerCase().includes("work from home"),
        postedAt: new Date(),
      });
    }
  });

  return jobs.slice(0, 20);
}

// ── Internshala Scraper ────────────────────────────────────────────────────────
async function scrapeInternshala(keyword: string): Promise<ScrapedJob[]> {
  const slug = keyword.toLowerCase().replace(/\s+/g, "-");
  const url = `https://internshala.com/jobs/${slug}-jobs`;
  const html = await fetchHTML(url);
  if (!html) return [];

  const $ = cheerio.load(html);
  const jobs: ScrapedJob[] = [];

  $(".individual_internship, .internship_meta").each((_, el) => {
    const title = $(el).find(".profile, .job-title h3").first().text().trim();
    const company = $(el).find(".company_name, .company-name").first().text().trim();
    const loc = $(el).find(".location_link, .locations").first().text().trim();
    const stipend = $(el).find(".stipend, .salary").first().text().trim();
    const href = $(el).find("a.view_detail_button, a.job-title-href").attr("href") || "";
    const fullUrl = href.startsWith("http") ? href : `https://internshala.com${href}`;

    if (title && company) {
      jobs.push({
        title,
        company,
        location: loc || "India",
        description: stipend ? `Stipend/Salary: ${stipend}` : "",
        sourceUrl: fullUrl,
        sourcePlatform: "internshala",
        isRemote: loc.toLowerCase().includes("remote") || loc.toLowerCase().includes("work from home"),
        postedAt: new Date(),
      });
    }
  });

  return jobs.slice(0, 20);
}

// ── Main Fetch + Save ──────────────────────────────────────────────────────────
export async function fetchAndSaveJobs(keyword: string, location = "India") {
  console.log(`Fetching jobs for: ${keyword} in ${location}`);

  const allJobs: ScrapedJob[] = [];
  const sources: SourceResult[] = [];

  // Adzuna API (primary) + Naukri/Internshala scrapers (best-effort), in parallel.
  const names = ["adzuna", "naukri", "internshala"];
  const settled = await Promise.allSettled([
    fetchAdzuna(keyword, location),
    scrapeNaukri(keyword),
    scrapeInternshala(keyword),
  ]);

  settled.forEach((res, i) => {
    if (res.status === "fulfilled") {
      allJobs.push(...res.value);
      sources.push({ name: names[i], ok: true, count: res.value.length });
    } else {
      const error = res.reason instanceof Error ? res.reason.message : String(res.reason);
      sources.push({ name: names[i], ok: false, count: 0, error });
      console.error(`Source "${names[i]}" failed: ${error}`);
    }
  });

  console.log(`Total jobs fetched: ${allJobs.length}`);

  let saved = 0;
  let reseen = 0;
  const now = Date.now();
  const thirtyDaysAgo = new Date(now - 30 * 24 * 60 * 60 * 1000);

  for (const job of allJobs) {
    if (!job.sourceUrl) continue;

    const contentHash = hashJob(job.company, job.title, job.location);

    // Already-seen URL → bump last-seen + seen count (a long-lived listing is a ghost signal).
    const existing = await db
      .select({ id: jobListings.id })
      .from(jobListings)
      .where(eq(jobListings.sourceUrl, job.sourceUrl))
      .limit(1);

    if (existing.length > 0) {
      await db
        .update(jobListings)
        .set({ lastSeenAt: new Date(now), seenCount: sql`${jobListings.seenCount} + 1` })
        .where(eq(jobListings.id, existing[0].id));
      reseen++;
      continue;
    }

    // New URL, but same company+title+location seen recently → it's a repost.
    const reposts = await db
      .select({ id: jobListings.id })
      .from(jobListings)
      .where(and(eq(jobListings.contentHash, contentHash), gte(jobListings.fetchedAt, thirtyDaysAgo)));
    const repostCount = reposts.length;

    const ghostScore = computeGhostScore(
      {
        fetchedAt: new Date(now),
        lastSeenAt: new Date(now),
        seenCount: 1,
        repostCount,
        description: job.description,
        title: job.title,
        salaryMin: job.salaryMin ?? null,
        salaryMax: job.salaryMax ?? null,
      },
      now
    );

    await db.insert(jobListings).values({
      title: job.title,
      company: job.company,
      location: job.location,
      description: job.description,
      sourceUrl: job.sourceUrl,
      sourcePlatform: job.sourcePlatform,
      salaryMin: job.salaryMin,
      salaryMax: job.salaryMax,
      isRemote: job.isRemote,
      contentHash,
      lastSeenAt: new Date(now),
      seenCount: 1,
      repostCount,
      ghostScore,
      isGhost: ghostScore >= 70,
      postedAt: job.postedAt,
    });

    saved++;
  }

  console.log(`Saved: ${saved}, Re-seen (existing): ${reseen}`);
  return { saved, skipped: reseen, sources };
}
