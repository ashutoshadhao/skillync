"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FileText, X, ArrowRight } from "lucide-react";
import Link from "next/link";

export function ResumePromptBanner() {
  const [show, setShow] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    fetch("/api/resumes")
      .then((r) => r.json())
      .then((data) => {
        const hasResume = (data.resumes?.length ?? 0) > 0;
        if (!hasResume) setShow(true);
      })
      .catch(() => {});
  }, []);

  if (!show || dismissed) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -12 }}
        className="flex items-center justify-between gap-4 px-5 py-3.5 rounded-2xl border border-teal-200 bg-teal-50 mb-6"
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 bg-teal-100">
            <FileText className="w-4 h-4 text-teal-600" />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900">
              Upload your resume to unlock AI job matching
            </p>
            <p className="text-xs mt-0.5 text-teal-700">
              We'll score every job against your skills automatically — takes 30 seconds.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Link
            href="/resume"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-teal-600 hover:bg-teal-700 transition-colors"
          >
            Upload Resume <ArrowRight className="w-3.5 h-3.5" />
          </Link>
          <button
            onClick={() => setDismissed(true)}
            className="p-1.5 rounded-lg transition-colors text-gray-400 hover:bg-teal-100 hover:text-gray-600"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
