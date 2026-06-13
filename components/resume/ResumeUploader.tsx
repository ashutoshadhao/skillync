"use client";

import { useCallback, useState } from "react";
import { Upload, Loader2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

interface Props {
  onUploaded: () => void;
}

export function ResumeUploader({ onUploaded }: Props) {
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);

  const handleFile = useCallback(
    async (file: File) => {
      if (file.type !== "application/pdf") {
        toast.error("Only PDF files are accepted");
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        toast.error("File must be under 5 MB");
        return;
      }
      setUploading(true);
      const formData = new FormData();
      formData.append("file", file);
      try {
        const res = await fetch("/api/resume/upload", { method: "POST", body: formData });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Upload failed");
        toast.success("Resume uploaded and parsed!");
        onUploaded();
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : "Upload failed");
      } finally {
        setUploading(false);
      }
    },
    [onUploaded]
  );

  const onDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
      className="relative rounded-2xl border-2 border-dashed transition-all p-10 flex flex-col items-center gap-4 cursor-pointer"
      style={{
        borderColor: dragging ? "#0d9488" : "#1e3030",
        background: dragging ? "#0d948811" : "#162020",
      }}
    >
      <input
        type="file"
        accept="application/pdf"
        className="absolute inset-0 opacity-0 cursor-pointer"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
        }}
      />

      {uploading ? (
        <>
          <Loader2 className="w-10 h-10 animate-spin" style={{ color: "#0d9488" }} />
          <p className="text-sm font-medium" style={{ color: "#e0faf8" }}>
            Parsing resume with AI…
          </p>
        </>
      ) : (
        <>
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center"
            style={{ background: "#0d948820" }}
          >
            <Upload className="w-7 h-7" style={{ color: "#0d9488" }} />
          </div>
          <div className="text-center">
            <p className="font-semibold" style={{ color: "#e0faf8" }}>
              Drop your PDF resume here
            </p>
            <p className="text-sm mt-1" style={{ color: "#7a9e9c" }}>
              or click to browse · Max 5 MB
            </p>
          </div>
        </>
      )}
    </div>
  );
}
