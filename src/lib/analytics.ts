// Aggregations for the Analytics page + dashboard, derived from the ranking.
import "server-only";
import { getRanked } from "./store";
import { RankedCandidate } from "@/types";

export interface Analytics {
  total: number;
  shortlisted: number;
  honeypots: number;
  avgScore: number;
  recommendations: { name: string; value: number }[];
  scoreDistribution: { bucket: string; count: number }[];
  topSkills: { skill: string; count: number }[];
  missingSkills: { skill: string; coverage: number }[];
  experienceBands: { band: string; count: number }[];
  funnel: { stage: string; count: number }[];
  componentAverages: { component: string; value: number }[];
  topIndustries: { name: string; value: number }[];
}

const REQUIRED = ["embeddings", "vector db", "ranking", "evaluation", "nlp", "python", "llm"];

export function computeAnalytics(): Analytics {
  const ranked = getRanked();
  const top100 = ranked.slice(0, 100);
  const total = ranked.length;

  const recCount = new Map<string, number>();
  for (const r of ranked) recCount.set(r.explanation.recommendation, (recCount.get(r.explanation.recommendation) ?? 0) + 1);
  const recommendations = ["Strong Hire", "Interview", "Maybe", "Pass"].map((name) => ({ name, value: recCount.get(name) ?? 0 }));

  const buckets = [0, 0.2, 0.4, 0.6, 0.8, 1.01];
  const labels = ["0–20", "20–40", "40–60", "60–80", "80–100"];
  const scoreDistribution = labels.map((bucket, i) => ({
    bucket,
    count: ranked.filter((r) => r.score >= buckets[i] && r.score < buckets[i + 1]).length,
  }));

  const skillFreq = new Map<string, number>();
  for (const r of top100) {
    for (const s of r.candidate.skills) {
      if (s.proficiency === "advanced" || s.proficiency === "expert") {
        skillFreq.set(s.name, (skillFreq.get(s.name) ?? 0) + 1);
      }
    }
  }
  const topSkills = [...skillFreq.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12).map(([skill, count]) => ({ skill, count }));

  const missingSkills = [
    { skill: "Vector DB / FAISS", key: "vectorDbExperience" },
    { skill: "Embeddings & Retrieval", key: "requiredSkillCoverage" },
    { skill: "Ranking Evaluation", key: "skillMatch" },
    { skill: "LLM / Fine-tuning", key: "aiLlmExperience" },
    { skill: "RAG", key: "ragExperience" },
  ].map(({ skill, key }) => ({
    skill,
    coverage: Math.round(
      (top100.filter((r) => (r.features as unknown as Record<string, number>)[key] >= 0.5).length / Math.max(1, top100.length)) * 100
    ),
  }));

  const expBands = [
    { band: "0–3", lo: 0, hi: 3 }, { band: "3–5", lo: 3, hi: 5 }, { band: "5–7", lo: 5, hi: 7 },
    { band: "7–9", lo: 7, hi: 9 }, { band: "9–12", lo: 9, hi: 12 }, { band: "12+", lo: 12, hi: 100 },
  ];
  const experienceBands = expBands.map(({ band, lo, hi }) => ({
    band, count: top100.filter((r) => r.candidate.profile.years_of_experience >= lo && r.candidate.profile.years_of_experience < hi).length,
  }));

  const funnel = [
    { stage: "Pool sourced", count: total },
    { stage: "Passed honeypot filter", count: ranked.filter((r) => !r.isHoneypot).length },
    { stage: "Score ≥ 0.42 (Maybe+)", count: ranked.filter((r) => r.score >= 0.42).length },
    { stage: "Interview+", count: ranked.filter((r) => r.score >= 0.6).length },
    { stage: "Strong Hire", count: ranked.filter((r) => r.score >= 0.78).length },
  ];

  const compKeys: (keyof RankedCandidate["components"])[] = ["semantic", "skills", "experience", "education", "stability", "cultureFit", "behavioral"];
  const componentAverages = compKeys.map((c) => ({
    component: c === "cultureFit" ? "Culture Fit" : c.charAt(0).toUpperCase() + c.slice(1),
    value: Math.round(top100.reduce((a, r) => a + r.components[c], 0) / Math.max(1, top100.length)),
  }));

  const indFreq = new Map<string, number>();
  for (const r of top100) {
    const ind = r.candidate.profile.current_industry || "Other";
    indFreq.set(ind, (indFreq.get(ind) ?? 0) + 1);
  }
  const topIndustries = [...indFreq.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6).map(([name, value]) => ({ name, value }));

  return {
    total,
    shortlisted: Math.min(100, total),
    honeypots: ranked.filter((r) => r.isHoneypot).length,
    avgScore: ranked.reduce((a, r) => a + r.score, 0) / Math.max(1, total),
    recommendations, scoreDistribution, topSkills, missingSkills,
    experienceBands, funnel, componentAverages, topIndustries,
  };
}
