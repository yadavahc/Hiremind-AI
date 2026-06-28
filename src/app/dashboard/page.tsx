import Link from "next/link";
import { Sparkles, ArrowRight } from "lucide-react";
import { getRanked, getJob } from "@/lib/store";
import { computeAnalytics } from "@/lib/analytics";
import { StatCard } from "@/components/dashboard/stat-card";
import { ScoreDistributionChart, RecommendationDonut, ComponentRadar } from "@/components/charts/charts";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { recBadge, pct, scoreColor } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default function OverviewPage() {
  const ranked = getRanked();
  const job = getJob();
  const a = computeAnalytics();
  const top = ranked.slice(0, 6);
  const strongHire = a.recommendations.find((r) => r.name === "Strong Hire")?.value ?? 0;

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      {/* Hero strip */}
      <div className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-gradient-to-br from-white/[0.05] to-transparent p-6">
        <div className="pointer-events-none absolute right-0 top-0 h-40 w-40 rounded-full bg-[radial-gradient(circle,rgba(200,205,214,0.12),transparent_70%)] blur-xl" />
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <Badge variant="silver" className="mb-3"><Sparkles className="size-3" /> Active ranking</Badge>
            <h2 className="text-2xl font-semibold tracking-tight">{job.title}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{job.company} · {job.location} · {job.experienceRequired}</p>
          </div>
          <Link href="/dashboard/candidates" className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-medium transition-colors hover:border-white/20">
            View full shortlist <ArrowRight className="size-4" />
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard index={0} icon="users" label="Candidates ranked" value={a.total} delta="pool" trend="up" />
        <StatCard index={1} icon="trophy" label="Strong-hire matches" value={strongHire} suffix="" delta="top tier" trend="up" />
        <StatCard index={2} icon="target" label="Average match score" value={a.avgScore * 100} decimals={1} suffix="%" />
        <StatCard index={3} icon="shieldAlert" label="Honeypots filtered" value={a.honeypots} delta="excluded" trend="down" />
      </div>

      {/* Charts row */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Score distribution</CardTitle>
            <CardDescription>How the whole pool spreads across match-score bands</CardDescription>
          </CardHeader>
          <CardContent><ScoreDistributionChart data={a.scoreDistribution} /></CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Recommendations</CardTitle>
            <CardDescription>Engine verdict mix</CardDescription>
          </CardHeader>
          <CardContent>
            <RecommendationDonut data={a.recommendations} />
            <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
              {a.recommendations.map((r) => (
                <div key={r.name} className="flex items-center gap-2 text-muted-foreground">
                  <span className="size-2 rounded-full" style={{ background: { "Strong Hire": "#34d399", Interview: "#38bdf8", Maybe: "#fbbf24", Pass: "#71717a" }[r.name] }} />
                  {r.name} <span className="ml-auto font-mono text-foreground">{r.value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top candidates + radar */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between">
            <div>
              <CardTitle>Top of the shortlist</CardTitle>
              <CardDescription>Best-fit candidates with explained reasoning</CardDescription>
            </div>
            <Link href="/dashboard/candidates" className="text-xs text-silver hover:underline">See all →</Link>
          </CardHeader>
          <CardContent className="space-y-2">
            {top.map((r) => {
              const rec = recBadge(r.explanation.recommendation);
              return (
                <Link key={r.candidate.candidate_id} href={`/dashboard/candidates/${r.candidate.candidate_id}`}
                  className="group flex items-center gap-4 rounded-xl border border-transparent p-3 transition-colors hover:border-white/10 hover:bg-white/[0.03]">
                  <span className="w-6 text-center font-mono text-sm text-muted-foreground">{r.rank}</span>
                  <Avatar name={r.candidate.profile.anonymized_name} id={r.candidate.candidate_id} size={40} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{r.candidate.profile.anonymized_name}</p>
                    <p className="truncate text-xs text-muted-foreground">{r.candidate.profile.current_title} · {r.candidate.profile.years_of_experience}y</p>
                  </div>
                  <Badge variant="outline" className={rec.className}>{rec.label}</Badge>
                  <span className={`font-mono text-sm font-semibold ${scoreColor(r.score)}`}>{pct(r.score, 1)}</span>
                  <ArrowRight className="size-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                </Link>
              );
            })}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Shortlist profile</CardTitle>
            <CardDescription>Avg. component scores, top 100</CardDescription>
          </CardHeader>
          <CardContent><ComponentRadar data={a.componentAverages} /></CardContent>
        </Card>
      </div>
    </div>
  );
}
