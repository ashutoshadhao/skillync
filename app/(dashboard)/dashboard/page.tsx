"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import {
  RefreshCw, Target, Briefcase, MessageSquare, TrendingUp,
  MapPin, Wifi, IndianRupee, ExternalLink, Search,
  Sparkles, AlertTriangle, Ghost, BarChart3
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ResumePromptBanner } from "@/components/shared/ResumePromptBanner";
import {
  BarChart, Bar, Cell, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid
} from "recharts";

interface JobMatch {
  matchId: string;
  jobId: string;
  title: string;
  company: string;
  location: string | null;
  matchScore: number | null;
  prefilterScore: number | null;
  isAiScored: boolean | null;
  matchedSkills: string[] | null;
  salaryMin: number | null;
  salaryMax: number | null;
  estSalaryMin: number | null;
  estSalaryMax: number | null;
  salaryIsEstimated: boolean | null;
  isRemote: boolean | null;
  isGhost: boolean | null;
  ghostScore: number | null;
  scamScore: number | null;
}

interface Stats {
  totalMatches: number;
  applied: number;
  interviews: number;
  offer: number;
  rejected: number;
  saved: number;
  avgMatchScore: number;
}

function ScoreBadge({ score }: { score: number }) {
  const color = score >= 80 ? "#10b981" : score >= 60 ? "#f59e0b" : "#f43f5e";
  const bg   = score >= 80 ? "#10b98115" : score >= 60 ? "#f59e0b15" : "#f43f5e15";
  return (
    <span
      className="inline-flex items-center justify-center rounded-full text-xs font-semibold px-2.5 py-0.5"
      style={{ color, background: bg, minWidth: 44 }}
    >
      {score}%
    </span>
  );
}

const STAT_CONFIG = [
  {
    key: "totalMatches" as const,
    label: "Total Applications",
    icon: Target,
    iconGrad: "linear-gradient(135deg, #0d9488, #2dd4bf)",
    numGrad:  "linear-gradient(135deg, #2dd4bf, #0d9488)",
  },
  {
    key: "applied" as const,
    label: "Applied",
    icon: Briefcase,
    iconGrad: "linear-gradient(135deg, #6366f1, #818cf8)",
    numGrad:  "linear-gradient(135deg, #818cf8, #6366f1)",
  },
  {
    key: "interviews" as const,
    label: "Interviews",
    icon: MessageSquare,
    iconGrad: "linear-gradient(135deg, #10b981, #34d399)",
    numGrad:  "linear-gradient(135deg, #34d399, #10b981)",
  },
  {
    key: "avgMatchScore" as const,
    label: "Interview Rate",
    icon: TrendingUp,
    iconGrad: "linear-gradient(135deg, #f59e0b, #fbbf24)",
    numGrad:  "linear-gradient(135deg, #fbbf24, #f59e0b)",
  },
];

const STATUS_BARS = [
  { label: "Saved",     grad: "linear-gradient(90deg, #6366f1, #818cf8)" },
  { label: "Applied",   grad: "linear-gradient(90deg, #0d9488, #2dd4bf)" },
  { label: "Interview", grad: "linear-gradient(90deg, #10b981, #34d399)" },
  { label: "Offer",     grad: "linear-gradient(90deg, #f59e0b, #fbbf24)" },
  { label: "Rejected",  grad: "linear-gradient(90deg, #f43f5e, #fb7185)" },
];

