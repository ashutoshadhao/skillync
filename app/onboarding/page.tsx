"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, FileText, Briefcase, MapPin, DollarSign, Wifi, CheckCircle2, Loader2, Zap } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const STEPS = ["Upload Resume", "Set Preferences", "Finding Matches"];

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [prefs, setPrefs] = useState({
    role: "",
    location: "",
    salaryMin: "",
    remoteOnly: false,
  });

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const f = e.dataTransfer.files[0];
    if (f?.type === "application/pdf") setFile(f);
    else toast.error("Please upload a PDF file");
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f?.type === "application/pdf") setFile(f);
    else toast.error("Please upload a PDF file");
  };

  const handleUpload = async () => {
    if (!file) return toast.error("Please select a PDF resume");
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("label", "My Resume");

      const res = await fetch("/api/resume/upload", { method: "POST", body: formData });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error);

      toast.success("Resume uploaded and parsed!");
      setStep(1);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Upload failed";
      toast.error(message);
    } finally {
      setUploading(false);
    }
  };

  const handlePrefsSubmit = async () => {
    // Save alert based on preferences
    if (prefs.role) {
      await fetch("/api/alerts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          keywords: [prefs.role],
          location: prefs.location || "India",
          salaryMin: prefs.salaryMin ? parseInt(prefs.salaryMin) * 100000 : null,
          remoteOnly: prefs.remoteOnly,
          frequency: "daily",
        }),
      });
    }
    setStep(2);
    setTimeout(() => router.push("/dashboard"), 3000);
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center px-6"
      style={{ background: "#080d0d" }}
    >
      <div className="w-full max-w-lg">
        {/* Logo */}
        <div className="flex items-center gap-2 justify-center mb-12">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "linear-gradient(135deg, #0d9488, #6366f1)" }}>
            <Zap className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-xl" style={{ color: "#e0faf8", fontFamily: "'Space Grotesk', sans-serif" }}>Skillync</span>
        </div>

        {/* Step indicator */}
        <div className="flex items-center justify-center gap-4 mb-10">
          {STEPS.map((s, i) => (
            <div key={i} className="flex items-center gap-2">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-all"
                style={{
                  background: i < step ? "#0d9488" : i === step ? "linear-gradient(135deg, #0d9488, #6366f1)" : "#162020",
                  color: i <= step ? "#fff" : "#7a9e9c",
                  border: i === step ? "none" : `1px solid ${i < step ? "#0d9488" : "#1e3030"}`,
                }}
              >
                {i < step ? <CheckCircle2 className="w-4 h-4" /> : i + 1}
              </div>
              {i < STEPS.length - 1 && (
                <div className="w-12 h-px" style={{ background: i < step ? "#0d9488" : "#1e3030" }} />
              )}
            </div>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {/* Step 0: Upload Resume */}
          {step === 0 && (
            <motion.div
              key="step0"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="p-8 rounded-2xl border"
              style={{ background: "#162020", borderColor: "#1e3030" }}
            >
              <h2 className="text-2xl font-bold mb-2" style={{ color: "#e0faf8", fontFamily: "'Space Grotesk', sans-serif" }}>
                Upload your resume
              </h2>
              <p className="mb-6 text-sm" style={{ color: "#7a9e9c" }}>
                We'll use Gemini AI to extract your skills and match you with jobs
              </p>

              {/* Drop zone */}
              <div
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                className="border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-all"
                style={{
                  borderColor: isDragging ? "#0d9488" : file ? "#10b981" : "#1e3030",
                  background: isDragging ? "#0d948811" : file ? "#10b98111" : "#0d1515",
                }}
                onClick={() => document.getElementById("resume-input")?.click()}
              >
                <input
                  id="resume-input"
                  type="file"
                  accept=".pdf"
                  className="hidden"
                  onChange={handleFileChange}
                />
                {file ? (
                  <div>
                    <FileText className="w-12 h-12 mx-auto mb-3" style={{ color: "#10b981" }} />
                    <p className="font-medium" style={{ color: "#10b981" }}>{file.name}</p>
                    <p className="text-sm mt-1" style={{ color: "#7a9e9c" }}>
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                ) : (
                  <div>
                    <Upload className="w-12 h-12 mx-auto mb-3" style={{ color: "#7a9e9c" }} />
                    <p className="font-medium" style={{ color: "#e0faf8" }}>
                      Drop your PDF here
                    </p>
                    <p className="text-sm mt-1" style={{ color: "#7a9e9c" }}>
                      or click to browse — max 5MB
                    </p>
                  </div>
                )}
              </div>

              <Button
                onClick={handleUpload}
                disabled={!file || uploading}
                className="w-full mt-6 h-12 text-base font-semibold text-white"
                style={{ background: "linear-gradient(135deg, #0d9488, #6366f1)" }}
              >
                {uploading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Parsing with Gemini AI...
                  </>
                ) : (
                  "Upload & Parse Resume"
                )}
              </Button>
            </motion.div>
          )}

          {/* Step 1: Preferences */}
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="p-8 rounded-2xl border"
              style={{ background: "#162020", borderColor: "#1e3030" }}
            >
              <h2 className="text-2xl font-bold mb-2" style={{ color: "#e0faf8", fontFamily: "'Space Grotesk', sans-serif" }}>
                Set your preferences
              </h2>
              <p className="mb-6 text-sm" style={{ color: "#7a9e9c" }}>
                Help us find the most relevant jobs for you
              </p>

              <div className="space-y-5">
                <div>
                  <Label className="text-sm font-medium mb-1.5 block" style={{ color: "#e0faf8" }}>
                    <Briefcase className="inline w-4 h-4 mr-1.5" style={{ color: "#0d9488" }} />
                    Desired Role
                  </Label>
                  <Input
                    placeholder="e.g. Frontend Developer, Data Scientist"
                    value={prefs.role}
                    onChange={(e) => setPrefs({ ...prefs, role: e.target.value })}
                    className="border-[#1e3030] bg-[#162020] text-[#e0faf8] placeholder:text-[#4a6e6c]"
                  />
                </div>
                <div>
                  <Label className="text-sm font-medium mb-1.5 block" style={{ color: "#e0faf8" }}>
                    <MapPin className="inline w-4 h-4 mr-1.5" style={{ color: "#6366f1" }} />
                    Preferred Location
                  </Label>
                  <Input
                    placeholder="e.g. Bangalore, Mumbai, Remote"
                    value={prefs.location}
                    onChange={(e) => setPrefs({ ...prefs, location: e.target.value })}
                    className="border-[#1e3030] bg-[#162020] text-[#e0faf8] placeholder:text-[#4a6e6c]"
                  />
                </div>
                <div>
                  <Label className="text-sm font-medium mb-1.5 block" style={{ color: "#e0faf8" }}>
                    <DollarSign className="inline w-4 h-4 mr-1.5" style={{ color: "#f59e0b" }} />
                    Minimum Salary (LPA)
                  </Label>
                  <Input
                    type="number"
                    placeholder="e.g. 8"
                    value={prefs.salaryMin}
                    onChange={(e) => setPrefs({ ...prefs, salaryMin: e.target.value })}
                    className="border-[#1e3030] bg-[#162020] text-[#e0faf8] placeholder:text-[#4a6e6c]"
                  />
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setPrefs({ ...prefs, remoteOnly: !prefs.remoteOnly })}
                    className="w-11 h-6 rounded-full transition-all relative"
                    style={{ background: prefs.remoteOnly ? "#0d9488" : "#1e3030" }}
                  >
                    <div
                      className="w-4 h-4 rounded-full bg-white absolute top-1 transition-all"
                      style={{ left: prefs.remoteOnly ? "calc(100% - 20px)" : "4px" }}
                    />
                  </button>
                  <div className="flex items-center gap-1.5 text-sm" style={{ color: "#e0faf8" }}>
                    <Wifi className="w-4 h-4" style={{ color: "#0d9488" }} />
                    Remote only
                  </div>
                </div>
              </div>

              <Button
                onClick={handlePrefsSubmit}
                className="w-full mt-8 h-12 text-base font-semibold text-white"
                style={{ background: "linear-gradient(135deg, #0d9488, #6366f1)" }}
              >
                Find My Matches
              </Button>
            </motion.div>
          )}

          {/* Step 2: Loading */}
          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="p-12 rounded-2xl border text-center"
              style={{ background: "#162020", borderColor: "#1e3030" }}
            >
              <div className="relative w-24 h-24 mx-auto mb-8">
                <div
                  className="absolute inset-0 rounded-full animate-ping"
                  style={{ background: "#0d948820" }}
                />
                <div
                  className="w-24 h-24 rounded-full flex items-center justify-center relative"
                  style={{ background: "linear-gradient(135deg, #0d948830, #6366f130)", border: "1px solid #0d9488" }}
                >
                  <Zap className="w-10 h-10" style={{ color: "#0d9488" }} />
                </div>
              </div>
              <h2 className="text-2xl font-bold mb-3" style={{ color: "#e0faf8", fontFamily: "'Space Grotesk', sans-serif" }}>
                Finding your matches...
              </h2>
              <p style={{ color: "#7a9e9c" }}>
                AI is scanning thousands of jobs based on your profile
              </p>
              <div className="flex justify-center gap-1.5 mt-6">
                {[0, 0.15, 0.3].map((delay) => (
                  <div
                    key={delay}
                    className="w-2 h-2 rounded-full animate-bounce"
                    style={{ background: "#0d9488", animationDelay: `${delay}s` }}
                  />
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
