// ============================================================================
// Job-description parser
// ----------------------------------------------------------------------------
// Extracts structured entities from arbitrary JD text uploaded by a recruiter.
// Heuristic + ontology-driven (no network), so it works offline. The official
// Senior AI Engineer JD ships pre-parsed in data/job.json; this powers uploads.
// ============================================================================

import { ParsedJob } from "@/types";
import { CONCEPT_GROUPS, CONSULTING_FIRMS, normalize } from "./ontology";

const SENIORITY_MAP: [RegExp, string][] = [
  [/principal|staff|head|director/i, "Principal / Staff"],
  [/senior|sr\.?\s/i, "Senior"],
  [/junior|entry|associate|fresher/i, "Junior"],
  [/lead/i, "Lead"],
];

export function parseJobDescription(text: string): ParsedJob {
  const lower = normalize(text);

  // Seniority
  let seniority = "Mid";
  for (const [re, label] of SENIORITY_MAP) if (re.test(text)) { seniority = label; break; }

  // Experience band: "5-9 years", "5 to 9 years", "5+ years"
  let minYears = 3, maxYears = 8, idealYears = 5;
  const band = text.match(/(\d{1,2})\s*[-–to]+\s*(\d{1,2})\s*\+?\s*years?/i);
  const plus = text.match(/(\d{1,2})\s*\+\s*years?/i);
  if (band) {
    minYears = parseInt(band[1]); maxYears = parseInt(band[2]);
    idealYears = Math.round((minYears + maxYears) / 2);
  } else if (plus) {
    minYears = parseInt(plus[1]); maxYears = minYears + 4; idealYears = minYears + 1;
  }

  // Skills from ontology — anything mentioned becomes a (preferred|required) skill.
  const found = new Set<string>();
  for (const g of CONCEPT_GROUPS) {
    for (const t of g.terms) if (lower.includes(t)) found.add(t);
  }
  const requiredSkills = CONCEPT_GROUPS.filter((g) => g.weight >= 0.85)
    .flatMap((g) => g.terms).filter((t) => found.has(t));
  const preferredSkills = [...found].filter((t) => !requiredSkills.includes(t));

  // Responsibilities — sentences with action verbs
  const responsibilities = (text.match(/[^.!?\n]*\b(build|own|ship|design|drive|lead|develop|optimize|architect|deploy|mentor)\b[^.!?\n]*/gi) ?? [])
    .map((s) => s.trim()).filter((s) => s.length > 25 && s.length < 180).slice(0, 6);

  // Locations
  const locHints = ["pune", "noida", "hyderabad", "mumbai", "delhi", "ncr", "bangalore", "bengaluru", "remote"];
  const preferRelocateOrLocal = locHints.filter((l) => lower.includes(l)).map((l) => l.charAt(0).toUpperCase() + l.slice(1));

  const antiSignals: string[] = [];
  if (/not\s+want|do not want|disqualif|red flag|explicitly not/i.test(text)) antiSignals.push("Explicit disqualifiers present in JD");
  if (CONSULTING_FIRMS.some((f) => lower.includes(f))) antiSignals.push("De-prioritizes consulting/services-only backgrounds");
  if (/title.?chas|job.?hop/i.test(text)) antiSignals.push("title-chaser / job-hopper");
  if (/keyword/i.test(text)) antiSignals.push("keyword-stuffer");

  return {
    seniority, minYears, maxYears, idealYears,
    industry: [],
    education: "Bachelor's or higher in a relevant field",
    requiredSkills: requiredSkills.length ? requiredSkills : [...found].slice(0, 10),
    preferredSkills,
    responsibilities,
    behavioralTraits: [],
    behavioralRequirements: {
      preferActive: true, preferResponsive: true, preferLowNotice: /notice/i.test(text),
      preferRelocateOrLocal: preferRelocateOrLocal.length ? preferRelocateOrLocal : ["Remote"],
    },
    antiSignals: antiSignals.length ? antiSignals : ["dormant / unresponsive candidates"],
    consultingFirms: CONSULTING_FIRMS.map((f) => f.toUpperCase()),
  };
}
