"use client";

import { Search, MapPin, Wifi, SlidersHorizontal } from "lucide-react";
import { Input } from "@/components/ui/input";

interface FilterBarProps {
  keyword: string;
  setKeyword: (v: string) => void;
  location: string;
  setLocation: (v: string) => void;
  remote: boolean;
  setRemote: (v: boolean) => void;
  minScore: number;
  setMinScore: (v: number) => void;
}

export function FilterBar({
  keyword, setKeyword,
  location, setLocation,
  remote, setRemote,
  minScore, setMinScore,
}: FilterBarProps) {
  return (
    <div
      className="flex flex-wrap gap-3 items-center p-4 rounded-2xl border mb-6"
      style={{ background: "#162020", borderColor: "#1e3030" }}
    >
      {/* Search */}
      <div className="relative flex-1 min-w-[160px]">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "#7a9e9c" }} />
        <Input
          placeholder="Role or company..."
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          className="pl-9 border-[#1e3030] bg-[#162020] text-[#e0faf8] placeholder:text-[#4a6e6c] h-9"
        />
      </div>

      {/* Location */}
      <div className="relative min-w-[140px]">
        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "#7a9e9c" }} />
        <Input
          placeholder="Location..."
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          className="pl-9 border-[#1e3030] bg-[#162020] text-[#e0faf8] placeholder:text-[#4a6e6c] h-9"
        />
      </div>

      {/* Min Score */}
      <div className="flex items-center gap-2">
        <SlidersHorizontal className="w-4 h-4" style={{ color: "#7a9e9c" }} />
        <select
          value={minScore}
          onChange={(e) => setMinScore(Number(e.target.value))}
          className="h-9 rounded-lg border px-2 text-sm"
          style={{
            background: "#162020",
            borderColor: "#1e3030",
            color: "#e0faf8",
          }}
        >
          <option value={0}>All scores</option>
          <option value={60}>60%+ match</option>
          <option value={70}>70%+ match</option>
          <option value={80}>80%+ match</option>
          <option value={90}>90%+ match</option>
        </select>
      </div>

      {/* Remote toggle */}
      <button
        onClick={() => setRemote(!remote)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all border"
        style={{
          background: remote ? "#0d948820" : "#162020",
          borderColor: remote ? "#0d9488" : "#1e3030",
          color: remote ? "#2dd4bf" : "#7a9e9c",
        }}
      >
        <Wifi className="w-4 h-4" />
        Remote
      </button>
    </div>
  );
}