export default function DashboardPage() {
  const [matches, setMatches] = useState<JobMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [aiMatching, setAiMatching] = useState(false);
  const [resumeScore, setResumeScore] = useState<number | null>(null);
  const [stats, setStats] = useState<Stats>({ totalMatches: 0, applied: 0, interviews: 0, offer: 0, rejected: 0, saved: 0, avgMatchScore: 0 });
  const [keyword, setKeyword] = useState("");
  const [resumeSkills, setResumeSkills] = useState<string[]>([]);
  const [skillQuery, setSkillQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchedFor, setSearchedFor] = useState<string | null>(null);

  const fetchMatches = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: "1", ...(keyword && { keyword }) });
      const [jobsRes, appsRes, resumesRes] = await Promise.all([
        fetch(`/api/jobs?${params}`),
        fetch("/api/applications"),
        fetch("/api/resumes"),
      ]);
      const jobsData = await jobsRes.json();
      const appsData = await appsRes.json();
      const resumesData = await resumesRes.json();
      const active = (resumesData.resumes || []).find(
        (r: { isActive?: boolean; resumeScore?: number; parsedSkills?: string[] }) => r.isActive
      );
      setResumeScore(active?.resumeScore ?? null);
      setResumeSkills(active?.parsedSkills ?? []);

      const jobList: JobMatch[] = jobsData.matches || [];
      const apps = appsData.applications || [];
      setMatches(jobList);

      const countStatus = (status: string) =>
        apps.filter((a: { status: string }) => a.status === status).length;
      const total = apps.length;
      setStats({
        totalMatches: total,
        applied: countStatus("applied"),
        interviews: countStatus("interview"),
        offer: countStatus("offer"),
        rejected: countStatus("rejected"),
        saved: countStatus("saved"),
        avgMatchScore: total > 0 ? Math.round(countStatus("interview") / total * 100) : 0,
      });
    } catch {
      toast.error("Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  }, [keyword]);

  const runAiMatching = useCallback(async () => {
    setAiMatching(true);
    try {
      const res = await fetch("/api/match/run", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Matching failed");
      toast.success(`Matched ${data.prefiltered} jobs, AI-scored top ${data.aiScored}`);
      await fetchMatches();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Matching failed");
    } finally {
      setAiMatching(false);
    }
  }, [fetchMatches]);

  const searchBySkill = useCallback(async (term: string) => {
    const q = term.trim();
    if (!q) return;
    setSearching(true);
    try {
      const res = await fetch("/api/jobs/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keyword: q }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Search failed");
      setMatches(data.matches || []);
      setSearchedFor(q);

      const adzuna = (data.sources || []).find((s: { name: string }) => s.name === "adzuna");
      if (adzuna && !adzuna.ok) {
        toast.error(
          adzuna.error?.includes("ADZUNA_APP_ID")
            ? "Adzuna isn't configured — add ADZUNA_APP_ID and ADZUNA_APP_KEY to .env.local"
            : `Adzuna fetch failed: ${adzuna.error || "unknown error"}`
        );
      } else {
        toast.success(
          data.found
            ? `Found ${data.found} job${data.found === 1 ? "" : "s"} for "${q}"${data.saved ? ` · ${data.saved} new` : ""}`
            : `No jobs found for "${q}" right now`
        );
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Search failed");
    } finally {
      setSearching(false);
    }
  }, []);

  const clearSearch = useCallback(() => {
    setSearchedFor(null);
    setSkillQuery("");
    fetchMatches();
  }, [fetchMatches]);

  useEffect(() => { fetchMatches(); }, [fetchMatches]);

  const displayScore = (m: JobMatch) => m.matchScore ?? m.prefilterScore ?? 0;

  const pipelineData = [
    { stage: "Saved",     count: stats.saved,      fill: "#6366f1" },
    { stage: "Applied",   count: stats.applied,    fill: "#0d9488" },
    { stage: "Interview", count: stats.interviews, fill: "#10b981" },
    { stage: "Offer",     count: stats.offer,      fill: "#f59e0b" },
    { stage: "Rejected",  count: stats.rejected,   fill: "#f43f5e" },
  ];

  return (
    <motion.div
      className="space-y-6 px-4 lg:px-8 py-8"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
    >
      <ResumePromptBanner />

      {/* Top bar */}
      <div className="flex items-center justify-between gap-4 px-5 py-4 rounded-[14px] border border-gray-200 bg-white">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
            {resumeScore != null && (
              <a
                href="/resume"
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold"
                title="Your resume quality score — click to view details"
                style={{
                  background: resumeScore >= 80 ? "#10b98115" : resumeScore >= 60 ? "#f59e0b15" : "#f43f5e15",
                  color: resumeScore >= 80 ? "#10b981" : resumeScore >= 60 ? "#f59e0b" : "#f43f5e",
                }}
              >
                Resume {resumeScore}/100
              </a>
            )}
          </div>
          <p className="text-sm mt-0.5 text-gray-500">Your AI-powered job search overview</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={runAiMatching}
            disabled={aiMatching}
            size="sm"
            variant="outline"
            className="gap-2 font-semibold border-teal-300 text-teal-700 hover:bg-teal-50"
          >
            <Sparkles className={`w-4 h-4 ${aiMatching ? "animate-spin" : ""}`} />
            {aiMatching ? "Matching…" : "Find Matches"}
          </Button>
          <Button
            onClick={fetchMatches}
            disabled={loading}
            size="sm"
            className="gap-2 text-white font-semibold bg-teal-600 hover:bg-teal-700"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Search jobs by skill */}
      <div className="rounded-[14px] border border-gray-200 bg-white p-5">
        <div className="flex items-center gap-2 mb-3">
          <Search className="w-4 h-4 text-teal-600" aria-hidden="true" />
          <h2 className="text-sm font-semibold text-gray-900">Search jobs by skill</h2>
        </div>

        <div className="flex gap-2">
          <input
            value={skillQuery}
            onChange={(e) => setSkillQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && searchBySkill(skillQuery)}
            aria-label="Search jobs by skill or keyword"
            placeholder="e.g. React, Python, Product Manager…"
            disabled={searching}
            className="flex-1 px-3 py-2 rounded-lg text-sm border outline-none transition-colors disabled:opacity-60"
            style={{ background: "#f9fafb", borderColor: "#e5e7eb", color: "#111827" }}
            onFocus={(e) => (e.currentTarget.style.borderColor = "#0d9488")}
            onBlur={(e) => (e.currentTarget.style.borderColor = "#e5e7eb")}
          />
          <Button
            onClick={() => searchBySkill(skillQuery)}
            disabled={searching || !skillQuery.trim()}
            size="sm"
            className="gap-2 text-white font-semibold shrink-0 bg-teal-600 hover:bg-teal-700"
          >
            {searching ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            {searching ? "Searching…" : "Search"}
          </Button>
        </div>

        {resumeSkills.length > 0 && (
          <div className="mt-3">
            <p className="text-xs mb-2 text-gray-500">From your resume — click to search:</p>
            <div className="flex flex-wrap gap-2">
              {resumeSkills.slice(0, 12).map((sk) => (
                <button
                  key={sk}
                  onClick={() => { setSkillQuery(sk); searchBySkill(sk); }}
                  disabled={searching}
                  className="text-xs px-2.5 py-1 rounded-full border border-teal-200 bg-teal-50 text-teal-700 hover:bg-teal-100 transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {sk}
                </button>
              ))}
            </div>
          </div>
        )}

        {searchedFor && (
          <div className="mt-3 flex items-center gap-2 text-xs text-gray-500">
            <span>
              Showing live results for{" "}
              <span className="text-teal-600 font-medium">&ldquo;{searchedFor}&rdquo;</span>
            </span>
            <button onClick={clearSearch} className="underline cursor-pointer hover:text-gray-900">
              clear
            </button>
          </div>
        )}
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {STAT_CONFIG.map((s, i) => {
          const value = stats[s.key];
          const display = s.key === "avgMatchScore" ? `${Math.round(value)}%` : value;
          return (
            <motion.div
              key={s.key}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="rounded-2xl p-5 border border-gray-200 bg-white shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-200 cursor-default"
            >
              <div className="flex items-start mb-3">
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center"
                  style={{ background: s.iconGrad }}
                >
                  <s.icon className="w-4 h-4 text-white" />
                </div>
              </div>
              <div className="mb-0.5">
                {loading ? (
                  <div className="w-12 h-8 rounded animate-pulse bg-gray-200" />
                ) : (
                  <span
                    className="text-[2.2rem] leading-tight font-stat"
                    style={{
                      background: s.numGrad,
                      WebkitBackgroundClip: "text",
                      WebkitTextFillColor: "transparent",
                      backgroundClip: "text",
                    }}
                  >
                    {display}
                  </span>
                )}
              </div>
              <div className="text-xs text-gray-500">{s.label}</div>
            </motion.div>
          );
        })}
      </div>

      {/* Chart + Status panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="lg:col-span-2 rounded-2xl border border-gray-200 bg-white p-5"
        >
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="font-semibold text-sm text-gray-900">Application Pipeline</h2>
              <p className="text-xs mt-0.5 text-gray-500">Count of applications at each stage</p>
            </div>
            <div
              className="text-xl font-bold"
              style={{
                fontWeight: 700,
                background: "linear-gradient(135deg, #2dd4bf, #6366f1)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              {loading ? "—" : `${stats.totalMatches} total`}
            </div>
          </div>

          {stats.totalMatches === 0 && !loading ? (
            <div className="flex flex-col items-center justify-center h-44 gap-3">
              <BarChart3 className="w-9 h-9 text-gray-200" aria-hidden="true" />
              <p className="text-sm text-gray-500">No applications yet</p>
              <a
                href="/tracker"
                className="text-xs px-3 py-1.5 rounded-lg font-medium bg-teal-50 text-teal-700 hover:bg-teal-100 transition-colors cursor-pointer"
              >
                Add your first application →
              </a>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={pipelineData} margin={{ top: 4, right: 0, left: -28, bottom: 0 }}>
                <CartesianGrid strokeDasharray="4 4" stroke="#f3f4f6" vertical={false} />
                <XAxis
                  dataKey="stage"
                  tick={{ fill: "#6b7280", fontSize: 11, fontFamily: "Inter" }}
                  axisLine={false} tickLine={false}
                />
                <YAxis
                  tick={{ fill: "#6b7280", fontSize: 11, fontFamily: "Inter" }}
                  allowDecimals={false}
                  axisLine={false} tickLine={false}
                />
                <Tooltip
                  contentStyle={{
                    background: "#ffffff", border: "1px solid #e5e7eb",
                    borderRadius: 8, color: "#111827", fontSize: 12,
                    fontFamily: "Inter",
                  }}
                  cursor={{ fill: "#f3f4f6" }}
                />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {pipelineData.map((entry) => (
                    <Cell key={entry.stage} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </motion.div>

        {/* Application Status Panel */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="rounded-2xl border border-gray-200 bg-white p-5 flex flex-col gap-4"
        >
          <h2 className="font-semibold text-sm text-gray-900">Application Status</h2>

          {[
            { label: "Saved",     value: stats.saved,       pct: stats.totalMatches ? Math.round(stats.saved / stats.totalMatches * 100) : 0 },
            { label: "Applied",   value: stats.applied,     pct: stats.totalMatches ? Math.round(stats.applied / stats.totalMatches * 100) : 0 },
            { label: "Interview", value: stats.interviews,  pct: stats.totalMatches ? Math.round(stats.interviews / stats.totalMatches * 100) : 0 },
            { label: "Offer",     value: stats.offer,       pct: stats.totalMatches ? Math.round(stats.offer / stats.totalMatches * 100) : 0 },
            { label: "Rejected",  value: stats.rejected,    pct: stats.totalMatches ? Math.round(stats.rejected / stats.totalMatches * 100) : 0 },
          ].map((row) => {
            const barConfig = STATUS_BARS.find((b) => b.label === row.label)!;
            return (
              <div key={row.label}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs text-gray-500">{row.label}</span>
                  <span className="text-xs font-medium text-gray-900">{row.value}</span>
                </div>
                <div className="h-1.5 rounded-full overflow-hidden bg-gray-100">
                  <div
                    className="h-1.5 rounded-full transition-all duration-1000"
                    style={{ width: `${row.pct}%`, background: barConfig.grad }}
                  />
                </div>
              </div>
            );
          })}

          <div className="pt-3 border-t border-gray-100 mt-auto">
            <p className="text-xs mb-1 text-gray-500">
              Interview rate
              <span className="ml-1 text-gray-400">· of jobs applied</span>
            </p>
            {stats.applied > 0 ? (
              <div
                className="text-3xl font-bold"
                style={{
                  background: "linear-gradient(135deg, #2dd4bf, #6366f1)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}
              >
                {Math.round((stats.interviews / stats.applied) * 100)}%
              </div>
            ) : (
              <div className="text-3xl font-bold text-gray-300">—</div>
            )}
          </div>
        </motion.div>
      </div>

      {/* Job Matches table */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
        className="rounded-2xl border border-gray-200 bg-white overflow-hidden"
      >
        {/* Table header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-sm text-gray-900">Job Matches</h2>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" aria-hidden="true" />
              <input
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && fetchMatches()}
                aria-label="Search job matches"
                placeholder="Search jobs…"
                className="pl-8 pr-3 py-1.5 rounded-lg text-xs border outline-none w-44 transition-colors"
                style={{ background: "#f9fafb", borderColor: "#e5e7eb", color: "#111827" }}
                onFocus={(e) => (e.currentTarget.style.borderColor = "#0d9488")}
                onBlur={(e) => (e.currentTarget.style.borderColor = "#e5e7eb")}
              />
            </div>
          </div>
        </div>

        {loading ? (
          <div className="p-5 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-10 rounded-lg animate-pulse bg-gray-100" />
            ))}
          </div>
        ) : matches.length === 0 ? (
          <div className="text-center py-16">
            <Search className="w-10 h-10 mx-auto mb-3 text-gray-200" />
            <p className="text-sm font-medium mb-1 text-gray-900">No matches yet</p>
            <p className="text-xs mb-4 text-gray-500">Upload your resume to get AI-matched jobs</p>
            <Button
              onClick={() => (window.location.href = "/resume")}
              size="sm"
              className="text-white font-semibold bg-teal-600 hover:bg-teal-700"
            >
              Upload Resume
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  {["Job Title", "Company", "Location", "Salary", "Score", ""].map((h) => (
                    <th key={h} className="text-left px-5 py-3 text-xs font-medium text-gray-500">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {matches.slice(0, 10).map((m, i) => {
                  const score = displayScore(m);
                  const scoreColor = score >= 80 ? "#10b981" : score >= 60 ? "#f59e0b" : "#f43f5e";
                  return (
                    <motion.tr
                      key={m.matchId}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: i * 0.04 }}
                      className="border-b border-gray-50 transition-all group"
                      onMouseEnter={(e) => {
                        (e.currentTarget as HTMLTableRowElement).style.background = "#f9fafb";
                        (e.currentTarget as HTMLTableRowElement).style.borderLeft = `3px solid ${scoreColor}`;
                      }}
                      onMouseLeave={(e) => {
                        (e.currentTarget as HTMLTableRowElement).style.background = "transparent";
                        (e.currentTarget as HTMLTableRowElement).style.borderLeft = "none";
                      }}
                    >
                      <td className="px-5 py-3.5">
                        <div className="font-medium text-gray-900">{m.title}</div>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {(m.ghostScore ?? 0) >= 40 && (
                            <span className="inline-flex items-center gap-0.5 text-xs px-1.5 py-0.5 rounded-full" style={{ background: "#f43f5e10", color: "#f43f5e80", border: "0.5px solid #f43f5e40" }}><Ghost className="w-2.5 h-2.5" />Ghost {m.ghostScore}%</span>
                          )}
                          {(m.scamScore ?? 0) >= 50 && (
                            <span className="inline-flex items-center gap-0.5 text-xs px-1.5 py-0.5 rounded-full" style={{ background: "#ef444415", color: "#ef4444", border: "0.5px solid #ef444450" }}>
                              <AlertTriangle className="w-2.5 h-2.5" />Scam risk
                            </span>
                          )}
                          {m.matchedSkills?.slice(0, 3).map((sk) => (
                            <span key={sk} className="text-xs px-1.5 py-0.5 rounded-full bg-gray-100 border border-gray-200 text-gray-600">{sk}</span>
                          ))}
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-sm text-gray-900">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-semibold text-white shrink-0"
                            style={{ background: "linear-gradient(135deg, #0d9488, #6366f1)" }}
                          >
                            {m.company.charAt(0).toUpperCase()}
                          </div>
                          {m.company}
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-1 text-xs text-gray-500">
                          {m.isRemote
                            ? <><Wifi className="w-3 h-3 text-teal-600" />Remote</>
                            : <><MapPin className="w-3 h-3" />{m.location || "—"}</>
                          }
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-xs text-gray-500">
                        {m.salaryMin || m.salaryMax ? (
                          <span className="flex items-center gap-1">
                            <IndianRupee className="w-3 h-3" />
                            {m.salaryMin ? `${(m.salaryMin / 100000).toFixed(1)}L` : ""}
                            {m.salaryMin && m.salaryMax ? " – " : ""}
                            {m.salaryMax ? `${(m.salaryMax / 100000).toFixed(1)}L` : ""}
                          </span>
                        ) : m.salaryIsEstimated && (m.estSalaryMin || m.estSalaryMax) ? (
                          <span className="flex items-center gap-1 italic text-gray-400" title="AI-estimated — salary not listed">
                            <IndianRupee className="w-3 h-3" />
                            ~{((m.estSalaryMin ?? m.estSalaryMax)! / 100000).toFixed(0)}L
                            {m.estSalaryMin && m.estSalaryMax ? `–${(m.estSalaryMax / 100000).toFixed(0)}L` : ""} est
                          </span>
                        ) : "—"}
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-1.5">
                          <ScoreBadge score={score} />
                          {!m.isAiScored && (
                            <span className="text-[10px] text-gray-400" title="Skill-overlap estimate — run Find Matches for an AI score">est</span>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <a
                          href={`/job/${m.jobId}`}
                          className="inline-flex items-center gap-1 text-xs transition-colors opacity-0 group-hover:opacity-100 text-teal-600 hover:text-teal-700"
                        >
                          View <ExternalLink className="w-3 h-3" />
                        </a>
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
            {matches.length > 10 && (
              <div className="px-5 py-3 border-t border-gray-100">
                <a href="/dashboard?all=1" className="text-xs text-teal-600 hover:text-teal-700">
                  View all {matches.length} matches →
                </a>
              </div>
            )}
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
