// Convenience CLI: rank the bundled candidate sample with the TypeScript engine
// and write a validator-compliant submission CSV. (The full-pool, reproducible
// hackathon ranker is scripts/rank.py.)
//   npm run rank
import fs from "node:fs";
import path from "node:path";
import { rankCandidates, monotonicScores } from "../src/lib/ranking";
import type { Candidate, JobDescription } from "../src/types";

const candidates: Candidate[] = JSON.parse(fs.readFileSync(path.resolve("data/candidates.sample.json"), "utf-8"));
const job: JobDescription = JSON.parse(fs.readFileSync(path.resolve("data/job.json"), "utf-8"));

const t0 = Date.now();
const ranked = rankCandidates(candidates, job);
const top = ranked.slice(0, 100);
const scores = monotonicScores(top);

const esc = (s: string) => (/[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s);
const rows = top.map((r, i) => [r.candidate.candidate_id, i + 1, scores[i].toFixed(4), esc(r.reasoning.replace(/\s+/g, " ").trim())].join(","));
const csv = ["candidate_id,rank,score,reasoning", ...rows].join("\n") + "\n";

fs.mkdirSync(path.resolve("out"), { recursive: true });
fs.writeFileSync(path.resolve("out/submission.csv"), csv);

console.log(`Ranked ${candidates.length} candidates in ${Date.now() - t0}ms`);
console.log(`Top: ${top[0].candidate.profile.anonymized_name} — ${top[0].candidate.profile.current_title} (${top[0].score.toFixed(3)})`);
console.log(`Honeypots in top-100: ${top.filter((r) => r.isHoneypot).length}`);
console.log(`Wrote out/submission.csv (${top.length} rows)`);
