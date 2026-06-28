import { NextRequest, NextResponse } from "next/server";
import { queryRanked } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const result = queryRanked({
    search: sp.get("search") ?? undefined,
    recommendation: sp.get("rec") ?? undefined,
    hideHoneypots: sp.get("hideHoneypots") === "1",
    sort: (sp.get("sort") as "rank" | "score" | "experience" | "confidence") ?? "rank",
    dir: (sp.get("dir") as "asc" | "desc") ?? "asc",
    page: Number(sp.get("page") ?? "1"),
    pageSize: Number(sp.get("pageSize") ?? "12"),
  });

  // Slim payload for the table
  const rows = result.rows.map((r) => ({
    id: r.candidate.candidate_id,
    name: r.candidate.profile.anonymized_name,
    title: r.candidate.profile.current_title,
    company: r.candidate.profile.current_company,
    location: r.candidate.profile.location,
    years: r.candidate.profile.years_of_experience,
    rank: r.rank,
    score: r.score,
    confidence: r.confidence,
    recommendation: r.explanation.recommendation,
    reasoning: r.reasoning,
    isHoneypot: r.isHoneypot,
    components: r.components,
    topSkills: r.candidate.skills
      .filter((s) => s.proficiency === "expert" || s.proficiency === "advanced")
      .sort((a, b) => b.endorsements - a.endorsements)
      .slice(0, 3)
      .map((s) => s.name),
  }));

  return NextResponse.json({ ...result, rows });
}
