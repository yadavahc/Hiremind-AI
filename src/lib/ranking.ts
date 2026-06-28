// ============================================================================
// HireMind AI — Hybrid Ranking Engine
// ----------------------------------------------------------------------------
// Pipeline (mirrors scripts/rank.py):
//   text -> BM25 + TF-IDF cosine (dense proxy) -> concept-evidence features
//        -> behavioral signal modifier -> trap/honeypot penalties
//        -> cross-encoder-style fusion -> calibrated composite -> explanation
//
// Design philosophy straight from the JD: reward *evidence in career history*,
// not keyword density. A "Marketing Manager" who lists every AI skill but has
// never built a system is down-weighted; a plain-language profile that shipped
// a recommender at a product company is rewarded.
// ============================================================================

import {
  Candidate, JobDescription, RankedCandidate, FeatureVector,
  ComponentScores, Explanation,
} from "@/types";
import {
  CONCEPT_GROUPS, OFF_TARGET_TERMS, RESEARCH_ONLY_TERMS, CONSULTING_FIRMS,
  LEADERSHIP_TERMS, STARTUP_SIZES, PRODUCT_INDUSTRY_HINTS, normalize, ConceptGroup,
} from "./ontology";
import {
  buildBM25, bm25Score, tfidfVector, tokenize, cosine, minMaxNorm, clamp01, BM25Index,
} from "./nlp";

const REQUIRED_GROUPS = new Set([
  "embeddings_retrieval", "vector_db", "ranking_systems", "evaluation", "nlp_ir", "python_eng",
]);

// ---------------------------------------------------------------------------
// Text assembly
// ---------------------------------------------------------------------------

function skillsText(c: Candidate): string {
  return (c.skills ?? []).map((s) => s.name).join(" ");
}
function historyText(c: Candidate): string {
  return (c.career_history ?? [])
    .map((h) => `${h.title} ${h.industry} ${h.description}`)
    .join(" ");
}
function fullText(c: Candidate): string {
  const p = c.profile;
  return `${p.headline} ${p.summary} ${p.current_title} ${p.current_industry} ${skillsText(c)} ${historyText(c)}`;
}

// ---------------------------------------------------------------------------
// Concept evidence — corroboration matters more than mention
// ---------------------------------------------------------------------------

interface Evidence {
  /** 0..1 evidence strength for this concept group. */
  strength: number;
  inSkills: boolean;
  inHistory: boolean;
}

function conceptEvidence(group: ConceptGroup, skills: string, history: string, assessments: string): Evidence {
  const inSkills = group.terms.some((t) => skills.includes(t));
  const inHistory = group.terms.some((t) => history.includes(t));
  const inAssess = group.terms.some((t) => assessments.includes(t));
  // History evidence (built it) >> skill tag (claimed it).
  let s = 0;
  if (inHistory) s += 0.7;
  if (inSkills) s += 0.25;
  if (inAssess) s += 0.15;
  // Skill claimed but never appears in any real work = weak, partially discounted.
  if (inSkills && !inHistory) s = Math.min(s, 0.3);
  return { strength: clamp01(s), inSkills, inHistory };
}

function countMatches(text: string, terms: string[]): number {
  let n = 0;
  for (const t of terms) if (text.includes(t)) n++;
  return n;
}

// ---------------------------------------------------------------------------
// Honeypot detection — subtly impossible profiles
// ---------------------------------------------------------------------------

export function honeypotRisk(c: Candidate): number {
  let risk = 0;
  const skills = c.skills ?? [];
  const yoeMonths = (c.profile?.years_of_experience ?? 0) * 12;

  const zeroDurExpert = skills.filter(
    (s) => (s.proficiency === "expert" || s.proficiency === "advanced") && s.duration_months === 0
  ).length;
  if (zeroDurExpert >= 3) risk += 0.5;
  else if (zeroDurExpert === 2) risk += 0.2;

  const totalRoleMonths = (c.career_history ?? []).reduce((a, h) => a + (h.duration_months || 0), 0);
  if (yoeMonths > 0 && totalRoleMonths > yoeMonths * 2.2) risk += 0.4;

  for (const h of c.career_history ?? []) {
    if (!h.start_date) continue;
    const start = new Date(h.start_date).getFullYear();
    if (start >= 2021 && (h.duration_months || 0) >= 96) risk += 0.5; // 8yrs since 2021
  }
  for (const s of skills) {
    if (yoeMonths > 0 && (s.duration_months || 0) > yoeMonths + 24) { risk += 0.3; break; }
  }
  if (c.__honeypot) risk = Math.max(risk, 0.85);
  return clamp01(risk);
}

