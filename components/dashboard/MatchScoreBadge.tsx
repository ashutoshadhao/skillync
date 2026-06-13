"use client";

import { motion } from "framer-motion";

interface MatchScoreBadgeProps {
  score: number;
  size?: "sm" | "md" | "lg";
  showRing?: boolean;
}

export function MatchScoreBadge({ score, size = "md", showRing = false }: MatchScoreBadgeProps) {
  const color = score >= 80 ? "#10b981" : score >= 60 ? "#f59e0b" : "#f43f5e";
  const bg = score >= 80 ? "#10b98120" : score >= 60 ? "#f59e0b20" : "#f43f5e18";
  const label = score >= 80 ? "Strong" : score >= 60 ? "Good" : "Weak";

  const sizes = {
    sm: { ring: 40, strokeWidth: 3, textSize: "10px", padding: "6px 10px" },
    md: { ring: 52, strokeWidth: 4, textSize: "13px", padding: "8px 14px" },
    lg: { ring: 72, strokeWidth: 5, textSize: "16px", padding: "10px 18px" },
  };

  const s = sizes[size];
  const radius = (s.ring - s.strokeWidth * 2) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = (score / 100) * circumference;

  if (showRing) {
    return (
      <div className="flex flex-col items-center gap-2">
        <div className="relative" style={{ width: s.ring, height: s.ring }}>
          <svg width={s.ring} height={s.ring} className="-rotate-90">
            <circle
              cx={s.ring / 2}
              cy={s.ring / 2}
              r={radius}
              fill="none"
              stroke="#1e3030"
              strokeWidth={s.strokeWidth}
            />
            <motion.circle
              cx={s.ring / 2}
              cy={s.ring / 2}
              r={radius}
              fill="none"
              stroke={color}
              strokeWidth={s.strokeWidth}
              strokeDasharray={circumference}
              initial={{ strokeDashoffset: circumference }}
              animate={{ strokeDashoffset: circumference - progress }}
              transition={{ duration: 1, ease: "easeOut" }}
              strokeLinecap="round"
            />
          </svg>
          <div
            className="absolute inset-0 flex items-center justify-center font-bold"
            style={{ fontSize: s.textSize, color }}
          >
            {score}
          </div>
        </div>
        <span className="text-xs font-medium" style={{ color }}>{label}</span>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className="inline-flex items-center gap-1.5 rounded-full font-semibold"
      style={{
        background: bg,
        color,
        padding: s.padding,
        fontSize: s.textSize,
      }}
    >
      <div
        className="w-1.5 h-1.5 rounded-full"
        style={{ background: color }}
      />
      {score}% match
    </motion.div>
  );
}
