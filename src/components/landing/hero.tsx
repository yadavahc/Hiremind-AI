"use client";
import Link from "next/link";
import dynamic from "next/dynamic";
import { motion } from "framer-motion";
import { ArrowRight, Sparkles, Play } from "lucide-react";
import { Button } from "@/components/ui/button";

const HeroCanvas = dynamic(() => import("./hero-canvas"), {
  ssr: false,
  loading: () => null,
});

const fadeUp = {
  hidden: { opacity: 0, y: 28 },
  show: (i: number) => ({
    opacity: 1, y: 0,
    transition: { duration: 0.8, delay: 0.15 + i * 0.1, ease: [0.16, 1, 0.3, 1] as const },
  }),
};

export function Hero() {
  return (
    <section className="relative flex min-h-[100svh] flex-col items-center justify-center overflow-hidden px-6 pb-16 pt-28 sm:pt-24">
      {/* Three.js background */}
      <div className="absolute inset-0 -z-10">
        <HeroCanvas />
      </div>
      <div className="pointer-events-none absolute inset-0 -z-10 grid-bg radial-fade opacity-60" />
      {/* Gradient glow */}
      <div className="pointer-events-none absolute left-1/2 top-1/3 -z-10 h-[42rem] w-[42rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(200,205,214,0.12),transparent_60%)] blur-2xl animate-pulse-glow" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-64 bg-gradient-to-t from-background to-transparent" />

      <div className="flex max-w-4xl flex-col items-center text-center">
        <motion.div custom={0} variants={fadeUp} initial="hidden" animate="show">
          <Link href="/dashboard" className="group mb-7 inline-flex max-w-[92vw] flex-wrap items-center justify-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-1.5 text-center text-[11px] text-muted-foreground backdrop-blur transition-colors hover:border-white/20 hover:text-foreground sm:text-xs">
            <Sparkles className="size-3.5 shrink-0 text-silver" />
            Built on Gemini 2.5 · BGE embeddings · hybrid retrieval
            <ArrowRight className="size-3 shrink-0 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </motion.div>

        <motion.h1 custom={1} variants={fadeUp} initial="hidden" animate="show" className="text-balance text-[2.6rem] font-semibold leading-[1.06] tracking-tight sm:text-6xl md:text-7xl">
          <span className="silver-text silver-glow">The Future</span>
          <br />
          <span className="text-foreground">of AI Hiring</span>
        </motion.h1>

        <motion.p custom={2} variants={fadeUp} initial="hidden" animate="show" className="mt-5 max-w-2xl text-balance text-base leading-relaxed text-muted-foreground sm:mt-6 sm:text-lg">
          HireMind reads a job description the way your best recruiter would — understanding
          intent, not keywords. It ranks every candidate, explains each decision, and hands you a
          shortlist you can actually trust.
        </motion.p>

        <motion.div custom={3} variants={fadeUp} initial="hidden" animate="show" className="mt-9 flex flex-col items-center gap-3 sm:flex-row">
          <Button asChild variant="silver" size="lg" className="group">
            <Link href="/dashboard">
              Rank candidates now
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link href="/dashboard/candidates">
              <Play className="size-4" /> See live ranking
            </Link>
          </Button>
        </motion.div>

        <motion.div custom={4} variants={fadeUp} initial="hidden" animate="show" className="mt-12 flex flex-wrap items-center justify-center gap-4 text-xs text-muted-foreground sm:gap-6">
          <Stat value="100K" label="Candidate pool" />
          <div className="h-8 w-px bg-white/10" />
          <Stat value="< 5 min" label="CPU-only ranking" />
          <div className="h-8 w-px bg-white/10" />
          <Stat value="22+" label="Engineered signals" />
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.4 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2"
      >
        <div className="flex h-9 w-5 items-start justify-center rounded-full border border-white/15 p-1.5">
          <motion.div animate={{ y: [0, 8, 0] }} transition={{ duration: 1.6, repeat: Infinity }} className="h-1.5 w-1 rounded-full bg-silver" />
        </div>
      </motion.div>
    </section>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex flex-col items-center">
      <span className="text-base font-semibold text-foreground">{value}</span>
      <span>{label}</span>
    </div>
  );
}
