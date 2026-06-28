import { CheckCircle2, XCircle, KeyRound, SlidersHorizontal, Database, Download } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";

export const dynamic = "force-dynamic";
export const metadata = { title: "Settings" };

const WEIGHTS = [
  { name: "Semantic (hybrid retrieval)", value: 28 },
  { name: "Skills evidence", value: 24 },
  { name: "Experience match", value: 16 },
  { name: "Behavioral signals", value: 9 },
  { name: "Career stability", value: 9 },
  { name: "Culture fit", value: 8 },
  { name: "Education", value: 6 },
];

export default function SettingsPage() {
  const hasGemini = Boolean(process.env.GEMINI_API_KEY);
  const hasHf = Boolean(process.env.HF_TOKEN);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h2 className="text-xl font-semibold tracking-tight">Settings</h2>
        <p className="mt-1 text-sm text-muted-foreground">Engine configuration, integrations, and data.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><KeyRound className="size-4 text-silver" /> Integrations</CardTitle>
          <CardDescription>Keys are read from your <code className="rounded bg-white/10 px-1 text-xs">.env</code>. The app runs fully without them.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <IntegrationRow name="Gemini 2.5 Flash" desc="Powers the AI Recruiter chat & richer explanations" ok={hasGemini} fallback="Local grounded engine" />
          <IntegrationRow name="Hugging Face token" desc="Downloads BGE + cross-encoder for the Python ranker" ok={hasHf} fallback="Not required by the web app" />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><SlidersHorizontal className="size-4 text-silver" /> Scoring weights</CardTitle>
          <CardDescription>The calibrated composite that produces each candidate's match score.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {WEIGHTS.map((w) => (
            <div key={w.name}>
              <div className="mb-1.5 flex justify-between text-sm"><span>{w.name}</span><span className="font-mono text-muted-foreground">{w.value}%</span></div>
              <Progress value={w.value * 3.5} />
            </div>
          ))}
          <Separator />
          <p className="text-xs text-muted-foreground">
            On top of the composite, a behavioral-availability multiplier and trap penalties (keyword-stuffing, consulting-only, off-target specialization, honeypot risk) are applied. Honeypots are forced to the floor.
          </p>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Database className="size-4 text-silver" /> Data</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>Candidate pool sampled from the 100K Redrob dataset, persisted to SQLite via Prisma and served from an in-memory ranked store.</p>
            <div className="flex gap-2 pt-1">
              <Badge variant="outline">SQLite</Badge>
              <Badge variant="outline">Prisma</Badge>
              <Badge variant="outline">In-memory cache</Badge>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Download className="size-4 text-silver" /> Export</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>Download the top-100 shortlist as a hackathon-validator-compliant CSV.</p>
            <Button asChild variant="silver" size="sm"><a href="/api/export" download>Download submission.csv</a></Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function IntegrationRow({ name, desc, ok, fallback }: { name: string; desc: string; ok: boolean; fallback: string }) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
      <div>
        <p className="text-sm font-medium">{name}</p>
        <p className="text-xs text-muted-foreground">{desc}</p>
      </div>
      {ok ? (
        <Badge variant="success"><CheckCircle2 className="size-3" /> Connected</Badge>
      ) : (
        <div className="flex items-center gap-2">
          <span className="hidden text-xs text-muted-foreground sm:inline">→ {fallback}</span>
          <Badge variant="outline"><XCircle className="size-3" /> Not set</Badge>
        </div>
      )}
    </div>
  );
}
