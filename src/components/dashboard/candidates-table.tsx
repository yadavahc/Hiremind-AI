"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import {
  Search, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, ShieldAlert,
  ArrowUpDown, Loader2, ExternalLink, Filter,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { cn, pct, scoreColor, recBadge } from "@/lib/utils";

interface Row {
  id: string; name: string; title: string; company: string; location: string;
  years: number; rank: number; score: number; confidence: number;
  recommendation: string; reasoning: string; isHoneypot: boolean;
  components: Record<string, number>; topSkills: string[];
}

const RECS = ["all", "Strong Hire", "Interview", "Maybe", "Pass"];
const SORTS = [
  { key: "rank", label: "Rank" },
  { key: "score", label: "Score" },
  { key: "experience", label: "Experience" },
  { key: "confidence", label: "Confidence" },
] as const;

export function CandidatesTable() {
  const [rows, setRows] = useState<Row[]>([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [rec, setRec] = useState("all");
  const [hideHoneypots, setHideHoneypots] = useState(true);
  const [sort, setSort] = useState<(typeof SORTS)[number]["key"]>("rank");
  const [dir, setDir] = useState<"asc" | "desc">("asc");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search), 280);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => { setPage(1); }, [debounced, rec, hideHoneypots, sort, dir]);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({
      search: debounced, rec, hideHoneypots: hideHoneypots ? "1" : "0",
      sort, dir, page: String(page), pageSize: "12",
    });
    fetch(`/api/candidates?${params}`)
      .then((r) => r.json())
      .then((d) => { setRows(d.rows); setTotal(d.total); setPages(d.pages); })
      .finally(() => setLoading(false));
  }, [debounced, rec, hideHoneypots, sort, dir, page]);

  const toggleSort = (key: typeof sort) => {
    if (sort === key) setDir(dir === "asc" ? "desc" : "asc");
    else { setSort(key); setDir(key === "rank" ? "asc" : "desc"); }
  };

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name, title, skill, ID…" className="pl-9" />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex flex-wrap items-center gap-1 rounded-lg border border-white/10 bg-white/[0.03] p-1">
            <Filter className="ml-1.5 size-3.5 text-muted-foreground" />
            {RECS.map((r) => (
              <button key={r} onClick={() => setRec(r)} className={cn(
                "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                rec === r ? "bg-white/10 text-foreground" : "text-muted-foreground hover:text-foreground"
              )}>{r === "all" ? "All" : r}</button>
            ))}
          </div>
          <button onClick={() => setHideHoneypots(!hideHoneypots)} className={cn(
            "inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium transition-colors",
            hideHoneypots ? "border-red-500/30 bg-red-500/10 text-red-300" : "border-white/10 bg-white/[0.03] text-muted-foreground"
          )}>
            <ShieldAlert className="size-3.5" /> {hideHoneypots ? "Honeypots hidden" : "Honeypots shown"}
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-white/[0.08] bg-card">
        {/* Header */}
        <div className="hidden grid-cols-[48px_1fr_140px_120px_120px_88px] items-center gap-3 border-b border-white/[0.08] px-4 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground md:grid">
          <button onClick={() => toggleSort("rank")} className="flex items-center gap-1 hover:text-foreground"># <SortIcon active={sort === "rank"} dir={dir} /></button>
          <span>Candidate</span>
          <button onClick={() => toggleSort("experience")} className="flex items-center gap-1 hover:text-foreground">Experience <SortIcon active={sort === "experience"} dir={dir} /></button>
          <button onClick={() => toggleSort("confidence")} className="flex items-center gap-1 hover:text-foreground">Confidence <SortIcon active={sort === "confidence"} dir={dir} /></button>
          <button onClick={() => toggleSort("score")} className="flex items-center gap-1 hover:text-foreground">Score <SortIcon active={sort === "score"} dir={dir} /></button>
          <span className="text-right">Details</span>
        </div>

        {/* Rows */}
        <div className="relative divide-y divide-white/[0.05]">
          {loading && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/40 backdrop-blur-sm">
              <Loader2 className="size-5 animate-spin text-silver" />
            </div>
          )}
          {rows.length === 0 && !loading && (
            <div className="py-16 text-center text-sm text-muted-foreground">No candidates match these filters.</div>
          )}
          {rows.map((row) => {
            const rec = recBadge(row.recommendation);
            const open = expanded === row.id;
            return (
              <div key={row.id} className={cn("transition-colors", open && "bg-white/[0.02]")}>
                <button
                  onClick={() => setExpanded(open ? null : row.id)}
                  className="grid w-full grid-cols-[48px_1fr_auto] items-center gap-3 px-4 py-3 text-left md:grid-cols-[48px_1fr_140px_120px_120px_88px]"
                >
                  <div className="flex items-center gap-1 font-mono text-sm text-muted-foreground">
                    {row.rank <= 3 ? <span className={cn("grid size-6 place-items-center rounded-md text-xs font-bold", row.rank === 1 ? "bg-amber-400/20 text-amber-300" : row.rank === 2 ? "bg-zinc-300/20 text-zinc-200" : "bg-orange-700/20 text-orange-300")}>{row.rank}</span> : row.rank}
                  </div>
                  <div className="flex min-w-0 items-center gap-3">
                    <Avatar name={row.name} id={row.id} size={38} />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-sm font-medium">{row.name}</p>
                        {row.isHoneypot && <Badge variant="danger" className="px-1.5 py-0 text-[10px]">honeypot</Badge>}
                      </div>
                      <p className="truncate text-xs text-muted-foreground">{row.title} · {row.location}</p>
                      {/* Mobile-only: surface score, verdict, experience (hidden on md+) */}
                      <div className="mt-1.5 flex items-center gap-2 md:hidden">
                        <span className={cn("font-mono text-xs font-semibold", scoreColor(row.score))}>{pct(row.score, 1)}</span>
                        <Badge variant="outline" className={cn("px-1.5 py-0 text-[10px]", rec.className)}>{rec.label}</Badge>
                        <span className="text-[11px] text-muted-foreground">{row.years}y</span>
                      </div>
                    </div>
                  </div>
                  <div className="hidden text-sm md:block">{row.years}<span className="text-muted-foreground"> yrs</span></div>
                  <div className="hidden md:block">
                    <div className="flex items-center gap-2">
                      <Progress value={row.confidence} className="h-1.5 w-14" />
                      <span className="font-mono text-xs text-muted-foreground">{row.confidence}</span>
                    </div>
                  </div>
                  <div className="hidden items-center gap-2 md:flex">
                    <Badge variant="outline" className={cn("hidden lg:inline-flex", rec.className)}>{rec.label}</Badge>
                    <span className={cn("font-mono text-sm font-semibold", scoreColor(row.score))}>{pct(row.score, 1)}</span>
                  </div>
                  <div className="flex justify-end">
                    {open ? <ChevronUp className="size-4 text-muted-foreground" /> : <ChevronDown className="size-4 text-muted-foreground" />}
                  </div>
                </button>

                <AnimatePresence initial={false}>
                  {open && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                      className="overflow-hidden"
                    >
                      <div className="grid gap-4 px-4 pb-5 pt-1 md:grid-cols-[1fr_280px]">
                        <div className="space-y-3">
                          <div>
                            <p className="mb-1 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">AI reasoning</p>
                            <p className="text-sm leading-relaxed text-foreground/90">{row.reasoning}</p>
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {row.topSkills.map((s) => <Badge key={s} variant="default" className="text-[11px]">{s}</Badge>)}
                          </div>
                          <Link href={`/dashboard/candidates/${row.id}`} className="inline-flex items-center gap-1.5 text-xs font-medium text-silver hover:underline">
                            Full profile <ExternalLink className="size-3" />
                          </Link>
                        </div>
                        <div className="space-y-2 rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
                          {Object.entries(row.components).map(([k, v]) => (
                            <div key={k}>
                              <div className="mb-1 flex justify-between text-[11px]">
                                <span className="capitalize text-muted-foreground">{k === "cultureFit" ? "Culture fit" : k}</span>
                                <span className="font-mono">{v}</span>
                              </div>
                              <Progress value={v} className="h-1" />
                            </div>
                          ))}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>{total.toLocaleString()} candidates · page {page} of {pages}</span>
        <div className="flex items-center gap-1">
          <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="grid size-9 place-items-center rounded-lg border border-white/10 bg-white/[0.03] transition-colors hover:border-white/20 disabled:opacity-40"><ChevronLeft className="size-4" /></button>
          <button disabled={page >= pages} onClick={() => setPage((p) => p + 1)} className="grid size-9 place-items-center rounded-lg border border-white/10 bg-white/[0.03] transition-colors hover:border-white/20 disabled:opacity-40"><ChevronRight className="size-4" /></button>
        </div>
      </div>
    </div>
  );
}

function SortIcon({ active, dir }: { active: boolean; dir: "asc" | "desc" }) {
  if (!active) return <ArrowUpDown className="size-3 opacity-40" />;
  return dir === "asc" ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />;
}
