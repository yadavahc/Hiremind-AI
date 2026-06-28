"use client";
import { useState, useRef, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  UploadCloud, FileText, Loader2, Sparkles, CheckCircle2, ArrowRight, X, FileType2, RotateCcw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { analyzeAndRank, loadOfficialJob, type AnalyzeResult } from "@/app/dashboard/upload/actions";
import { cn, pct } from "@/lib/utils";

const STEPS = ["Reading document", "Extracting entities", "Generating embeddings", "Hybrid retrieval", "Ranking & explaining"];

export function JdUploader() {
  const router = useRouter();
  const [text, setText] = useState("");
  const [title, setTitle] = useState("");
  const [company, setCompany] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState(0);
  const [result, setResult] = useState<AnalyzeResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const readFile = useCallback((file: File) => {
    setFileName(file.name);
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (ext === "txt" || ext === "md" || file.type.startsWith("text/")) {
      const reader = new FileReader();
      reader.onload = () => setText(String(reader.result ?? ""));
      reader.readAsText(file);
    } else {
      setError(`${file.name} is a ${ext?.toUpperCase()} file. Paste its text below — binary PDF/DOCX parsing is intentionally kept out of the offline ranking path.`);
    }
  }, []);

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) readFile(file);
  };

  const runPipeline = async (fn: () => Promise<AnalyzeResult>) => {
    setBusy(true); setError(null); setResult(null); setStep(0);
    const timers = STEPS.map((_, i) => setTimeout(() => setStep(i), i * 520));
    const res = await fn();
    timers.forEach(clearTimeout);
    setStep(STEPS.length - 1);
    await new Promise((r) => setTimeout(r, 400));
    setBusy(false);
    if (res.ok) { setResult(res); router.refresh(); }
    else setError(res.error ?? "Something went wrong.");
  };

  const submit = () => runPipeline(() => analyzeAndRank({ title, company, text }));
  const useOfficial = () => runPipeline(() => loadOfficialJob());

  const reset = () => { setText(""); setTitle(""); setCompany(""); setFileName(null); setResult(null); setError(null); };

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
      <div className="space-y-5">
        {/* Dropzone */}
        <div
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          onClick={() => inputRef.current?.click()}
          className={cn(
            "group relative flex cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed p-10 text-center transition-all",
            dragging ? "border-silver bg-white/[0.04]" : "border-white/15 bg-card hover:border-white/30 hover:bg-white/[0.02]"
          )}
        >
          <input ref={inputRef} type="file" accept=".txt,.md,.pdf,.docx,text/*" className="hidden"
            onChange={(e) => e.target.files?.[0] && readFile(e.target.files[0])} />
          <motion.div animate={{ y: dragging ? -4 : 0 }} className="mb-4 grid size-14 place-items-center rounded-2xl border border-white/10 bg-white/[0.04] text-silver">
            <UploadCloud className="size-7" />
          </motion.div>
          <p className="text-sm font-medium">Drop a job description, or click to browse</p>
          <p className="mt-1 text-xs text-muted-foreground">TXT & MD read directly · PDF/DOCX: paste the text below</p>
          <div className="mt-3 flex gap-2">
            {["PDF", "DOCX", "TXT"].map((f) => <Badge key={f} variant="outline" className="text-[10px]"><FileType2 className="size-3" />{f}</Badge>)}
          </div>
          {fileName && (
            <div className="mt-4 inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs" onClick={(e) => e.stopPropagation()}>
              <FileText className="size-3.5 text-silver" /> {fileName}
              <button onClick={() => { setFileName(null); setText(""); }}><X className="size-3.5 text-muted-foreground hover:text-foreground" /></button>
            </div>
          )}
        </div>

        {/* Meta + paste */}
        <div className="grid gap-3 sm:grid-cols-2">
          <Input placeholder="Role title (optional)" value={title} onChange={(e) => setTitle(e.target.value)} />
          <Input placeholder="Company (optional)" value={company} onChange={(e) => setCompany(e.target.value)} />
        </div>
        <textarea
          value={text} onChange={(e) => setText(e.target.value)}
          placeholder="Paste the full job description here…"
          className="min-h-[200px] w-full resize-y rounded-xl border border-white/10 bg-white/[0.03] p-4 text-sm leading-relaxed placeholder:text-muted-foreground/70 focus-visible:border-white/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/10"
        />
        {error && <p className="text-sm text-amber-300">{error}</p>}

        <div className="flex flex-wrap items-center gap-2">
          <Button variant="silver" onClick={submit} disabled={busy || text.trim().length < 40}>
            {busy ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
            Analyze & rank pool
          </Button>
          <Button variant="outline" onClick={useOfficial} disabled={busy}>
            <RotateCcw className="size-4" /> Use official Senior AI Engineer JD
          </Button>
          {(text || result) && <Button variant="ghost" onClick={reset} disabled={busy}>Clear</Button>}
        </div>
      </div>

      {/* Right rail: pipeline / results */}
      <div className="space-y-4">
        <AnimatePresence mode="wait">
          {busy ? (
            <motion.div key="pipeline" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <Card>
                <CardHeader><CardTitle className="flex items-center gap-2"><Loader2 className="size-4 animate-spin text-silver" /> Running pipeline</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  {STEPS.map((s, i) => (
                    <div key={s} className="flex items-center gap-3 text-sm">
                      <span className={cn("grid size-6 place-items-center rounded-full border text-xs", i < step ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-300" : i === step ? "border-silver/40 bg-white/10 text-silver" : "border-white/10 text-muted-foreground")}>
                        {i < step ? <CheckCircle2 className="size-3.5" /> : i + 1}
                      </span>
                      <span className={cn(i <= step ? "text-foreground" : "text-muted-foreground")}>{s}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </motion.div>
          ) : result?.ok && result.job ? (
            <motion.div key="result" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
              <Card>
                <CardHeader>
                  <Badge variant="success" className="mb-1 w-fit"><CheckCircle2 className="size-3" /> Ranked</Badge>
                  <CardTitle>{result.job.title}</CardTitle>
                  <CardDescription>{result.job.parsed.seniority} · {result.job.experienceRequired}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Entity label="Required skills" items={result.job.parsed.requiredSkills.slice(0, 8)} />
                  <Entity label="Preferred skills" items={result.job.parsed.preferredSkills.slice(0, 6)} muted />
                  <Entity label="Anti-signals" items={result.job.parsed.antiSignals} danger />
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle className="text-sm">Top matches</CardTitle></CardHeader>
                <CardContent className="space-y-1.5">
                  {result.topPreview?.map((t, i) => (
                    <Link key={t.id} href={`/dashboard/candidates/${t.id}`} className="flex items-center gap-3 rounded-lg p-2 text-sm transition-colors hover:bg-white/[0.04]">
                      <span className="font-mono text-xs text-muted-foreground">{i + 1}</span>
                      <span className="min-w-0 flex-1 truncate">{t.name} <span className="text-muted-foreground">· {t.title}</span></span>
                      <span className="font-mono text-xs text-silver">{pct(t.score, 1)}</span>
                    </Link>
                  ))}
                  <Button asChild variant="outline" size="sm" className="mt-2 w-full">
                    <Link href="/dashboard/candidates">View full ranking <ArrowRight className="size-3.5" /></Link>
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          ) : (
            <motion.div key="hint" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <Card>
                <CardHeader><CardTitle className="text-sm">How it works</CardTitle></CardHeader>
                <CardContent className="space-y-3 text-sm text-muted-foreground">
                  {["We parse the JD into structured requirements & anti-signals.", "Each of the candidates is scored with the hybrid engine.", "Honeypots & keyword-stuffers are filtered automatically.", "You get an explained, exportable shortlist."].map((t, i) => (
                    <div key={i} className="flex gap-2.5"><span className="grid size-5 shrink-0 place-items-center rounded-full bg-white/[0.06] text-[11px] text-silver">{i + 1}</span>{t}</div>
                  ))}
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function Entity({ label, items, muted, danger }: { label: string; items: string[]; muted?: boolean; danger?: boolean }) {
  if (!items?.length) return null;
  return (
    <div>
      <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
      <div className="flex flex-wrap gap-1.5">
        {items.map((it) => (
          <span key={it} className={cn(
            "rounded-full border px-2.5 py-0.5 text-[11px]",
            danger ? "border-red-500/25 bg-red-500/[0.08] text-red-300/90" : muted ? "border-white/10 bg-white/[0.03] text-muted-foreground" : "border-white/15 bg-white/[0.06] text-foreground"
          )}>{it}</span>
        ))}
      </div>
    </div>
  );
}
