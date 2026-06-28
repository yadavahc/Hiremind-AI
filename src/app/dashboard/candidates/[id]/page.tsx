import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft, MapPin, Briefcase, GraduationCap, Building2, CheckCircle2, AlertTriangle,
  Github, Mail, Phone, Linkedin, Clock, Activity, TrendingUp, Sparkles,
} from "lucide-react";
import { getRankedById, getRanked } from "@/lib/store";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ScoreRing } from "@/components/shared/score-ring";
import { CandidateRadar } from "@/components/charts/charts";
import { recBadge, pct, cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function CandidateDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const r = getRankedById(id);
  if (!r) notFound();

  const c = r.candidate;
  const p = c.profile;
  const s = c.redrob_signals;
  const rec = recBadge(r.explanation.recommendation);
  const total = getRanked().length;

  const radar = [
    { axis: "Semantic", value: r.components.semantic },
    { axis: "Skills", value: r.components.skills },
    { axis: "Experience", value: r.components.experience },
    { axis: "Education", value: r.components.education },
    { axis: "Stability", value: r.components.stability },
    { axis: "Culture", value: r.components.cultureFit },
    { axis: "Behavioral", value: r.components.behavioral },
  ];

  const sortedHistory = [...c.career_history].sort(
    (a, b) => new Date(b.start_date).getTime() - new Date(a.start_date).getTime()
  );

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <Link href="/dashboard/candidates" className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground">
        <ArrowLeft className="size-4" /> Back to ranking
      </Link>

      {/* Header */}
      <Card className="relative overflow-hidden">
        <div className="pointer-events-none absolute right-0 top-0 h-48 w-64 bg-[radial-gradient(circle_at_top_right,rgba(200,205,214,0.1),transparent_70%)]" />
        <CardContent className="flex flex-col gap-6 p-6 md:flex-row md:items-center">
          <Avatar name={p.anonymized_name} id={c.candidate_id} size={80} className="ring-2 ring-white/10" />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-semibold tracking-tight">{p.anonymized_name}</h1>
              {r.isHoneypot && <Badge variant="danger"><AlertTriangle className="size-3" /> Honeypot risk</Badge>}
            </div>
            <p className="mt-1 text-muted-foreground">{p.headline}</p>
            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5"><Briefcase className="size-3.5" />{p.current_title}</span>
              <span className="flex items-center gap-1.5"><Building2 className="size-3.5" />{p.current_company}</span>
              <span className="flex items-center gap-1.5"><MapPin className="size-3.5" />{p.location}, {p.country}</span>
              <span className="flex items-center gap-1.5"><Clock className="size-3.5" />{p.years_of_experience} yrs</span>
            </div>
          </div>
          <div className="flex items-center gap-6">
            <div className="text-center">
              <p className="mb-1 text-xs uppercase tracking-wider text-muted-foreground">Rank</p>
              <p className="font-mono text-3xl font-semibold">#{r.rank}<span className="text-base text-muted-foreground">/{total}</span></p>
            </div>
            <ScoreRing value={r.score} size={92} label="match" />
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        {/* LEFT */}
        <div className="space-y-6">
          {/* AI summary */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2"><Sparkles className="size-4 text-silver" /> AI summary</CardTitle>
                <Badge variant="outline" className={rec.className}>{rec.label}</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-[15px] leading-relaxed text-foreground/90">{r.explanation.summary}</p>
              <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 text-sm">
                <p className="mb-1 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Why ranked #{r.rank}</p>
                <p className="text-foreground/80">{r.explanation.whyAboveOthers}</p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="mb-2 flex items-center gap-1.5 text-sm font-medium text-emerald-300"><CheckCircle2 className="size-4" /> Strengths</p>
                  <ul className="space-y-1.5">
                    {r.explanation.strengths.map((st, i) => (
                      <li key={i} className="flex gap-2 text-sm text-muted-foreground"><span className="mt-1.5 size-1 shrink-0 rounded-full bg-emerald-400" />{st}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="mb-2 flex items-center gap-1.5 text-sm font-medium text-amber-300"><AlertTriangle className="size-4" /> Concerns</p>
                  <ul className="space-y-1.5">
                    {r.explanation.weaknesses.map((w, i) => (
                      <li key={i} className="flex gap-2 text-sm text-muted-foreground"><span className="mt-1.5 size-1 shrink-0 rounded-full bg-amber-400" />{w}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Career timeline */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><TrendingUp className="size-4 text-silver" /> Career progression</CardTitle>
              <CardDescription>{c.career_history.length} roles · {p.summary.slice(0, 0)}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="relative space-y-5 pl-6">
                <div className="absolute left-[7px] top-2 bottom-2 w-px bg-gradient-to-b from-silver/40 via-white/10 to-transparent" />
                {sortedHistory.map((role, i) => (
                  <div key={i} className="relative">
                    <span className={cn("absolute -left-6 top-1.5 size-3 rounded-full border-2 border-background", role.is_current ? "bg-emerald-400" : "bg-zinc-500")} />
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <h4 className="text-sm font-semibold">{role.title}</h4>
                      <span className="text-xs text-muted-foreground">{fmtDate(role.start_date)} – {role.is_current ? "Present" : fmtDate(role.end_date)}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">{role.company} · {role.industry} · {role.company_size} · {Math.round(role.duration_months / 12 * 10) / 10}y</p>
                    <p className="mt-1.5 text-sm leading-relaxed text-foreground/75">{role.description}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Skills + Education */}
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader><CardTitle>Skills</CardTitle></CardHeader>
              <CardContent className="space-y-2.5">
                {c.skills.slice(0, 10).map((sk, i) => (
                  <div key={i} className="flex items-center justify-between gap-2">
                    <span className="truncate text-sm">{sk.name}</span>
                    <div className="flex items-center gap-2">
                      <ProficiencyDots level={sk.proficiency} />
                      <span className="w-8 text-right font-mono text-xs text-muted-foreground">{sk.endorsements}</span>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><GraduationCap className="size-4 text-silver" /> Education</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                {c.education.length === 0 && <p className="text-sm text-muted-foreground">No education listed.</p>}
                {c.education.map((e, i) => (
                  <div key={i}>
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="text-sm font-medium">{e.degree}, {e.field_of_study}</h4>
                      {e.tier && <Badge variant="outline" className="text-[10px]">{e.tier.replace("_", " ")}</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground">{e.institution} · {e.start_year}–{e.end_year}{e.grade ? ` · ${e.grade}` : ""}</p>
                  </div>
                ))}
                {c.certifications && c.certifications.length > 0 && (
                  <>
                    <Separator />
                    <div>
                      <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">Certifications</p>
                      {c.certifications.map((ct, i) => <p key={i} className="text-sm">{ct.name} <span className="text-muted-foreground">· {ct.issuer}, {ct.year}</span></p>)}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* RIGHT */}
        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle>Match breakdown</CardTitle><CardDescription>Component scores</CardDescription></CardHeader>
            <CardContent>
              <CandidateRadar data={radar} />
              <div className="mt-2 space-y-2">
                {radar.map((d) => (
                  <div key={d.axis}>
                    <div className="mb-1 flex justify-between text-xs"><span className="text-muted-foreground">{d.axis}</span><span className="font-mono">{d.value}</span></div>
                    <Progress value={d.value} className="h-1" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Activity className="size-4 text-silver" /> Behavioral signals</CardTitle><CardDescription>Redrob platform activity</CardDescription></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <Signal label="Recruiter response rate" value={pct(s.recruiter_response_rate)} good={s.recruiter_response_rate >= 0.5} />
              <Signal label="Last active" value={fmtDate(s.last_active_date)} good={monthsSince(s.last_active_date) <= 3} />
              <Signal label="Open to work" value={s.open_to_work_flag ? "Yes" : "No"} good={s.open_to_work_flag} />
              <Signal label="Notice period" value={`${s.notice_period_days} days`} good={s.notice_period_days <= 45} />
              <Signal label="Profile completeness" value={`${s.profile_completeness_score}%`} good={s.profile_completeness_score >= 70} />
              <Signal label="GitHub activity" value={s.github_activity_score < 0 ? "Not linked" : `${s.github_activity_score}/100`} good={s.github_activity_score >= 40} />
              <Signal label="Interview completion" value={s.interview_completion_rate < 0 ? "n/a" : pct(s.interview_completion_rate)} good={s.interview_completion_rate >= 0.6} />
              <Signal label="Saved by recruiters (30d)" value={String(s.saved_by_recruiters_30d)} good={s.saved_by_recruiters_30d > 0} />
              <Separator />
              <div className="flex flex-wrap gap-1.5">
                <VerifyBadge ok={s.verified_email} icon={Mail} label="Email" />
                <VerifyBadge ok={s.verified_phone} icon={Phone} label="Phone" />
                <VerifyBadge ok={s.linkedin_connected} icon={Linkedin} label="LinkedIn" />
                <VerifyBadge ok={s.github_activity_score >= 0} icon={Github} label="GitHub" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Compensation</CardTitle></CardHeader>
            <CardContent className="space-y-1 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Expected</span><span className="font-mono">₹{s.expected_salary_range_inr_lpa.min}–{s.expected_salary_range_inr_lpa.max} LPA</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Work mode</span><span className="capitalize">{s.preferred_work_mode}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Willing to relocate</span><span>{s.willing_to_relocate ? "Yes" : "No"}</span></div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Signal({ label, value, good }: { label: string; value: string; good: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className={cn("flex items-center gap-1.5 font-medium", good ? "text-foreground" : "text-amber-300/80")}>
        <span className={cn("size-1.5 rounded-full", good ? "bg-emerald-400" : "bg-amber-400")} />{value}
      </span>
    </div>
  );
}

function VerifyBadge({ ok, icon: Icon, label }: { ok: boolean; icon: typeof Mail; label: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[11px]", ok ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300" : "border-white/10 bg-white/[0.03] text-muted-foreground")}>
      <Icon className="size-3" />{label}
    </span>
  );
}

function ProficiencyDots({ level }: { level: string }) {
  const n = { beginner: 1, intermediate: 2, advanced: 3, expert: 4 }[level] ?? 1;
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4].map((i) => <span key={i} className={cn("size-1.5 rounded-full", i <= n ? "bg-silver" : "bg-white/10")} />)}
    </div>
  );
}

function fmtDate(d: string | null): string {
  if (!d) return "—";
  const date = new Date(d);
  if (isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-US", { month: "short", year: "numeric" });
}
function monthsSince(d: string): number {
  const date = new Date(d);
  if (isNaN(date.getTime())) return 99;
  return (Date.now() - date.getTime()) / (1000 * 60 * 60 * 24 * 30.4);
}
