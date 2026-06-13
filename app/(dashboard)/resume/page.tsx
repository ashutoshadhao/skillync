"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { FileText, Star, Trash2, Loader2, Lock } from "lucide-react";
import { ResumeUploader } from "@/components/resume/ResumeUploader";
import { ParsedSkills } from "@/components/resume/ParsedSkills";
import { ResumeScoreCard } from "@/components/resume/ResumeScoreCard";
import type { Resume, ParsedResume, ResumeScoreBreakdown } from "@/types";
import { toast } from "sonner";

const MAX_RESUMES = 5;

export default function ResumePage() {
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const maxResumes = MAX_RESUMES;

  const fetchResumes = useCallback(async () => {
    try {
      const res = await fetch("/api/resumes");
      const data = await res.json();
      const list: Resume[] = data.resumes || [];
      setResumes(list);
      if (!selectedId && list.length > 0) {
        setSelectedId(list.find((r) => r.isActive)?.id ?? list[0].id);
      }
    } catch {
      toast.error("Failed to load resumes");
    } finally {
      setLoading(false);
    }
  }, [selectedId]);

  useEffect(() => {
    fetchResumes();
  }, [fetchResumes]);

  const setActive = async (id: string) => {
    const prev = resumes;
    setResumes((r) => r.map((x) => ({ ...x, isActive: x.id === id })));
    try {
      const res = await fetch("/api/resumes", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, isActive: true }),
      });
      if (!res.ok) throw new Error();
      toast.success("Active resume updated");
    } catch {
      setResumes(prev);
      toast.error("Failed to update");
    }
  };

  const deleteResume = async (id: string) => {
    if (!confirm("Delete this resume?")) return;
    setResumes((r) => r.filter((x) => x.id !== id));
    try {
      await fetch(`/api/resumes?id=${id}`, { method: "DELETE" });
      toast.success("Resume deleted");
      if (selectedId === id) setSelectedId(null);
    } catch {
      fetchResumes();
      toast.error("Delete failed");
    }
  };

  const selected = resumes.find((r) => r.id === selectedId);
  const parsedData: ParsedResume | null = selected?.parsedSkills
    ? {
        skills: selected.parsedSkills ?? [],
        jobTitles: selected.parsedTitles ?? [],
        experienceYears: selected.experienceYears ?? 0,
        education: "",
        summary: "",
      }
    : null;

  return (
    <div className="px-4 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            My Resumes
          </h1>
          <p className="text-sm mt-1 text-gray-500">
            {resumes.length}/{maxResumes} resume slots used
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: upload + list */}
        <div className="space-y-4">
          {resumes.length < maxResumes && (
            <ResumeUploader onUploaded={fetchResumes} />
          )}

          {resumes.length >= maxResumes && (
            <div
              className="rounded-2xl border-2 border-dashed p-6 flex flex-col items-center gap-2"
              style={{ borderColor: "#d1d5db", background: "#f9fafb" }}
            >
              <Lock className="w-6 h-6 text-gray-400" />
              <p className="text-sm text-center text-gray-500">
                Resume limit reached. Delete one to add another.
              </p>
            </div>
          )}

          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin" style={{ color: "#0d9488" }} />
            </div>
          ) : (
            <div className="space-y-2">
              {resumes.map((r) => (
                <motion.div
                  key={r.id}
                  layout
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  onClick={() => setSelectedId(r.id)}
                  className="p-4 rounded-xl border cursor-pointer flex items-start gap-3 transition-all"
                  style={{
                    background: selectedId === r.id ? "#f0fdf9" : "#ffffff",
                    borderColor: selectedId === r.id ? "#0d948866" : "#e5e7eb",
                  }}
                >
                  <div
                    className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                    style={{ background: r.isActive ? "#0d948820" : "#f3f4f6" }}
                  >
                    <FileText className="w-4 h-4" style={{ color: r.isActive ? "#0d9488" : "#7a9e9c" }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate text-gray-900">
                      {r.label || "Untitled Resume"}
                    </p>
                    <p className="text-xs text-gray-500">
                      {r.experienceYears ? `${r.experienceYears} yrs exp` : ""}
                      {r.parsedSkills?.length ? ` · ${r.parsedSkills.length} skills` : ""}
                    </p>
                    {r.isActive && (
                      <span
                        className="inline-block mt-1 px-1.5 py-0.5 rounded text-xs font-medium"
                        style={{ background: "#10b98122", color: "#10b981" }}
                      >
                        Active
                      </span>
                    )}
                  </div>
                  <div className="flex flex-col gap-1">
                    {!r.isActive && (
                      <button
                        onClick={(e) => { e.stopPropagation(); setActive(r.id); }}
                        title="Set as active"
                        className="p-1 rounded hover:bg-yellow-400/10"
                      >
                        <Star className="w-3.5 h-3.5" style={{ color: "#f59e0b" }} />
                      </button>
                    )}
                    <button
                      onClick={(e) => { e.stopPropagation(); deleteResume(r.id); }}
                      title="Delete"
                      className="p-1 rounded hover:bg-red-500/10"
                    >
                      <Trash2 className="w-3.5 h-3.5" style={{ color: "#f43f5e" }} />
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>

        {/* Right: parsed view */}
        <div className="lg:col-span-2">
          {selected && parsedData ? (
            <motion.div
              key={selected.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                  {selected.label || "Resume Preview"}
                </h2>
                {selected.fileUrl && (
                  <a
                    href={selected.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs px-3 py-1.5 rounded-lg font-medium"
                    style={{ background: "#f3f4f6", color: "#374151", border: "1px solid #e5e7eb" }}
                  >
                    View PDF
                  </a>
                )}
              </div>
              <ResumeScoreCard
                score={selected.resumeScore ?? null}
                breakdown={(selected.scoreBreakdown as ResumeScoreBreakdown | null) ?? null}
              />
              <ParsedSkills parsed={parsedData} />
            </motion.div>
          ) : !loading && resumes.length === 0 ? (
            <div
              className="rounded-2xl p-10 flex flex-col items-center gap-3"
              style={{ background: "#f9fafb", border: "1px solid #e5e7eb" }}
            >
              <FileText className="w-10 h-10 text-gray-300" />
              <p className="text-sm text-gray-400">
                Upload your first resume to get started
              </p>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
