// Seeds SQLite with the sampled candidate pool, the official JD, and a fully
// computed ranking. Optional persistence layer — the app also runs purely from
// /data via the in-memory store. Run with: npm run db:seed
import fs from "node:fs";
import path from "node:path";
import { PrismaClient } from "@prisma/client";
import type { Candidate, JobDescription } from "../src/types";
import { rankCandidates, honeypotRisk } from "../src/lib/ranking";

const prisma = new PrismaClient();

async function main() {
  const candidates: Candidate[] = JSON.parse(
    fs.readFileSync(path.resolve("data/candidates.sample.json"), "utf-8")
  );
  const job: JobDescription = JSON.parse(
    fs.readFileSync(path.resolve("data/job.json"), "utf-8")
  );

  console.log(`Seeding ${candidates.length} candidates...`);
  await prisma.ranking.deleteMany();
  await prisma.candidate.deleteMany();
  await prisma.job.deleteMany();

  // Candidates
  for (const batch of chunk(candidates, 200)) {
    await prisma.$transaction(
      batch.map((c) =>
        prisma.candidate.create({
          data: {
            id: c.candidate_id,
            name: c.profile.anonymized_name,
            headline: c.profile.headline,
            summary: c.profile.summary,
            location: c.profile.location,
            country: c.profile.country,
            currentTitle: c.profile.current_title,
            currentCompany: c.profile.current_company,
            currentIndustry: c.profile.current_industry,
            companySize: c.profile.current_company_size,
            yearsExperience: c.profile.years_of_experience,
            isHoneypot: honeypotRisk(c) >= 0.6,
            raw: JSON.stringify(c),
          },
        })
      )
    );
  }

  // Job
  const dbJob = await prisma.job.create({
    data: {
      id: job.id,
      title: job.title,
      company: job.company,
      location: job.location,
      rawText: job.rawText,
      parsed: JSON.stringify(job.parsed),
      isActive: true,
    },
  });

  // Ranking
  console.log("Computing ranking...");
  const ranked = rankCandidates(candidates, job);
  for (const batch of chunk(ranked, 200)) {
    await prisma.$transaction(
      batch.map((r) =>
        prisma.ranking.create({
          data: {
            jobId: dbJob.id,
            candidateId: r.candidate.candidate_id,
            rank: r.rank,
            score: r.score,
            confidence: r.confidence,
            components: JSON.stringify(r.components),
            features: JSON.stringify(r.features),
            explanation: JSON.stringify(r.explanation),
            reasoning: r.reasoning,
          },
        })
      )
    );
  }

  console.log(`Seeded ${ranked.length} rankings. Top pick: ${ranked[0].candidate.profile.anonymized_name} (${ranked[0].score.toFixed(4)})`);
}

function chunk<T>(arr: T[], n: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n));
  return out;
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