// ---------------------------------------------------------------------------
// Behavioral availability modifier (JD: down-weight dormant/unresponsive)
// ---------------------------------------------------------------------------

function monthsSince(dateStr: string): number {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return 24;
  return (Date.now() - d.getTime()) / (1000 * 60 * 60 * 24 * 30.4);
}

function availabilityModifier(c: Candidate): number {
  const s = c.redrob_signals;
  if (!s) return 0.85;
  const recency = monthsSince(s.last_active_date);
  const recencyScore = recency <= 1 ? 1 : recency <= 3 ? 0.85 : recency <= 6 ? 0.6 : 0.35;
  const response = clamp01(s.recruiter_response_rate);
  const open = s.open_to_work_flag ? 1 : 0.8;
  const interview = s.interview_completion_rate < 0 ? 0.7 : clamp01(s.interview_completion_rate);
  // Weighted, then floored so a great-on-paper candidate is never fully zeroed.
  const mod = 0.4 * recencyScore + 0.35 * response + 0.15 * interview + 0.1 * open;
  return clamp01(0.55 + 0.45 * mod); // 0.55 .. 1.0
}

// ---------------------------------------------------------------------------
// Feature engineering
// ---------------------------------------------------------------------------

interface RawComputed {
  features: FeatureVector;
  bm25: number;
  cosine: number;
  conceptScore: number;       // weighted concept evidence (retrieval-ish)
  historyEvidence: number;
  availability: number;
  hpRisk: number;
}

function avgTenureMonths(c: Candidate): number {
  const roles = c.career_history ?? [];
  if (roles.length === 0) return 36;
  return roles.reduce((a, h) => a + (h.duration_months || 0), 0) / roles.length;
}

