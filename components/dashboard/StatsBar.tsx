"use client";

import { motion } from "framer-motion";
import { TrendingUp, Briefcase, MessageSquare, Target, Loader2 } from "lucide-react";
import type { DashboardStats } from "@/types";

interface StatsBarProps {
  stats?: DashboardStats;
  loading?: boolean;
}

const statConfig = [
  {
    key: "totalMatches" as const,
    label: "Total Matches",
    icon: Target,
    color: "#0d9488",
    bg: "#0d948820",
    format: (v: number) => v.toLocaleString(),
  },
  {
    key: "applied" as const,
    label: "Applied",
    icon: Briefcase,
    color: "#6366f1",
    bg: "#6366f120",
    format: (v: number) => v.toLocaleString(),
  },
  {
    key: "interviews" as const,
    label: "Interviews",
    icon: MessageSquare,
    color: "#10b981",
    bg: "#10b98122",
    format: (v: number) => v.toLocaleString(),
  },
  {
    key: "avgMatchScore" as const,
    label: "Avg Match Score",
    icon: TrendingUp,
    color: "#f59e0b",
    bg: "#f59e0b22",
    format: (v: number) => `${Math.round(v)}%`,
  },
];

export function StatsBar({ stats, loading }: StatsBarProps) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      {statConfig.map((stat, i) => (
        <motion.div
          key={stat.key}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.1 }}
          className="p-5 rounded-2xl border"
          style={{ background: "#162020", borderColor: "#1e3030" }}
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium" style={{ color: "#7a9e9c" }}>
              {stat.label}
            </span>
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: stat.bg }}
            >
              <stat.icon className="w-4 h-4" style={{ color: stat.color }} />
            </div>
          </div>
          {loading ? (
            <Loader2 className="w-5 h-5 animate-spin" style={{ color: "#7a9e9c" }} />
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-2xl font-bold"
              style={{ color: "#e0faf8", fontFamily: "'Space Grotesk', sans-serif" }}
            >
              {stats ? stat.format(stats[stat.key]) : "—"}
            </motion.div>
          )}
        </motion.div>
      ))}
    </div>
  );
}
