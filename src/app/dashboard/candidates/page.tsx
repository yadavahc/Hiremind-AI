import { CandidatesTable } from "@/components/dashboard/candidates-table";
import { getRanked } from "@/lib/store";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

export const metadata = { title: "Candidate Ranking" };

export default function CandidatesPage() {
  const ranked = getRanked();
  const strong = ranked.filter((r) => r.explanation.recommendation === "Strong Hire").length;
  const interview = ranked.filter((r) => r.explanation.recommendation === "Interview").length;

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">Ranked candidates</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Every candidate scored, explained, and trap-checked against the active JD.
          </p>
        </div>
        <div className="flex gap-2">
          <Badge variant="success">{strong} Strong Hire</Badge>
          <Badge variant="info">{interview} Interview</Badge>
        </div>
      </div>
      <CandidatesTable />
    </div>
  );
}