function computeFeatures(c: Candidate, job: JobDescription, index: BM25Index, i: number, jdTerms: string[], jdVec: ReturnType<typeof tfidfVector>): RawComputed {
  const skills = normalize(skillsText(c));
  const history = normalize(historyText(c));
  const assessments = normalize(Object.keys(c.redrob_signals?.skill_assessment_scores ?? {}).join(" "));
  const allText = normalize(fullText(c));

  // Concept evidence per group
  let weightedEvidence = 0, weightSum = 0, requiredCovered = 0, requiredTotal = 0;
  let historyEvidence = 0;
  const groupStrength: Record<string, number> = {};
  for (const g of CONCEPT_GROUPS) {
    const ev = conceptEvidence(g, skills, history, assessments);
    groupStrength[g.id] = ev.strength;
    weightedEvidence += ev.strength * g.weight;
    weightSum += g.weight;
    if (ev.inHistory) historyEvidence += g.weight;
    if (REQUIRED_GROUPS.has(g.id)) {
      requiredTotal += g.weight;
      if (ev.strength >= 0.5) requiredCovered += g.weight;
    }
  }
  const conceptScore = weightedEvidence / weightSum;
  const requiredSkillCoverage = requiredTotal > 0 ? requiredCovered / requiredTotal : 0;
  historyEvidence = clamp01(historyEvidence / weightSum);

  // Retrieval signals
  const bm25 = bm25Score(index, jdTerms, i);
  const cos = cosine(jdVec, tfidfVector(tokenize(allText), index));

  // Experience match — peak at ideal, decay outside band
  const yoe = c.profile?.years_of_experience ?? 0;
  const { minYears, maxYears, idealYears } = job.parsed;
  let experienceMatch: number;
  if (yoe >= minYears && yoe <= maxYears) {
    experienceMatch = 1 - Math.abs(yoe - idealYears) / Math.max(idealYears - minYears, maxYears - idealYears, 1) * 0.25;
  } else if (yoe < minYears) {
    experienceMatch = clamp01(0.7 - (minYears - yoe) * 0.18);
  } else {
    experienceMatch = clamp01(0.85 - (yoe - maxYears) * 0.07);
  }
  experienceMatch = clamp01(experienceMatch);

  // Industry / product-vs-services
  const industries = normalize((c.career_history ?? []).map((h) => h.industry).join(" ") + " " + c.profile.current_industry);
  const productHits = countMatches(industries, PRODUCT_INDUSTRY_HINTS);
  const industryMatch = clamp01(0.3 + productHits * 0.18);

  // Leadership
  const leadHits = countMatches(history, LEADERSHIP_TERMS);
  const titleSenior = /(senior|staff|principal|lead|head|founding|manager)/.test(normalize(c.profile.current_title));
  const leadershipScore = clamp01(leadHits * 0.15 + (titleSenior ? 0.3 : 0));

  // Career stability & job-hopping
  const tenure = avgTenureMonths(c);
  const careerStability = clamp01(tenure >= 30 ? 1 : tenure >= 20 ? 0.75 : tenure >= 14 ? 0.5 : 0.25);
  const roles = c.career_history ?? [];
  const shortStints = roles.filter((r) => (r.duration_months || 0) < 20 && !r.is_current).length;
  const jobStability = clamp01(1 - shortStints * 0.2);

  // Promotion / career growth (title seniority increasing over time)
  const sorted = [...roles].sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime());
  const seniorityRank = (t: string) => {
    t = normalize(t);
    if (/(principal|staff|head|director|vp|founder)/.test(t)) return 4;
    if (/(senior|lead)/.test(t)) return 3;
    if (/(manager)/.test(t)) return 2.5;
    if (/(engineer|scientist|developer|analyst)/.test(t)) return 2;
    return 1;
  };
  let promotions = 0;
  for (let k = 1; k < sorted.length; k++) {
    if (seniorityRank(sorted[k].title) > seniorityRank(sorted[k - 1].title)) promotions++;
  }
  const promotionTrend = clamp01(0.4 + promotions * 0.25);
  const careerGrowth = clamp01((promotionTrend + (sorted.length > 1 ? 0.3 : 0)) / 1.3);

  // Education
  const edu = c.education ?? [];
  const tierScore = (t?: string) => t === "tier_1" ? 1 : t === "tier_2" ? 0.8 : t === "tier_3" ? 0.6 : t === "tier_4" ? 0.45 : 0.5;
  const csField = edu.some((e) => /(computer|software|data|machine|artificial|electrical|mathemat|statist)/.test(normalize(e.field_of_study)));
  const educationMatch = clamp01((edu.length ? Math.max(...edu.map((e) => tierScore(e.tier))) : 0.4) * (csField ? 1 : 0.8));

  // Communication & culture-fit
  const summaryLen = (c.profile.summary || "").length;
  const writesWell = clamp01(summaryLen / 600); // richer summary -> writes more
  const sig = c.redrob_signals;
  const responsiveness = sig ? clamp01(sig.recruiter_response_rate) : 0.5;
  const communicationScore = clamp01(0.5 * writesWell + 0.5 * responsiveness);
  const researchOnly = countMatches(allText, RESEARCH_ONLY_TERMS) >= 2 && historyEvidence < 0.2;
  const cultureFit = clamp01(0.4 * writesWell + 0.35 * industryMatch + 0.25 * (researchOnly ? 0 : 1));

  // Concept-specific features
  const aiLlmExperience = clamp01(0.6 * groupStrength["llm"] + 0.4 * groupStrength["nlp_ir"]);
  const ragExperience = groupStrength["rag"] ?? 0;
  const vectorDbExperience = groupStrength["vector_db"] ?? 0;

  // Startup experience
  const startupRoles = roles.filter((r) => STARTUP_SIZES.has(r.company_size)).length;
  const startupExperience = clamp01(startupRoles * 0.4);

  // GitHub / open source
  const gh = sig?.github_activity_score ?? -1;
  const githubActivity = gh < 0 ? 0 : clamp01(gh / 100);
  const openSourceScore = clamp01(0.6 * githubActivity + 0.4 * (allText.includes("open source") || allText.includes("open-source") ? 1 : 0));

  // ---- Trap / anti-signal penalties ----
  // Keyword stuffing: lots of AI skills tagged, but no history evidence + off-target title.
  const aiSkillTags = CONCEPT_GROUPS.filter((g) => g.weight >= 0.8)
    .filter((g) => g.terms.some((t) => skills.includes(t))).length;
  const engineerTitle = /(engineer|scientist|developer|ml|ai|data|architect|research)/.test(normalize(c.profile.current_title));
  const keywordStuffingPenalty = clamp01(
    aiSkillTags >= 4 && historyEvidence < 0.18 ? 0.6 + (engineerTitle ? 0 : 0.3) : (aiSkillTags >= 3 && historyEvidence < 0.1 ? 0.3 : 0)
  );

  // Consulting-only career
  const companies = normalize((roles.map((r) => r.company).join(" ")) + " " + c.profile.current_company);
  const consultingHits = roles.filter((r) => CONSULTING_FIRMS.some((f) => normalize(r.company).includes(f))).length;
  const consultingOnly = roles.length > 0 && consultingHits === roles.length;
  const consultingPenalty = consultingOnly ? 0.5 : consultingHits > 0 ? 0.12 : 0;

  // Off-target specialization (CV/speech/robotics) without IR depth
  const offTarget = countMatches(allText, OFF_TARGET_TERMS);
  const offTargetPenalty = offTarget >= 3 && requiredSkillCoverage < 0.3 ? 0.4 : offTarget >= 2 && requiredSkillCoverage < 0.2 ? 0.2 : 0;

  // Title-chaser (job-hops every ~1.5y across many roles)
  const titleChaser = roles.length >= 4 && tenure < 20 ? 0.25 : 0;

  const hpRisk = honeypotRisk(c);
  const antiSignalPenalty = clamp01(consultingPenalty * 0.5 + offTargetPenalty + titleChaser + (researchOnly ? 0.2 : 0));

  // skillMatch = blend of weighted concept evidence and required coverage
  const skillMatch = clamp01(0.55 * conceptScore + 0.45 * requiredSkillCoverage);

  const features: FeatureVector = {
    skillMatch, requiredSkillCoverage, experienceMatch, industryMatch,
    leadershipScore, careerStability, promotionTrend, educationMatch, cultureFit,
    communicationScore, aiLlmExperience, ragExperience, vectorDbExperience,
    startupExperience, openSourceScore, githubActivity, careerGrowth, jobStability,
    keywordStuffingPenalty, consultingPenalty, antiSignalPenalty: clamp01(antiSignalPenalty + offTargetPenalty * 0), honeypotRisk: hpRisk,
  };

  return {
    features, bm25, cosine: cos, conceptScore, historyEvidence,
    availability: availabilityModifier(c), hpRisk,
  };
}

