"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import { MapPin, DollarSign, Bookmark, ExternalLink, Flame, Ghost } from "lucide-react";
import { MatchScoreBadge } from "./MatchScoreBadge";
import { toast } from "sonner";

interface JobCardProps {
  matchId: string;
  jobId: string;
  title: string;
  company: string;
  location: string | null;
  matchScore: number;
  matchedSkills: string[] | null;
  salaryMin: number | null;
  salaryMax: number | null;
  isRemote: boolean | null;
  isGhost: boolean | null;
  isSurge?: boolean;
  index?: number;
}

export function JobCard({
  matchId,
  jobId,
  title,
  company,
  location,
  matchScore,
  matchedSkills,
  salaryMin,
  salaryMax,
  isRemote,
  isGhost,
  isSurge = false,
  index = 0,
}: JobCardProps) {
  const topSkills = (matchedSkills || []).slice(0, 3);
  const logoUrl = `https://logo.clearbit.com/${company.toLowerCase().replace(/\s+/g, "")}.com`;

  const handleSave = async () => {
    try {
      await fetch("/api/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId, status: "saved" }),
      });
      toast.success("Job saved to tracker!");
    } catch {
      toast.error("Failed to save job");
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      whileHover={{ scale: 1.01, boxShadow: "0 0 30px #0d948820" }}
      className="p-5 rounded-2xl border transition-all"
      style={{ background: "#162020", borderColor: "#1e3030" }}
    >
      <div className="flex items-start justify-between gap-3 mb-4">
        {/* Company Logo + Info */}
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div
            className="w-11 h-11 rounded-xl border flex items-center justify-center shrink-0 overflow-hidden"
            style={{ borderColor: "#1e3030", background: "#0d1515" }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={logoUrl}
              alt={company}
              className="w-8 h-8 object-contain"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).style.display = "none";
                (e.currentTarget.nextElementSibling as HTMLElement).style.display = "flex";
              }}
            />
            <div
              className="hidden w-full h-full items-center justify-center text-sm font-bold"
              style={{ color: "#0d9488" }}
            >
              {company.charAt(0).toUpperCase()}
            </div>
          </div>
          <div className="min-w-0">
            <h3 className="font-semibold text-sm truncate" style={{ color: "#e0faf8" }}>
              {title}
            </h3>
            <p className="text-sm truncate" style={{ color: "#7a9e9c" }}>
              {company}
            </p>
          </div>
        </div>

        <MatchScoreBadge score={matchScore} size="sm" />
      </div>

      {/* Badges row */}
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        {location && (
          <span
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs"
            style={{ background: "#0d1515", color: "#7a9e9c" }}
          >
            <MapPin className="w-3 h-3" />
            {location}
          </span>
        )}
        {isRemote && (
          <span
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium"
            style={{ background: "#0d948820", color: "#2dd4bf" }}
          >
            Remote
          </span>
        )}
        {isSurge && (
          <span
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium"
            style={{ background: "#f59e0b22", color: "#f59e0b" }}
          >
            <Flame className="w-3 h-3" />
            Surge
          </span>
        )}
        {isGhost && (
          <span
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium"
            style={{ background: "#f43f5e10", color: "#f43f5e" }}
          >
            <Ghost className="w-3 h-3" />
            Ghost
          </span>
        )}
      </div>

      {/* Salary */}
      {(salaryMin || salaryMax) && (
        <div className="flex items-center gap-1 text-sm mb-3" style={{ color: "#2dd4bf" }}>
          <DollarSign className="w-3.5 h-3.5" />
          {salaryMin && salaryMax
            ? `₹${(salaryMin / 100000).toFixed(0)}L – ₹${(salaryMax / 100000).toFixed(0)}L`
            : salaryMin
            ? `₹${(salaryMin / 100000).toFixed(0)}L+`
            : `Up to ₹${(salaryMax! / 100000).toFixed(0)}L`}
        </div>
      )}

      {/* Skills */}
      {topSkills.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-4">
          {topSkills.map((skill) => (
            <span
              key={skill}
              className="px-2 py-0.5 rounded-md text-xs font-medium"
              style={{ background: "#1e2e2e", color: "#2dd4bf" }}
            >
              {skill}
            </span>
          ))}
          {(matchedSkills?.length || 0) > 3 && (
            <span
              className="px-2 py-0.5 rounded-md text-xs"
              style={{ background: "#0d1515", color: "#7a9e9c" }}
            >
              +{(matchedSkills?.length || 0) - 3} more
            </span>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2 pt-3 border-t" style={{ borderColor: "#1e3030" }}>
        <button
          onClick={handleSave}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all hover:bg-white/5"
          style={{ borderColor: "#1e3030", color: "#7a9e9c" }}
        >
          <Bookmark className="w-3.5 h-3.5" />
          Save
        </button>
        <Link
          href={`/job/${jobId}`}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-white transition-all hover:opacity-80 ml-auto"
          style={{ background: "linear-gradient(135deg, #0d9488, #6366f1)" }}
        >
          <ExternalLink className="w-3.5 h-3.5" />
          View Details
        </Link>
      </div>
    </motion.div>
  );
}
