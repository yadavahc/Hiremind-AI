import { computeAnalytics } from "@/lib/analytics";
import { StatCard } from "@/components/dashboard/stat-card";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  ScoreDistributionChart, RecommendationDonut, ComponentRadar,
  ExperienceBars, SkillsBar, FunnelChart,
} from "@/components/charts/charts";
import { Progress } from "@/components/ui/progress";

export const dynamic = "force-dynamic";
export const metadata = { title: "Analytics" };

export default function AnalyticsPage() {
  const a = computeAnalytics();

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div>
        <h2 className="text-xl font-semibold tracking-tight">Recruitment analytics</h2>
        <p className="mt-1 text-sm text-muted-foreground">Hiring insights derived from the ranked pool against the active JD.</p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard index={0} icon="users" label="Total ranked" value={a.total} />
        <StatCard index={1} icon="target" label="Avg. score" value={a.avgScore * 100} decimals={1} suffix="%" />
        <StatCard index={2} icon="layers" label="Shortlisted" value={a.shortlisted} />
        <StatCard index={3} icon="shieldAlert" label="Honeypots caught" value={a.honeypots} trend="down" delta="filtered" />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>Score distribution</CardTitle><CardDescription>Match scores across the entire pool</CardDescription></CardHeader>
          <CardContent><ScoreDistributionChart data={a.scoreDistribution} /></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Recommendation mix</CardTitle><CardDescription>Engine verdicts</CardDescription></CardHeader>
          <CardContent><RecommendationDonut data={a.recommendations} /></CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Recruitment funnel</CardTitle><CardDescription>From sourced pool to strong-hire shortlist</CardDescription></CardHeader>
          <CardContent><FunnelChart data={a.funnel} /></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Experience distribution</CardTitle><CardDescription>Top 100 by years of experience (JD band: 5–9y highlighted)</CardDescription></CardHeader>
          <CardContent><ExperienceBars data={a.experienceBands} /></CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader><CardTitle>Top skills in shortlist</CardTitle><CardDescription>Most common advanced/expert skills</CardDescription></CardHeader>
          <CardContent><SkillsBar data={a.topSkills} /></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Requirement coverage gaps</CardTitle><CardDescription>% of top 100 with real evidence of each core requirement</CardDescription></CardHeader>
          <CardContent className="space-y-4 pt-2">
            {a.missingSkills.map((m) => (
              <div key={m.skill}>
                <div className="mb-1.5 flex justify-between text-sm">
                  <span>{m.skill}</span>
                  <span className={`font-mono ${m.coverage < 40 ? "text-amber-300" : "text-foreground"}`}>{m.coverage}%</span>
                </div>
                <Progress value={m.coverage} indicatorClassName={m.coverage < 40 ? "from-amber-400 to-amber-600" : undefined} />
              </div>
            ))}
            <p className="pt-1 text-xs text-muted-foreground">Low coverage means the pool is thin on that requirement — expect to compete for those candidates.</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Shortlist component profile</CardTitle><CardDescription>Average across top 100</CardDescription></CardHeader>
          <CardContent><ComponentRadar data={a.componentAverages} /></CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Top industries represented</CardTitle><CardDescription>Where the shortlist comes from</CardDescription></CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            {a.topIndustries.map((ind) => (
              <div key={ind.name} className="flex items-center gap-3 rounded-xl border border-white/[0.08] bg-white/[0.02] px-4 py-3">
                <span className="text-sm">{ind.name}</span>
                <span className="rounded-full bg-white/[0.06] px-2 py-0.5 font-mono text-xs">{ind.value}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
