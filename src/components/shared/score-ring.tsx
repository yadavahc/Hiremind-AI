"use client";
import { useEffect, useRef, useState } from "react";
import { useInView } from "framer-motion";
import { cn } from "@/lib/utils";

interface ScoreRingProps {
  value: number; // 0..1
  size?: number;
  stroke?: number;
  className?: string;
  label?: string;
}

export function ScoreRing({ value, size = 72, stroke = 6, className, label }: ScoreRingProps) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true });
  const [progress, setProgress] = useState(0);
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(1, value));

  useEffect(() => {
    if (!inView) return;
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / 1100);
      setProgress(pct * (1 - Math.pow(1 - t, 3)));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, pct]);

  const color = pct >= 0.78 ? "#34d399" : pct >= 0.6 ? "#38bdf8" : pct >= 0.42 ? "#fbbf24" : "#a1a1aa";

  return (
    <div ref={ref} className={cn("relative inline-flex items-center justify-center", className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={stroke} />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c - progress * c}
          style={{ filter: `drop-shadow(0 0 6px ${color}66)`, transition: "stroke 0.3s" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-mono font-semibold tabular-nums" style={{ fontSize: size * 0.26, color }}>
          {Math.round(progress * 100)}
        </span>
        {label && <span className="text-[9px] uppercase tracking-wider text-muted-foreground">{label}</span>}
      </div>
    </div>
  );
}
