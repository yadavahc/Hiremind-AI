"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { parseJobDescription } from "@/lib/jd-parser";
import { setActiveJob, getJob } from "@/lib/store";
import type { JobDescription } from "@/types";

const schema = z.object({
  title: z.string().min(2).max(160).optional(),
  company: z.string().max(120).optional(),
  location: z.string().max(120).optional(),
  text: z.string().min(40, "Job description text is too short to analyze."),
});

export interface AnalyzeResult {
  ok: boolean;
  error?: string;
  job?: JobDescription;
  topPreview?: { id: string; name: string; title: string; score: number }[];
}

export async function analyzeAndRank(input: {
  title?: string; company?: string; location?: string; text: string;
}): Promise<AnalyzeResult> {
  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }
  const { title, company, location, text } = parsed.data;

  const parsedJob = parseJobDescription(text);
  const job: JobDescription = {
    id: `job_${Date.now()}`,
    title: title?.trim() || inferTitle(text),
    company: company?.trim() || "Your Company",
    location: location?.trim() || (parsedJob.behavioralRequirements.preferRelocateOrLocal[0] ?? "Remote"),
    experienceRequired: `${parsedJob.minYears}–${parsedJob.maxYears} years`,
    rawText: text,
    parsed: parsedJob,
  };

  const state = setActiveJob(job);
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/candidates");
  revalidatePath("/dashboard/analytics");

  return {
    ok: true,
    job,
    topPreview: state.ranked.slice(0, 5).map((r) => ({
      id: r.candidate.candidate_id,
      name: r.candidate.profile.anonymized_name,
      title: r.candidate.profile.current_title,
      score: r.score,
    })),
  };
}

/** Restore the bundled Senior AI Engineer JD. */
export async function loadOfficialJob(): Promise<AnalyzeResult> {
  const current = getJob();
  // getJob loads data/job.json on first access; re-set it as active to recompute.
  const state = setActiveJob(current);
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/candidates");
  return {
    ok: true,
    job: current,
    topPreview: state.ranked.slice(0, 5).map((r) => ({
      id: r.candidate.candidate_id,
      name: r.candidate.profile.anonymized_name,
      title: r.candidate.profile.current_title,
      score: r.score,
    })),
  };
}

function inferTitle(text: string): string {
  const line = text.split(/\n/).map((l) => l.trim()).find((l) => l.length > 0) ?? "Open Role";
  return line.replace(/^job\s*(description|title)\s*[:\-]?\s*/i, "").slice(0, 80) || "Open Role";
}
