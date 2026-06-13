"use client";

import { motion } from "framer-motion";
import { CheckCircle2, AlertTriangle, ListChecks } from "lucide-react";
import type { ResumeScoreBreakdown } from "@/types";

function scoreColor(score: number): string {
  if (score >= 80) return "#10b981";
  if (score >= 60) return "#f59e0b";
  return "#f43f5e";
}

function Bar({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span style={{ color: "#7a9e9c" }}>{label}</span>
        <span style={{ color: scoreColor(value), fontWeight: 600 }}>{value}</span>
      </div>
      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "#0d1515" }}>
        <div className="h-full rounded-full" style={{ width: `${value}%`, background: scoreColor(value) }} />
      </div>
    </div>
  );
}

export function ResumeScoreCard({
  score,
  breakdown,
}: {
  score: number | null;
  breakdown: ResumeScoreBreakdown | null;
}) {
  if (score == null) {
    return (
      <div
        className="rounded-2xl p-5 border text-sm"
        style={{ background: "#162020", borderColor: "#1e3030", color: "#7a9e9c" }}
      >
        Resume score not available yet. Re-upload to generate one.
      </div>
    );
  }

  const color = scoreColor(score);
  const circumference = 2 * Math.PI * 34;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl p-5 border"
      style={{ background: "#162020", borderColor: "#1e3030" }}
    >
      <div className="flex items-center gap-5">
        {/* Ring */}
        <div className="relative shrink-0" style={{ width: 80, height: 80 }}>
          <svg width="80" height="80" className="-rotate-90">
            <circle cx="40" cy="40" r="34" fill="none" stroke="#0d1515" strokeWidth="7" />
            <circle
              cx="40"
              cy="40"
              r="34"
              fill="none"
              stroke={color}
              strokeWidth="7"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={circumference - (score / 100) * circumference}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-xl font-bold" style={{ color }}>{score}</span>
            <span className="text-[10px]" style={{ color: "#7a9e9c" }}>/ 100</span>
          </div>
        </div>

        <div className="flex-1 space-y-2">
          <h3 className="text-sm font-semibold" style={{ color: "#e0faf8", fontFamily: "'Space Grotesk', sans-serif" }}>
            Resume Quality Score
          </h3>
          {breakdown && (
            <div className="grid grid-cols-2 gap-x-4 gap-y-2">
              <Bar label="ATS" value={breakdown.ats} />
              <Bar label="Completeness" value={breakdown.completeness} />
              <Bar label="Clarity" value={breakdown.clarity} />
              <Bar label="Keywords" value={breakdown.keywords} />
            </div>
          )}
        </div>
      </div>

      {breakdown && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-5">
          {breakdown.strengths?.length > 0 && (
            <Section icon={<CheckCircle2 className="w-3.5 h-3.5" />} color="#10b981" title="Strengths" items={breakdown.strengths} />
          )}
          {breakdown.improvements?.length > 0 && (
            <Section icon={<AlertTriangle className="w-3.5 h-3.5" />} color="#f59e0b" title="Improve" items={breakdown.improvements} />
          )}
          {breakdown.missingSections?.length > 0 && (
            <Section icon={<ListChecks className="w-3.5 h-3.5" />} color="#f43f5e" title="Missing" items={breakdown.missingSections} />
          )}
        </div>
      )}
    </motion.div>
  );
}

function Section({ icon, color, title, items }: { icon: React.ReactNode; color: string; title: string; items: string[] }) {
  return (
    <div className="rounded-xl p-3" style={{ background: "#0d1515", border: "1px solid #1e3030" }}>
      <div className="flex items-center gap-1.5 mb-2 text-xs font-medium" style={{ color }}>
        {icon}
        {title}
      </div>
      <ul className="space-y-1">
        {items.slice(0, 4).map((item, i) => (
          <li key={i} className="text-xs leading-snug" style={{ color: "#7a9e9c" }}>
            • {item}
          </li>
        ))}
      </ul>
    </div>
  );
}
