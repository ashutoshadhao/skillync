"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowLeft, MapPin, DollarSign, ExternalLink, Briefcase,
  Sparkles, FileText, Ghost, Flame, Loader2, AlertTriangle
} from "lucide-react";
import { toast } from "sonner";
import { MatchScoreBadge } from "@/components/dashboard/MatchScoreBadge";
import { Button } from "@/components/ui/button";
import type { JobListing, JobMatch } from "@/types";

interface SurgeInfo {
  isSurge: boolean;
  daysLeft: number | null;
  jobsThisWeek: number | null;
}
type JobDetail = JobListing & { surge?: SurgeInfo };

export default function JobDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [job, setJob] = useState<JobDetail | null>(null);
  const [match, setMatch] = useState<JobMatch | null>(null);
  const [loadingJob, setLoadingJob] = useState(true);
  const [scoring, setScoring] = useState(false);
  const [tailoring, setTailoring] = useState(false);
  const [coverLetter, setCoverLetter] = useState<string | null>(null);
  const [tailoredBullets, setTailoredBullets] = useState<string[] | null>(null);
  const [applying, setApplying] = useState(false);

  useEffect(() => {
    const fetchJob = async () => {
      try {
        const res = await fetch(`/api/jobs/${id}`);
        if (!res.ok) throw new Error("Job not found");
        const data = await res.json();
        setJob(data);
      } catch {
        toast.error("Failed to load job");
        router.push("/dashboard");
      } finally {
        setLoadingJob(false);
      }
    };
    fetchJob();
  }, [id, router]);

  const handleScore = async () => {
    setScoring(true);
    try {
      const res = await fetch("/api/match/score", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId: id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setMatch(data);
      toast.success("Match scored!");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Scoring failed";
      toast.error(message);
    } finally {
      setScoring(false);
    }
  };

  const handleTailor = async (type: "tailor" | "cover_letter") => {
    setTailoring(true);
    try {
      const res = await fetch("/api/resume/tailor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId: id, type }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      if (type === "tailor") setTailoredBullets(data.tailoredBullets);
      else setCoverLetter(data.coverLetter);
      toast.success(type === "tailor" ? "Resume tailored!" : "Cover letter generated!");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed";
      toast.error(message);
    } finally {
      setTailoring(false);
    }
  };

  const handleApply = async () => {
    setApplying(true);
    try {
      await fetch("/api/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId: id, status: "applied" }),
      });
      toast.success("Application tracked!");
      if (job?.sourceUrl) window.open(job.sourceUrl, "_blank");
    } catch {
      toast.error("Failed to track application");
    } finally {
      setApplying(false);
    }
  };

  if (loadingJob) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: "#0d9488" }} />
      </div>
    );
  }

  if (!job) return null;

  return (
    <div className="px-4 lg:px-8 py-8">
    <div className="max-w-4xl">
      {/* Back button */}
      <button
        onClick={() => router.back()}
        className="flex items-center gap-2 text-sm mb-6 text-gray-500 transition-colors hover:text-gray-900"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to matches
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Job header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-6 rounded-2xl border"
            style={{ background: "#162020", borderColor: "#1e3030" }}
          >
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  {(job.ghostScore ?? 0) >= 40 && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium" style={{ background: "#f43f5e10", color: "#f43f5e" }}>
                      <Ghost className="w-3 h-3" />Ghost risk {job.ghostScore}%
                    </span>
                  )}
                  {job.surge?.isSurge && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium" style={{ background: "#f59e0b22", color: "#f59e0b" }}>
                      <Flame className="w-3 h-3" />Hiring surge
                    </span>
                  )}
                  {job.isRemote && (
                    <span className="px-2 py-0.5 rounded text-xs font-medium" style={{ background: "#0d948820", color: "#2dd4bf" }}>Remote</span>
                  )}
                </div>
                <h1 className="text-2xl font-bold" style={{ color: "#e0faf8", fontFamily: "'Space Grotesk', sans-serif" }}>{job.title}</h1>
                <p className="text-lg mt-1" style={{ color: "#7a9e9c" }}>{job.company}</p>
              </div>
              {match?.matchScore && (
                <MatchScoreBadge score={match.matchScore} size="lg" showRing />
              )}
            </div>

            {/* Surge urgency */}
            {job.surge?.isSurge && (
              <div className="flex items-center gap-2 mb-4 p-3 rounded-lg text-sm" style={{ background: "#f59e0b12", border: "1px solid #f59e0b40", color: "#f59e0b" }}>
                <Flame className="w-4 h-4 shrink-0" />
                <span>
                  <strong>{job.company}</strong> is on a hiring spree
                  {job.surge.jobsThisWeek ? ` (${job.surge.jobsThisWeek} roles this week)` : ""}
                  {job.surge.daysLeft != null ? ` — apply soon, ~${job.surge.daysLeft} days left in this window.` : "."}
                </span>
              </div>
            )}

            {/* Scam warning */}
            {(job.scamScore ?? 0) >= 50 && (
              <div className="flex items-start gap-2 mb-4 p-3 rounded-lg text-sm" style={{ background: "#ef444412", border: "1px solid #ef444450", color: "#ef4444" }}>
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <div>
                  <strong>Possible scam ({job.scamScore}% risk).</strong> Be cautious before sharing money or documents.
                  {job.scamFlags && job.scamFlags.length > 0 && (
                    <span> Flags: {job.scamFlags.join(", ")}.</span>
                  )}
                </div>
              </div>
            )}

            <div className="flex flex-wrap gap-4 text-sm" style={{ color: "#7a9e9c" }}>
              {job.location && (
                <span className="flex items-center gap-1.5">
                  <MapPin className="w-4 h-4" />
                  {job.location}
                </span>
              )}
              {(job.salaryMin || job.salaryMax) ? (
                <span className="flex items-center gap-1.5" style={{ color: "#2dd4bf" }}>
                  <DollarSign className="w-4 h-4" />
                  {job.salaryMin && job.salaryMax
                    ? `₹${(job.salaryMin / 100000).toFixed(0)}L – ₹${(job.salaryMax / 100000).toFixed(0)}L`
                    : `₹${((job.salaryMin || job.salaryMax)! / 100000).toFixed(0)}L`}
                </span>
              ) : job.salaryIsEstimated && (job.estSalaryMin || job.estSalaryMax) ? (
                <span className="flex items-center gap-1.5" title="AI-estimated — salary not listed" style={{ color: "#6b8e8c", fontStyle: "italic" }}>
                  <DollarSign className="w-4 h-4" />
                  ~₹{((job.estSalaryMin ?? job.estSalaryMax)! / 100000).toFixed(0)}L
                  {job.estSalaryMin && job.estSalaryMax ? ` – ₹${(job.estSalaryMax / 100000).toFixed(0)}L` : ""} (est)
                </span>
              ) : null}
              {job.sourcePlatform && (
                <span className="flex items-center gap-1.5">
                  <Briefcase className="w-4 h-4" />
                  via {job.sourcePlatform}
                </span>
              )}
            </div>

            <div className="flex gap-3 mt-5">
              <Button
                onClick={handleApply}
                disabled={applying}
                className="text-white flex-1"
                style={{ background: "linear-gradient(135deg, #0d9488, #6366f1)" }}
              >
                {applying ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <ExternalLink className="w-4 h-4 mr-2" />}
                Apply Now
              </Button>
              <Button
                onClick={handleScore}
                disabled={scoring}
                variant="outline"
                className="border-[#1e3030] bg-transparent text-[#7a9e9c] hover:text-[#e0faf8]"
              >
                {scoring ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Sparkles className="w-4 h-4 mr-2" />}
                Score Match
              </Button>
            </div>
          </motion.div>

          {/* Job Description */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="p-6 rounded-2xl border"
            style={{ background: "#162020", borderColor: "#1e3030" }}
          >
            <h2 className="font-semibold text-lg mb-4" style={{ color: "#e0faf8", fontFamily: "'Space Grotesk', sans-serif" }}>Job Description</h2>
            <div
              className="text-sm leading-relaxed whitespace-pre-wrap"
              style={{ color: "#7a9e9c" }}
            >
              {job.description || "No description available."}
            </div>
          </motion.div>

          {/* Tailored bullets */}
          {tailoredBullets && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-6 rounded-2xl border"
              style={{ background: "#162020", borderColor: "#0d948840" }}
            >
              <h2 className="font-semibold text-lg mb-4 flex items-center gap-2" style={{ color: "#2dd4bf", fontFamily: "'Space Grotesk', sans-serif" }}>
                <Sparkles className="w-5 h-5" />
                AI-Tailored Bullet Points
              </h2>
              <ul className="space-y-2">
                {tailoredBullets.map((bullet, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm" style={{ color: "#e0faf8" }}>
                    <span style={{ color: "#0d9488" }}>•</span>
                    {bullet}
                  </li>
                ))}
              </ul>
            </motion.div>
          )}

          {/* Cover Letter */}
          {coverLetter && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-6 rounded-2xl border"
              style={{ background: "#162020", borderColor: "#0d948840" }}
            >
              <h2 className="font-semibold text-lg mb-4 flex items-center gap-2" style={{ color: "#2dd4bf", fontFamily: "'Space Grotesk', sans-serif" }}>
                <FileText className="w-5 h-5" />
                AI Cover Letter
              </h2>
              <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: "#e0faf8" }}>
                {coverLetter}
              </p>
            </motion.div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Match breakdown */}
          {match && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="p-5 rounded-2xl border"
              style={{ background: "#162020", borderColor: "#1e3030" }}
            >
              <h3 className="font-semibold mb-4" style={{ color: "#e0faf8", fontFamily: "'Space Grotesk', sans-serif" }}>Match Breakdown</h3>

              {match.reasoning && (
                <p className="text-sm mb-4 p-3 rounded-lg" style={{ background: "#0d1515", color: "#7a9e9c" }}>
                  {match.reasoning}
                </p>
              )}

              {match.matchedSkills && match.matchedSkills.length > 0 && (
                <div className="mb-4">
                  <p className="text-xs font-medium mb-2" style={{ color: "#10b981" }}>✓ Matched Skills</p>
                  <div className="flex flex-wrap gap-1.5">
                    {match.matchedSkills.map((s) => (
                      <span key={s} className="px-2 py-0.5 rounded text-xs" style={{ background: "#10b98122", color: "#10b981" }}>{s}</span>
                    ))}
                  </div>
                </div>
              )}

              {match.missingSkills && match.missingSkills.length > 0 && (
                <div>
                  <p className="text-xs font-medium mb-2" style={{ color: "#f43f5e" }}>✗ Missing Skills</p>
                  <div className="flex flex-wrap gap-1.5">
                    {match.missingSkills.map((s) => (
                      <span key={s} className="px-2 py-0.5 rounded text-xs" style={{ background: "#f43f5e18", color: "#f43f5e" }}>{s}</span>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* Pro features */}
          <div className="p-5 rounded-2xl border space-y-3" style={{ background: "#162020", borderColor: "#1e3030" }}>
            <h3 className="font-semibold" style={{ color: "#e0faf8", fontFamily: "'Space Grotesk', sans-serif" }}>AI Tools</h3>

            <Button
              onClick={() => handleTailor("tailor")}
              disabled={tailoring}
              className="w-full text-white"
              style={{ background: "linear-gradient(135deg, #0d9488, #6366f1)" }}
            >
              {tailoring ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Sparkles className="w-4 h-4 mr-2" />}
              Tailor My Resume
            </Button>
            <Button
              onClick={() => handleTailor("cover_letter")}
              disabled={tailoring}
              variant="outline"
              className="w-full border-[#1e3030] bg-transparent text-[#7a9e9c] hover:text-[#e0faf8]"
            >
              <FileText className="w-4 h-4 mr-2" />
              Generate Cover Letter
            </Button>
          </div>
        </div>
      </div>
    </div>
    </div>
  );
}
