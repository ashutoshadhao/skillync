"use client";

import { CheckCircle2 } from "lucide-react";
import type { ParsedResume, ParsedExperience } from "@/types";

interface Props {
  parsed: ParsedResume;
}

export function ParsedSkills({ parsed }: Props) {
  const sections: { label: string; items: string[]; color: string }[] = [
    { label: "Skills", items: parsed.skills || [], color: "#0d9488" },
    { label: "Languages", items: parsed.languages || [], color: "#6366f1" },
    { label: "Certifications", items: parsed.certifications || [], color: "#10b981" },
  ];

  return (
    <div className="space-y-4">
      {parsed.summary && (
        <div
          className="rounded-xl p-4"
          style={{ background: "#162020", border: "1px solid #1e3030" }}
        >
          <p className="text-xs uppercase tracking-wider font-semibold mb-2" style={{ color: "#7a9e9c" }}>
            Summary
          </p>
          <p className="text-sm leading-relaxed" style={{ color: "#e0faf8" }}>
            {parsed.summary}
          </p>
        </div>
      )}

      {parsed.experience && parsed.experience.length > 0 && (
        <div
          className="rounded-xl p-4 space-y-3"
          style={{ background: "#162020", border: "1px solid #1e3030" }}
        >
          <p className="text-xs uppercase tracking-wider font-semibold" style={{ color: "#7a9e9c" }}>
            Experience
          </p>
          {parsed.experience.map((exp: ParsedExperience, i: number) => (
            <div key={i} className="border-l-2 pl-3" style={{ borderColor: "#0d948840" }}>
              <p className="text-sm font-medium" style={{ color: "#e0faf8" }}>
                {exp.title} · {exp.company}
              </p>
              <p className="text-xs" style={{ color: "#7a9e9c" }}>
                {exp.duration}
              </p>
              {exp.highlights && exp.highlights.length > 0 && (
                <ul className="mt-1 space-y-0.5">
                  {exp.highlights.slice(0, 3).map((h: string, j: number) => (
                    <li key={j} className="flex items-start gap-1.5 text-xs" style={{ color: "#7a9e9c" }}>
                      <CheckCircle2 className="w-3 h-3 mt-0.5 shrink-0" style={{ color: "#0d9488" }} />
                      {h}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      )}

      {sections.map((sec) =>
        sec.items.length > 0 ? (
          <div
            key={sec.label}
            className="rounded-xl p-4"
            style={{ background: "#162020", border: "1px solid #1e3030" }}
          >
            <p className="text-xs uppercase tracking-wider font-semibold mb-2" style={{ color: "#7a9e9c" }}>
              {sec.label}
            </p>
            <div className="flex flex-wrap gap-2">
              {sec.items.map((item) => (
                <span
                  key={item}
                  className="px-2.5 py-1 rounded-full text-xs font-medium"
                  style={{ background: `${sec.color}22`, color: sec.color, border: `1px solid ${sec.color}44` }}
                >
                  {item}
                </span>
              ))}
            </div>
          </div>
        ) : null
      )}
    </div>
  );
}
