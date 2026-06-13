// ── Skillync Type Definitions ──────────────────────────────────────────────────

export interface User {
  id: string;
  clerkId: string;
  name: string | null;
  email: string | null;
  createdAt: Date | null;
}

export interface Resume {
  id: string;
  userId: string | null;
  label: string | null;
  rawText: string | null;
  parsedSkills: string[] | null;
  parsedTitles: string[] | null;
  experienceYears: number | null;
  fileUrl: string | null;
  isActive: boolean | null;
  resumeScore: number | null;
  scoreBreakdown: ResumeScoreBreakdown | null;
  createdAt: Date | null;
}

export interface ResumeScoreBreakdown {
  ats: number;
  completeness: number;
  clarity: number;
  keywords: number;
  strengths: string[];
  improvements: string[];
  missingSections: string[];
}

export interface ParsedExperience {
  title: string;
  company: string;
  duration: string;
  highlights: string[];
}

export interface ParsedResume {
  skills: string[];
  jobTitles: string[];
  experienceYears: number;
  education: string;
  summary: string;
  languages?: string[];
  certifications?: string[];
  experience?: ParsedExperience[];
}

export interface JobListing {
  id: string;
  title: string;
  company: string;
  location: string | null;
  description: string | null;
  sourceUrl: string | null;
  sourcePlatform: string | null;
  salaryMin: number | null;
  salaryMax: number | null;
  isRemote: boolean | null;
  isGhost: boolean | null;
  contentHash: string | null;
  lastSeenAt: Date | null;
  seenCount: number | null;
  repostCount: number | null;
  ghostScore: number | null;
  scamScore: number | null;
  scamFlags: string[] | null;
  estSalaryMin: number | null;
  estSalaryMax: number | null;
  salaryIsEstimated: boolean | null;
  postedAt: Date | null;
  fetchedAt: Date | null;
}

export interface JobMatch {
  id: string;
  userId: string | null;
  jobId: string | null;
  resumeId: string | null;
  prefilterScore: number | null;
  isAiScored: boolean | null;
  matchScore: number | null;
  matchedSkills: string[] | null;
  missingSkills: string[] | null;
  reasoning: string | null;
  createdAt: Date | null;
  // Joined data
  job?: JobListing;
}

export type ApplicationStatus =
  | "saved"
  | "applied"
  | "viewed"
  | "interview"
  | "offer"
  | "rejected";

export interface Application {
  id: string;
  userId?: string | null;
  jobId: string | null;
  status: ApplicationStatus | null;
  notes: string | null;
  appliedAt?: Date | null;
  updatedAt?: Date | null;
  // Nested job info — coalesced from the scraped listing or the manual entry fields.
  job?: {
    title: string | null;
    company: string | null;
    location: string | null;
    salary: string | null;
    sourceUrl: string | null;
  };
}

export interface Alert {
  id: string;
  userId: string | null;
  keyword: string; // first keyword or joined
  keywords: string[] | null;
  location: string | null;
  minSalary: number | null; // alias for salaryMin
  salaryMin: number | null;
  isRemote: boolean | null; // alias for remoteOnly
  remoteOnly: boolean | null;
  frequency: "daily" | "weekly" | "instant" | null;
  isActive: boolean | null;
  lastSentAt: Date | null;
}

export interface EmailConfig {
  id: string;
  userId: string | null;
  smtpHost: string | null;
  smtpPort: number | null;
  smtpUser: string | null;
  smtpPass: string | null;
  fromEmail: string | null;
  isVerified: boolean | null;
}

export interface CompanyWatcher {
  id: string;
  userId: string | null;
  companyName: string | null;
  jobCountLastWeek: number | null;
  jobCountThisWeek: number | null;
  isSurge: boolean | null;
  lastChecked: Date | null;
}

export interface MatchScoreResult {
  matchScore: number;
  matchedSkills: string[];
  missingSkills: string[];
  reasoning: string;
  shouldApply: boolean;
}

export interface DashboardStats {
  totalMatches: number;
  applied: number;
  interviews: number;
  avgMatchScore: number;
}

export interface CompanyStats {
  id: string;
  companyName: string;
  jobCountThisWeek: number | null;
  jobCountLastWeek: number | null;
  isSurge: boolean | null;
  surgeStartedAt: Date | null;
  lastChecked: Date | null;
}

export interface Notification {
  id: string;
  userId: string | null;
  type: string | null;
  title: string;
  body: string | null;
  jobId: string | null;
  isRead: boolean | null;
  createdAt: Date | null;
}

// ── AI helper result shapes ────────────────────────────────────────────────────
export interface ResumeScoreResult {
  overallScore: number;
  atsScore: number;
  completenessScore: number;
  clarityScore: number;
  keywordScore: number;
  strengths: string[];
  improvements: string[];
  missingSections: string[];
}

export interface SalaryEstimate {
  estSalaryMin: number;
  estSalaryMax: number;
  confidence: "low" | "medium" | "high";
  basis: string;
}

export interface ScamResult {
  scamScore: number;
  scamFlags: string[];
}
