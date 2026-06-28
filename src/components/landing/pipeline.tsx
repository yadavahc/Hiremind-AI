"use client";
import { motion } from "framer-motion";
import { FileText, Boxes, Search, SlidersHorizontal, Layers, Sparkles, Trophy } from "lucide-react";
import { Reveal } from "@/components/shared/reveal";

const STEPS = [
  { icon: FileText, title: "Parse JD", desc: "Extract skills, seniority, traits & anti-signals" },
  { icon: Boxes, title: "Embed", desc: "BGE embeddings for JD + every candidate" },
  { icon: Search, title: "Hybrid retrieve", desc: "FAISS dense search fused with BM25" },
  { icon: SlidersHorizontal, title: "Engineer features", desc: "22+ signals: skills, stability, behavior" },
  { icon: Layers, title: "Cross-encode", desc: "Re-rank the candidates that survive" },
  { icon: Sparkles, title: "Explain", desc: "Gemini-grounded reasoning per candidate" },
  { icon: Trophy, title: "Rank", desc: "Calibrated, trap-aware shortlist" },
];

export function Pipeline() {
  return (
    <section id="pipeline" className="relative mx-auto max-w-6xl px-6 py-28">
      <div className="pointer-events-none absolute left-1/2 top-1/2 -z-10 h-[30rem] w-[30rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(200,205,214,0.06),transparent_70%)]" />
      <Reveal className="mx-auto mb-16 max-w-2xl text-center">
        <p className="mb-3 text-sm font-medium uppercase tracking-widest text-silver-muted">The pipeline</p>
        <h2 className="text-balance text-4xl font-semibold tracking-tight sm:text-5xl">From job description to defensible shortlist</h2>
        <p className="mt-4 text-muted-foreground">Seven stages, fully offline, under five minutes on CPU.</p>
      </Reveal>

      <div className="relative">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-7">
          {STEPS.map((s, i) => (
            <Reveal key={s.title} delay={i * 0.08}>
              <div className="group relative flex h-full flex-col items-center rounded-2xl border border-white/[0.08] bg-card p-5 text-center transition-colors hover:border-white/20">
                <div className="relative mb-3">
                  <div className="absolute inset-0 rounded-xl bg-silver/20 blur-md opacity-0 transition-opacity group-hover:opacity-100" />
                  <div className="relative grid size-12 place-items-center rounded-xl border border-white/10 bg-gradient-to-b from-white/[0.08] to-transparent text-silver">
                    <s.icon className="size-5" />
                  </div>
                  <span className="absolute -right-1 -top-1 grid size-5 place-items-center rounded-full bg-silver text-[10px] font-bold text-black">{i + 1}</span>
                </div>
                <h3 className="text-sm font-semibold">{s.title}</h3>
                <p className="mt-1 text-[11px] leading-snug text-muted-foreground">{s.desc}</p>
                {i < STEPS.length - 1 && (
                  <motion.div
                    initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} transition={{ delay: i * 0.08 + 0.3 }}
                    className="absolute right-[-10px] top-1/2 z-10 hidden -translate-y-1/2 text-white/20 lg:block"
                  >
                    <svg width="20" height="12" viewBox="0 0 20 12" fill="none"><path d="M0 6h17m0 0l-5-5m5 5l-5 5" stroke="currentColor" strokeWidth="1.4" /></svg>
                  </motion.div>
                )}
              </div>
            </Reveal>
          ))}
        </div>
        <motion.div
          initial={{ scaleX: 0 }} whileInView={{ scaleX: 1 }} transition={{ duration: 1.4, ease: "easeOut" }}
          className="mx-auto mt-8 hidden h-px w-full max-w-4xl origin-left bg-gradient-to-r from-transparent via-silver/40 to-transparent lg:block"
        />
      </div>
    </section>
  );
}
