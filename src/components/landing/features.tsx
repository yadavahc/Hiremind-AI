"use client";
import { motion } from "framer-motion";
import { Brain, Search, ShieldCheck, Gauge, GitBranch, MessagesSquare } from "lucide-react";
import { Reveal } from "@/components/shared/reveal";
import { cn } from "@/lib/utils";

const FEATURES = [
  {
    icon: Brain,
    title: "Semantic JD understanding",
    desc: "Extracts required & preferred skills, seniority, industry, and behavioral traits — then reasons about what the role actually means, not just what it says.",
    span: "md:col-span-2",
    visual: "concept",
  },
  {
    icon: ShieldCheck,
    title: "Trap-aware ranking",
    desc: "Detects keyword-stuffers, consulting-only careers, and honeypots with impossible profiles. They sink; real builders rise.",
    span: "",
    visual: "shield",
  },
  {
    icon: Search,
    title: "Hybrid retrieval",
    desc: "BM25 + dense embeddings + cross-encoder re-ranking fused into one calibrated score.",
    span: "",
    visual: "search",
  },
  {
    icon: GitBranch,
    title: "Explainable every time",
    desc: "Strengths, weaknesses, and a recommendation for every candidate — grounded in real profile facts, never hallucinated.",
    span: "md:col-span-2",
    visual: "explain",
  },
  {
    icon: Gauge,
    title: "Behavioral signals",
    desc: "Down-weights dormant, unresponsive candidates. A perfect résumé that never replies isn't actually hireable.",
    span: "",
    visual: "gauge",
  },
  {
    icon: MessagesSquare,
    title: "AI Recruiter chat",
    desc: "Ask in plain English: \"best backend engineers with LLM experience\" — and get an answer over your ranked pool.",
    span: "md:col-span-2",
    visual: "chat",
  },
];

export function Features() {
  return (
    <section id="features" className="relative mx-auto max-w-6xl px-6 py-28">
      <Reveal className="mx-auto mb-16 max-w-2xl text-center">
        <p className="mb-3 text-sm font-medium uppercase tracking-widest text-silver-muted">Capabilities</p>
        <h2 className="text-balance text-4xl font-semibold tracking-tight sm:text-5xl">
          An intelligence layer, not a keyword filter
        </h2>
        <p className="mt-4 text-muted-foreground">
          Every part of the pipeline is built to find the candidate a great recruiter would find — and to prove why.
        </p>
      </Reveal>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {FEATURES.map((f, i) => (
          <Reveal key={f.title} delay={i * 0.06} className={cn(f.span)}>
            <FeatureCard {...f} index={i} />
          </Reveal>
        ))}
      </div>
    </section>
  );
}

function FeatureCard({ icon: Icon, title, desc, visual }: (typeof FEATURES)[number] & { index: number }) {
  return (
    <motion.div
      whileHover={{ y: -4 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
      className="group relative h-full overflow-hidden rounded-2xl border border-white/[0.08] bg-card p-6 gradient-border"
    >
      <div className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-[radial-gradient(circle,rgba(200,205,214,0.1),transparent_70%)] opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
      <div className="mb-4 inline-flex size-11 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-silver transition-colors group-hover:border-white/20">
        <Icon className="size-5" />
      </div>
      <h3 className="mb-2 text-lg font-semibold tracking-tight">{title}</h3>
      <p className="text-sm leading-relaxed text-muted-foreground">{desc}</p>
      <FeatureVisual variant={visual} />
    </motion.div>
  );
}

function FeatureVisual({ variant }: { variant: string }) {
  if (variant === "concept") {
    const tags = ["embeddings", "retrieval", "ranking", "NDCG", "vector DB", "LoRA", "BM25", "FAISS"];
    return (
      <div className="mt-5 flex flex-wrap gap-1.5">
        {tags.map((t, i) => (
          <motion.span
            key={t}
            initial={{ opacity: 0.4 }}
            whileInView={{ opacity: 1 }}
            transition={{ delay: i * 0.05 }}
            className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-xs text-muted-foreground"
          >
            {t}
          </motion.span>
        ))}
      </div>
    );
  }
  if (variant === "gauge") {
    return (
      <div className="mt-5 space-y-2">
        {[{ l: "Responsive", v: 86, c: "from-emerald-400 to-emerald-600" }, { l: "Dormant", v: 22, c: "from-amber-400 to-red-500" }].map((b) => (
          <div key={b.l}>
            <div className="mb-1 flex justify-between text-[11px] text-muted-foreground"><span>{b.l}</span><span>{b.v}%</span></div>
            <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
              <motion.div initial={{ width: 0 }} whileInView={{ width: `${b.v}%` }} transition={{ duration: 1 }} className={cn("h-full rounded-full bg-gradient-to-r", b.c)} />
            </div>
          </div>
        ))}
      </div>
    );
  }
  if (variant === "shield") {
    return (
      <div className="mt-5 flex items-center gap-2 text-xs">
        <span className="rounded-md border border-red-500/30 bg-red-500/10 px-2 py-1 text-red-300 line-through opacity-70">keyword-stuffer</span>
        <span className="text-muted-foreground">→ rank 700+</span>
      </div>
    );
  }
  if (variant === "explain") {
    return (
      <div className="mt-5 grid grid-cols-2 gap-2 text-xs">
        <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/[0.06] p-2.5 text-emerald-300/90">+ 7y applied ML at product co.</div>
        <div className="rounded-lg border border-amber-500/20 bg-amber-500/[0.06] p-2.5 text-amber-300/90">− 90-day notice period</div>
      </div>
    );
  }
  if (variant === "chat") {
    return (
      <div className="mt-5 space-y-2">
        <div className="ml-auto w-fit rounded-2xl rounded-br-sm border border-white/10 bg-white/[0.06] px-3 py-1.5 text-xs">Find LLM engineers in Pune</div>
        <div className="w-fit rounded-2xl rounded-bl-sm border border-white/10 bg-gradient-to-b from-white/[0.08] to-transparent px-3 py-1.5 text-xs text-muted-foreground">3 strong matches — top is a Search Engineer, 7.6y…</div>
      </div>
    );
  }
  return (
    <div className="mt-5 flex items-end gap-1">
      {[40, 70, 55, 90, 65, 80, 50].map((h, i) => (
        <motion.div key={i} initial={{ height: 0 }} whileInView={{ height: h * 0.5 }} transition={{ delay: i * 0.05, duration: 0.6 }} className="w-3 rounded-t bg-gradient-to-t from-white/10 to-silver/40" />
      ))}
    </div>
  );
}
