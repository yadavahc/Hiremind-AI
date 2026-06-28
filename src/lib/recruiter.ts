// ============================================================================
// AI Recruiter — natural-language interface over the ranked pool.
// Retrieves relevant candidates deterministically (so answers stay grounded),
// then either composes a local answer or hands a compact, grounded context to
// Gemini. Never invents candidates that aren't in the pool.
// ============================================================================
import "server-only";
import { getRanked, getJob } from "./store";
import { normalize } from "./ontology";
import { RankedCandidate } from "@/types";

export interface RecruiterReply {
  answer: string;
  candidates: { id: string; name: string; title: string; rank: number; score: number; recommendation: string }[];
  usedGemini: boolean;
}

interface Intent {
  kind: "why" | "compare" | "search";
  ids: string[];
  terms: string[];
  wantTitle?: string;
}

function parseIntent(q: string): Intent {
  const lower = normalize(q);
  const ids = (q.match(/CAND_\d{7}/gi) ?? []).map((s) => s.toUpperCase());
  let kind: Intent["kind"] = "search";
  if (/\bwhy\b/.test(lower) || /ranked (first|top|#?1|number one)/.test(lower)) kind = "why";
  if (/\bcompare\b|\bvs\b|\bversus\b|difference between/.test(lower)) kind = "compare";

  const TITLE_HINTS = ["backend", "frontend", "full stack", "data scientist", "data engineer", "ml engineer", "ai engineer", "search engineer", "software engineer", "devops", "analyst"];
  const wantTitle = TITLE_HINTS.find((t) => lower.includes(t));

  const TERMS = ["llm", "rag", "embedding", "embeddings", "vector", "faiss", "ranking", "retrieval", "nlp", "python", "pytorch", "fine-tuning", "lora", "open source", "github", "startup", "leadership", "kafka", "spark", "recommendation"];
  const terms = TERMS.filter((t) => lower.includes(t));
  return { kind, ids, terms, wantTitle };
}

function matchScore(r: RankedCandidate, intent: Intent): number {
  const text = normalize(
    `${r.candidate.profile.current_title} ${r.candidate.profile.headline} ${r.candidate.skills.map((s) => s.name).join(" ")} ${r.candidate.career_history.map((h) => h.title + " " + h.description).join(" ")}`
  );
  let s = 0;
  if (intent.wantTitle && text.includes(intent.wantTitle)) s += 3;
  for (const t of intent.terms) if (text.includes(t)) s += 1.5;
  // bias toward already well-ranked candidates
  s += r.score * 2;
  return s;
}

export function retrieve(query: string, limit = 5): { intent: Intent; hits: RankedCandidate[] } {
  const ranked = getRanked();
  const intent = parseIntent(query);

  if (intent.ids.length) {
    const byId = new Map(ranked.map((r) => [r.candidate.candidate_id, r]));
    const hits = intent.ids.map((id) => byId.get(id)).filter(Boolean) as RankedCandidate[];
    if (hits.length) return { intent, hits };
  }
  if (intent.kind === "why" && !intent.terms.length && !intent.wantTitle) {
    return { intent, hits: ranked.slice(0, 1) };
  }
  const scored = ranked
    .map((r) => ({ r, s: matchScore(r, intent) }))
    .sort((a, b) => b.s - a.s)
    .slice(0, limit)
    .map((x) => x.r);
  return { intent, hits: scored };
}

/** Deterministic, grounded answer (also the no-API-key fallback). */
export function localAnswer(query: string): RecruiterReply {
  const { intent, hits } = retrieve(query);
  const job = getJob();
  const chips = hits.map((r) => ({
    id: r.candidate.candidate_id, name: r.candidate.profile.anonymized_name,
    title: r.candidate.profile.current_title, rank: r.rank, score: r.score,
    recommendation: r.explanation.recommendation,
  }));

  if (hits.length === 0) {
    return { answer: `I couldn't find candidates matching that in the current pool ranked against "${job.title}". Try naming a skill (e.g. "LLM", "vector DB") or a role (e.g. "data engineer").`, candidates: [], usedGemini: false };
  }

  if (intent.kind === "compare" && hits.length >= 2) {
    const [a, b] = hits;
    const answer =
      `**${a.candidate.profile.anonymized_name}** (rank #${a.rank}, ${a.score.toFixed(2)}) vs **${b.candidate.profile.anonymized_name}** (rank #${b.rank}, ${b.score.toFixed(2)}).\n\n` +
      `${a.candidate.profile.anonymized_name} — ${a.reasoning}\n\n` +
      `${b.candidate.profile.anonymized_name} — ${b.reasoning}\n\n` +
      `Net: ${a.score >= b.score ? a.candidate.profile.anonymized_name : b.candidate.profile.anonymized_name} edges ahead, mainly on stronger core-requirement evidence and engagement signals.`;
    return { answer, candidates: chips, usedGemini: false };
  }

  if (intent.kind === "why") {
    const r = hits[0];
    const answer =
      `**${r.candidate.profile.anonymized_name}** is ranked #${r.rank} (score ${r.score.toFixed(2)}, ${r.confidence}% confidence).\n\n` +
      `${r.explanation.summary}\n\n` +
      `**Strengths:** ${r.explanation.strengths.slice(0, 3).join("; ")}.\n` +
      `**Concerns:** ${r.explanation.weaknesses.slice(0, 2).join("; ")}.\n\n` +
      `${r.explanation.whyAboveOthers}`;
    return { answer, candidates: chips, usedGemini: false };
  }

  const lead = intent.wantTitle || intent.terms[0] || "your query";
  const lines = hits.map((r, i) =>
    `${i + 1}. **${r.candidate.profile.anonymized_name}** — ${r.candidate.profile.current_title}, ${r.candidate.profile.years_of_experience}y (rank #${r.rank}, ${r.explanation.recommendation}). ${r.reasoning}`
  );
  return {
    answer: `Here are the strongest matches for **${lead}** in the pool ranked against ${job.title}:\n\n${lines.join("\n\n")}`,
    candidates: chips, usedGemini: false,
  };
}

/** Compact grounded context string for the LLM. */
export function buildContext(query: string): { context: string; chips: RecruiterReply["candidates"] } {
  const { hits } = retrieve(query, 6);
  const job = getJob();
  const chips = hits.map((r) => ({
    id: r.candidate.candidate_id, name: r.candidate.profile.anonymized_name,
    title: r.candidate.profile.current_title, rank: r.rank, score: r.score,
    recommendation: r.explanation.recommendation,
  }));
  const context = hits.map((r) => {
    const p = r.candidate.profile;
    const sig = r.candidate.redrob_signals;
    return [
      `Candidate ${r.candidate.candidate_id} — ${p.anonymized_name}`,
      `Rank #${r.rank}, score ${r.score.toFixed(2)}, recommendation ${r.explanation.recommendation}`,
      `Title: ${p.current_title} at ${p.current_company} (${p.current_industry}), ${p.years_of_experience}y, ${p.location}`,
      `Top skills: ${r.candidate.skills.filter((s) => s.proficiency === "advanced" || s.proficiency === "expert").slice(0, 5).map((s) => s.name).join(", ")}`,
      `Signals: response rate ${sig.recruiter_response_rate}, last active ${sig.last_active_date}, notice ${sig.notice_period_days}d, github ${sig.github_activity_score}`,
      `Strengths: ${r.explanation.strengths.slice(0, 3).join("; ")}`,
      `Concerns: ${r.explanation.weaknesses.slice(0, 2).join("; ")}`,
    ].join("\n");
  }).join("\n\n---\n\n");

  return { context: `Active role: ${job.title} at ${job.company}.\n\nRelevant ranked candidates:\n\n${context}`, chips };
}
