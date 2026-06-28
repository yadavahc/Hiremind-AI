// Builds a submission CSV that passes the hackathon validator:
//  - header exactly: candidate_id,rank,score,reasoning
//  - exactly 100 data rows, ranks 1..100 unique
//  - score strictly non-increasing by rank
//  - tie-break candidate_id ascending (guaranteed: scores are strictly decreasing)
//  - UTF-8, proper CSV escaping
import "server-only";
import { getRanked } from "./store";
import { monotonicScores } from "./ranking";

function csvEscape(value: string): string {
  if (/[",\n\r]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

export function buildSubmissionCsv(): string {
  const top = getRanked().slice(0, 100);
  const scores = monotonicScores(top);
  const header = "candidate_id,rank,score,reasoning";
  const rows = top.map((r, i) => {
    const reasoning = r.reasoning.replace(/\s+/g, " ").trim();
    return [
      r.candidate.candidate_id,
      String(i + 1),
      scores[i].toFixed(4),
      csvEscape(reasoning),
    ].join(",");
  });
  return [header, ...rows].join("\n") + "\n";
}

export interface SubmissionValidation { ok: boolean; errors: string[]; rowCount: number; }

/** Mirror of validate_submission.py — used to self-check before download. */
export function validateSubmission(csv: string): SubmissionValidation {
  const errors: string[] = [];
  const lines = csv.split(/\r?\n/).filter((l) => l.trim().length > 0);
  const header = lines[0];
  if (header !== "candidate_id,rank,score,reasoning") errors.push("Header row must be exactly: candidate_id,rank,score,reasoning");
  const data = lines.slice(1);
  if (data.length !== 100) errors.push(`Expected exactly 100 data rows, found ${data.length}.`);

  const seenRanks = new Set<number>();
  const seenIds = new Set<string>();
  let prevScore = Infinity;
  data.forEach((line, i) => {
    // naive parse (reasoning may be quoted) — split first 3 commas
    const m = line.match(/^(CAND_\d{7}),(\d+),([\d.]+),/);
    if (!m) { errors.push(`Row ${i + 2}: malformed.`); return; }
    const [, id, rankS, scoreS] = m;
    const rank = Number(rankS); const score = Number(scoreS);
    if (seenIds.has(id)) errors.push(`Row ${i + 2}: duplicate candidate_id ${id}.`);
    seenIds.add(id);
    if (rank < 1 || rank > 100) errors.push(`Row ${i + 2}: rank out of range.`);
    if (seenRanks.has(rank)) errors.push(`Row ${i + 2}: duplicate rank ${rank}.`);
    seenRanks.add(rank);
    if (score > prevScore) errors.push(`Row ${i + 2}: score increased (${score} > ${prevScore}).`);
    prevScore = score;
  });
  return { ok: errors.length === 0, errors, rowCount: data.length };
}