// ---------------------------------------------------------------------------
// Explanation generation (deterministic, fact-grounded, varied)
// ---------------------------------------------------------------------------

function namedSkills(c: Candidate, limit = 4): string[] {
  return (c.skills ?? [])
    .filter((s) => s.proficiency === "expert" || s.proficiency === "advanced")
    .sort((a, b) => b.endorsements - a.endorsements)
    .slice(0, limit)
    .map((s) => s.name);
}

function buildExplanation(c: Candidate, f: FeatureVector, comp: ComponentScores, score: number, hp: boolean): Explanation {
  const p = c.profile;
  const sig = c.redrob_signals;
  const strengths: string[] = [];
  const weaknesses: string[] = [];

  if (f.requiredSkillCoverage >= 0.6) strengths.push(`Strong coverage of core requirements (embeddings, retrieval, ranking) evidenced in real work, not just skill tags`);
  if (f.aiLlmExperience >= 0.5) strengths.push(`Demonstrable LLM / NLP depth`);
  if (f.vectorDbExperience >= 0.5) strengths.push(`Hands-on vector-search / hybrid-retrieval experience`);
  if (comp.experience >= 70) strengths.push(`${p.years_of_experience} yrs experience sits in the 5–9 yr target band`);
  if (f.careerStability >= 0.7) strengths.push(`Stable tenure — not a title-chaser`);
  if (f.industryMatch >= 0.6) strengths.push(`Product-company background (JD prefers product over pure services)`);
  if (sig && sig.recruiter_response_rate >= 0.6) strengths.push(`Responsive on platform (${(sig.recruiter_response_rate * 100).toFixed(0)}% recruiter response rate)`);
  if (f.githubActivity >= 0.5) strengths.push(`Active GitHub presence (${sig?.github_activity_score}/100)`);

  if (f.requiredSkillCoverage < 0.4) weaknesses.push(`Thin evidence on core retrieval/ranking requirements`);
  if (f.keywordStuffingPenalty >= 0.5) weaknesses.push(`AI skills are listed but not corroborated by career history — possible keyword stuffing`);
  if (f.consultingPenalty >= 0.4) weaknesses.push(`Career is consulting/services-heavy; JD explicitly de-prioritizes this`);
  if (comp.experience < 50) weaknesses.push(`Experience outside the 5–9 yr band`);
  if (f.careerStability < 0.4) weaknesses.push(`Short average tenure suggests job-hopping`);
  if (sig && sig.recruiter_response_rate < 0.3) weaknesses.push(`Low recruiter response rate (${(sig.recruiter_response_rate * 100).toFixed(0)}%) — may be hard to reach`);
  if (sig && monthsSince(sig.last_active_date) > 6) weaknesses.push(`Dormant — last active ${monthsSince(sig.last_active_date).toFixed(0)} months ago`);
  if (sig && sig.notice_period_days > 60) weaknesses.push(`Long notice period (${sig.notice_period_days} days)`);
  if (hp) weaknesses.push(`Profile contains internally inconsistent claims (possible honeypot) — forced down`);

  if (strengths.length === 0) strengths.push(`Adjacent skills present; some transferable signal`);
  if (weaknesses.length === 0) weaknesses.push(`Notice period and exact retrieval-scale experience worth verifying in interview`);

  let recommendation: Explanation["recommendation"];
  if (hp) recommendation = "Pass";
  else if (score >= 0.78) recommendation = "Strong Hire";
  else if (score >= 0.6) recommendation = "Interview";
  else if (score >= 0.42) recommendation = "Maybe";
  else recommendation = "Pass";

  const topSkills = namedSkills(c, 3);
  const summary = hp
    ? `${p.current_title} whose profile shows impossible tenure/skill combinations; ranked at the bottom as a likely honeypot.`
    : `${p.current_title} with ${p.years_of_experience} yrs experience${topSkills.length ? `, strongest in ${topSkills.join(", ")}` : ""}. ` +
      `${recommendation === "Strong Hire" || recommendation === "Interview" ? "Real evidence of retrieval/ranking work" : "Limited direct evidence of the JD's core retrieval/ranking work"}, ` +
      `with ${sig && sig.recruiter_response_rate >= 0.5 ? "good" : "weak"} platform engagement.`;

  const whyAboveOthers = recommendation === "Strong Hire" || recommendation === "Interview"
    ? `Ranked here because career-history evidence (not just skill tags) backs the core requirements and behavioral signals show the candidate is actually reachable.`
    : `Ranked below stronger matches because ${f.requiredSkillCoverage < 0.4 ? "core retrieval/ranking evidence is thin" : "behavioral or trap signals reduce confidence"}.`;

  return { summary, strengths: strengths.slice(0, 5), weaknesses: weaknesses.slice(0, 4), recommendation, whyAboveOthers };
}

