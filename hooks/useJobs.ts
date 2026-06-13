import { useQuery } from "@tanstack/react-query";
import type { JobListing, JobMatch } from "@/types";

export interface JobWithMatch extends JobListing {
  matchScore?: number;
  matchedSkills?: string[];
  missingSkills?: string[];
  reasoning?: string;
}

interface UseJobsParams {
  keyword?: string;
  location?: string;
  minScore?: number;
  remote?: boolean;
  page?: number;
}

interface JobsResponse {
  jobs: JobWithMatch[];
  total: number;
  page: number;
  totalPages: number;
}

export function useJobs(params: UseJobsParams = {}) {
  const query = new URLSearchParams();
  if (params.keyword) query.set("keyword", params.keyword);
  if (params.location) query.set("location", params.location);
  if (params.minScore !== undefined) query.set("minScore", String(params.minScore));
  if (params.remote) query.set("remote", "true");
  if (params.page) query.set("page", String(params.page));

  return useQuery<JobsResponse>({
    queryKey: ["jobs", params],
    queryFn: async () => {
      const res = await fetch(`/api/jobs?${query.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch jobs");
      return res.json();
    },
    staleTime: 60_000,
  });
}
