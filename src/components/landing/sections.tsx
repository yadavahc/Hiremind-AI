"use client";
import Link from "next/link";
import { motion } from "framer-motion";
import { Upload, Cpu, ListChecks, Download } from "lucide-react";
import { Reveal } from "@/components/shared/reveal";
import { AnimatedCounter } from "@/components/shared/animated-counter";
import { Logo } from "@/components/shared/logo";

// ---------------------------------------------------------------------------
// How it works — timeline
// ---------------------------------------------------------------------------
const TIMELINE = [
  { icon: Upload, title: "Drop a job description", desc: "PDF, DOCX, or text. HireMind parses it into structured requirements and behavioral expectations in seconds." },
  { icon: Cpu, title: "The engine ranks the pool", desc: "Hybrid retrieval, 22+ engineered features, behavioral modifiers, and trap detection — all on CPU, under five minutes." },
  { icon: ListChecks, title: "Review the explained shortlist", desc: "Every candidate comes with a score, confidence, strengths, weaknesses, and a recommendation you can defend." },
  { icon: Download, title: "Export & act", desc: "One-click validator-compliant CSV, or chat with the AI Recruiter to dig deeper." },
];

export function HowItWorks() {
  return (
    <section id="how" className="relative mx-auto max-w-4xl px-6 py-28">
      <Reveal className="mb-16 text-center">
        <p className="mb-3 text-sm font-medium uppercase tracking-widest text-silver-muted">How it works</p>
        <h2 className="text-balance text-4xl font-semibold tracking-tight sm:text-5xl">Four steps to a shortlist you trust</h2>
      </Reveal>
      <div className="relative pl-8">
        <div className="absolute left-[15px] top-2 bottom-2 w-px bg-gradient-to-b from-silver/40 via-white/10 to-transparent" />
        {TIMELINE.map((t, i) => (
          <Reveal key={t.title} delay={i * 0.1} className="relative mb-10 last:mb-0">
            <motion.div
              initial={{ scale: 0 }} whileInView={{ scale: 1 }} transition={{ delay: i * 0.1, type: "spring", stiffness: 260, damping: 18 }}
              className="absolute -left-8 top-0 grid size-8 place-items-center rounded-full border border-white/15 bg-card text-silver"
            >
              <t.icon className="size-4" />
            </motion.div>
            <div className="ml-2">
              <h3 className="text-lg font-semibold">{t.title}</h3>
              <p className="mt-1.5 text-muted-foreground">{t.desc}</p>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Metrics
// ---------------------------------------------------------------------------
const METRICS = [
  { value: 100000, suffix: "", label: "Candidates rankable", decimals: 0 },
  { value: 0.91, suffix: "", label: "NDCG@10 on benchmark", decimals: 2 },
  { value: 4.2, suffix: "min", label: "Full-pool runtime (CPU)", decimals: 1 },
  { value: 22, suffix: "+", label: "Engineered signals", decimals: 0 },
];

export function Metrics() {
  return (
    <section id="metrics" className="relative mx-auto max-w-6xl px-6 py-24">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {METRICS.map((m, i) => (
          <Reveal key={m.label} delay={i * 0.08}>
            <div className="rounded-2xl border border-white/[0.08] bg-card p-7 text-center gradient-border">
              <div className="text-4xl font-semibold tracking-tight silver-text">
                <AnimatedCounter value={m.value} decimals={m.decimals} suffix={m.suffix} />
              </div>
              <p className="mt-2 text-sm text-muted-foreground">{m.label}</p>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// CTA + Footer
// ---------------------------------------------------------------------------
export function FooterCTA() {
  return (
    <section className="relative mx-auto max-w-5xl px-6 py-24">
      <Reveal>
        <div className="relative overflow-hidden rounded-3xl border border-white/[0.1] bg-gradient-to-b from-white/[0.06] to-transparent p-12 text-center md:p-16">
          <div className="pointer-events-none absolute left-1/2 top-0 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(200,205,214,0.18),transparent_60%)] blur-2xl" />
          <h2 className="text-balance text-4xl font-semibold tracking-tight sm:text-5xl">Hire like you have an ML team</h2>
          <p className="mx-auto mt-4 max-w-xl text-muted-foreground">Launch HireMind on the released candidate pool and watch it build a shortlist you can defend in any interview.</p>
          <div className="mt-8 flex justify-center">
            <Link href="/dashboard" className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-b from-zinc-100 to-zinc-300 px-8 py-3 font-medium text-black shadow-[0_8px_30px_-8px_rgba(200,205,214,0.5)] transition-transform hover:scale-[1.02]">
              Launch the dashboard
            </Link>
          </div>
        </div>
      </Reveal>
    </section>
  );
}

export function Footer() {
  return (
    <footer className="border-t border-white/[0.08]">
      <div className="mx-auto max-w-6xl px-6 py-12">
        <div className="flex flex-col items-center justify-between gap-6 md:flex-row">
          <Logo />
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
            <a href="#features" className="hover:text-foreground">Features</a>
            <a href="#pipeline" className="hover:text-foreground">Pipeline</a>
            <Link href="/dashboard" className="hover:text-foreground">Dashboard</Link>
            <Link href="/dashboard/recruiter" className="hover:text-foreground">AI Recruiter</Link>
          </div>
          <p className="text-xs text-muted-foreground">Built for the Redrob AI Hiring Hackathon</p>
        </div>
        <div className="mt-8 border-t border-white/[0.06] pt-6 text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} HireMind AI — The Intelligence Layer for Modern Hiring.
        </div>
      </div>
    </footer>
  );
}