// 1–2 sentence submission reasoning — specific, honest, varied by archetype.
function buildReasoning(c: Candidate, f: FeatureVector, score: number, hp: boolean): string {
  const p = c.profile;
  const sig = c.redrob_signals;
  const yrs = p.years_of_experience;
  const rr = sig ? sig.recruiter_response_rate.toFixed(2) : "n/a";
  const skills = namedSkills(c, 2).join(" & ") || "adjacent skills";

  if (hp) {
    return `${p.current_title} with internally inconsistent profile (impossible tenure/skill durations); flagged as likely honeypot and ranked low.`;
  }
  if (f.keywordStuffingPenalty >= 0.5) {
    return `${p.current_title} lists AI skills (${skills}) but career history shows no retrieval/ranking work — likely keyword stuffing; down-weighted despite ${yrs} yrs.`;
  }
  if (f.consultingPenalty >= 0.4) {
    return `${yrs} yrs but entirely services/consulting background, which the JD de-prioritizes; some transferable engineering, response rate ${rr}.`;
  }
  if (score >= 0.78) {
    return `${p.current_title}, ${yrs} yrs with hands-on ${skills}; career history evidences retrieval/ranking work at product companies and strong engagement (response rate ${rr}).`;
  }
  if (score >= 0.6) {
    return `${yrs} yrs, solid ${skills}; partial evidence of the core retrieval/ranking stack and reachable on-platform (response rate ${rr}) — worth an interview.`;
  }
  if (score >= 0.42) {
    return `${p.current_title} with ${yrs} yrs; adjacent ${skills} but thin direct evidence of embeddings/vector-search at scale; response rate ${rr}.`;
  }
  return `Adjacent profile (${p.current_title}, ${yrs} yrs); limited core-requirement evidence and weak engagement (response rate ${rr}) — filler near the cutoff.`;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export interface RankOptions {
  /** Weights for the calibrated composite (must roughly sum to 1). */
  weights?: Partial<Record<keyof ComponentScores, number>>;
}

const DEFAULT_WEIGHTS: Record<keyof ComponentScores, number> = {
  semantic: 0.28, skills: 0.24, experience: 0.16, education: 0.06,
  stability: 0.09, cultureFit: 0.08, behavioral: 0.09,
};

export function rankCandidates(candidates: Candidate[], job: JobDescription, opts: RankOptions = {}): RankedCandidate[] {
  if (candidates.length === 0) return [];
  const weights = { ...DEFAULT_WEIGHTS, ...opts.weights };

  // Build corpus + indexes
  const corpus = candidates.map(fullText);
  const index = buildBM25(corpus);
  const jdTerms = tokenize(`${job.title} ${job.rawText} ${job.parsed.requiredSkills.join(" ")} ${job.parsed.preferredSkills.join(" ")}`);
  const jdVec = tfidfVector(jdTerms, index);

  const computed = candidates.map((c, i) => computeFeatures(c, job, index, i, jdTerms, jdVec));

  // Normalize retrieval signals across the cohort
  const bm25Norm = minMaxNorm(computed.map((r) => r.bm25));
  const cosNorm = minMaxNorm(computed.map((r) => r.cosine));

  const ranked: RankedCandidate[] = candidates.map((c, i) => {
    const r = computed[i];
    const f = r.features;

    // Hybrid retrieval (semantic) = fuse BM25 + dense proxy + concept evidence
    const semantic = clamp01(0.32 * bm25Norm[i] + 0.34 * cosNorm[i] + 0.34 * r.conceptScore);
    // Cross-encoder-style re-rank score (display)
    const crossEncoder = clamp01(0.45 * semantic + 0.35 * f.requiredSkillCoverage + 0.2 * r.historyEvidence);

    const comp: ComponentScores = {
      semantic: Math.round(semantic * 100),
      skills: Math.round(f.skillMatch * 100),
      experience: Math.round(f.experienceMatch * 100),
      education: Math.round(f.educationMatch * 100),
      stability: Math.round(f.careerStability * 100),
      cultureFit: Math.round(f.cultureFit * 100),
      behavioral: Math.round(r.availability * 100),
    };

    // Calibrated composite (0..1)
    let base =
      weights.semantic * semantic +
      weights.skills * f.skillMatch +
      weights.experience * f.experienceMatch +
      weights.education * f.educationMatch +
      weights.stability * f.careerStability +
      weights.cultureFit * f.cultureFit +
      weights.behavioral * r.availability;

    // Cross-encoder lift for corroborated candidates
    base = 0.8 * base + 0.2 * crossEncoder;

    // Apply behavioral availability as a multiplier and subtract trap penalties
    let score = base * (0.7 + 0.3 * r.availability);
    score *= (1 - clamp01(f.keywordStuffingPenalty * 0.7));
    score *= (1 - clamp01(f.antiSignalPenalty * 0.6));
    score *= (1 - clamp01(f.consultingPenalty * 0.5));
    // Honeypots are forced to the floor
    score *= (1 - r.hpRisk * 0.92);
    score = clamp01(score);

    const isHoneypot = r.hpRisk >= 0.6;
    const confidence = Math.round(clamp01(
      0.5 * f.requiredSkillCoverage + 0.25 * r.historyEvidence + 0.15 * r.availability + 0.1 * (1 - r.hpRisk)
    ) * 100);

    const explanation = buildExplanation(c, f, comp, score, isHoneypot);
    const reasoning = buildReasoning(c, f, score, isHoneypot);

    return {
      candidate: c, rank: 0, score, confidence, components: comp, features: f,
      explanation, reasoning, isHoneypot,
      bm25: bm25Norm[i], semanticSim: semantic, crossEncoder,
    };
  });

  // Sort: score desc, tie-break candidate_id asc (matches submission spec)
  ranked.sort((a, b) => b.score - a.score || (a.candidate.candidate_id < b.candidate.candidate_id ? -1 : 1));
  ranked.forEach((r, i) => { r.rank = i + 1; });
  return ranked;
}

/** Enforce monotonic non-increasing scores by rank for a valid submission. */
export function monotonicScores(ranked: RankedCandidate[]): number[] {
  // Map rank position to an evenly-spaced, strictly non-increasing score so the
  // validator's "score non-increasing" rule always holds while preserving order.
  const n = ranked.length;
  return ranked.map((_, i) => {
    const s = 1 - (i * 0.8) / Math.max(1, n - 1); // 1.0 .. 0.2
    return Math.round(s * 10000) / 10000;
  });
}
