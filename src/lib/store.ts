// ============================================================================
// Server-side data store (memoized)
// ----------------------------------------------------------------------------
// Loads the sampled candidate pool + active job from /data, runs the ranking
// engine once, and caches the result for the process. This is the backbone of
// every read page — it means the platform works immediately after
// `npm install && npm run dev` with no DB seed required. Uploading a new JD
// swaps the active job and recomputes the ranking in place.
// ============================================================================

import "server-only";
import fs from "node:fs";
import path from "node:path";
import { Candidate, JobDescription, RankedCandidate } from "@/types";
import { rankCandidates } from "./ranking";

interface StoreState {
  candidates: Candidate[];
  job: JobDescription;
  ranked: RankedCandidate[];
  rankedById: Map<string, RankedCandidate>;
  computedAt: number;
}

const g = globalThis as unknown as { __hiremind?: StoreState };

function loadCandidates(): Candidate[] {
  const p = path.resolve(process.cwd(), "data", "candidates.sample.json");
  const raw = JSON.parse(fs.readFileSync(p, "utf-8")) as Candidate[];
  return raw;
}

function loadJob(): JobDescription {
  const p = path.resolve(process.cwd(), "data", "job.json");
  return JSON.parse(fs.readFileSync(p, "utf-8")) as JobDescription;
}

function compute(candidates: Candidate[], job: JobDescription): StoreState {
  const ranked = rankCandidates(candidates, job);
  return {
    candidates, job, ranked,
    rankedById: new Map(ranked.map((r) => [r.candidate.candidate_id, r])),
    computedAt: Date.now(),
  };
}

function getState(): StoreState {
  if (!g.__hiremind) {
    const candidates = loadCandidates();
    const job = loadJob();
    g.__hiremind = compute(candidates, job);
  }
  return g.__hiremind;
}

/** Replace the active job and recompute the ranking (used by Upload JD). */
export function setActiveJob(job: JobDescription): StoreState {
  const candidates = g.__hiremind?.candidates ?? loadCandidates();
  g.__hiremind = compute(candidates, job);
  return g.__hiremind;
}

export function getJob(): JobDescription {
  return getState().job;
}

export function getRanked(): RankedCandidate[] {
  return getState().ranked;
}

export function getRankedById(id: string): RankedCandidate | undefined {
  return getState().rankedById.get(id);
}

export function getCandidates(): Candidate[] {
  return getState().candidates;
}

export interface RankedQuery {
  search?: string;
  recommendation?: string;
  minScore?: number;
  hideHoneypots?: boolean;
  sort?: "rank" | "score" | "experience" | "confidence";
  dir?: "asc" | "desc";
  page?: number;
  pageSize?: number;
}

export function queryRanked(q: RankedQuery = {}) {
  let rows = getRanked();
  const { search, recommendation, minScore, hideHoneypots, sort = "rank", dir = "asc", page = 1, pageSize = 12 } = q;

  if (search) {
    const s = search.toLowerCase();
    rows = rows.filter((r) =>
      r.candidate.profile.anonymized_name.toLowerCase().includes(s) ||
      r.candidate.profile.current_title.toLowerCase().includes(s) ||
      r.candidate.candidate_id.toLowerCase().includes(s) ||
      r.candidate.skills.some((sk) => sk.name.toLowerCase().includes(s))
    );
  }
  if (recommendation && recommendation !== "all") {
    rows = rows.filter((r) => r.explanation.recommendation === recommendation);
  }
  if (typeof minScore === "number") rows = rows.filter((r) => r.score >= minScore);
  if (hideHoneypots) rows = rows.filter((r) => !r.isHoneypot);

  const mult = dir === "asc" ? 1 : -1;
  rows = [...rows].sort((a, b) => {
    switch (sort) {
      case "score": return (a.score - b.score) * mult;
      case "experience": return (a.candidate.profile.years_of_experience - b.candidate.profile.years_of_experience) * mult;
      case "confidence": return (a.confidence - b.confidence) * mult;
      default: return (a.rank - b.rank) * mult;
    }
  });

  const total = rows.length;
  const start = (page - 1) * pageSize;
  return { rows: rows.slice(start, start + pageSize), total, page, pageSize, pages: Math.ceil(total / pageSize) };
}
