import { useQuery } from "@tanstack/react-query";
import type { Resume } from "@/types";

interface ResumesResponse {
  resumes: Resume[];
}

export function useResumes() {
  return useQuery<ResumesResponse>({
    queryKey: ["resumes"],
    queryFn: async () => {
      const res = await fetch("/api/resumes");
      if (!res.ok) throw new Error("Failed to fetch resumes");
      return res.json();
    },
    staleTime: 120_000,
  });
}

export function useActiveResume() {
  const { data, ...rest } = useResumes();
  const activeResume = data?.resumes.find((r) => r.isActive) ?? data?.resumes[0] ?? null;
  return { activeResume, ...rest };
}
