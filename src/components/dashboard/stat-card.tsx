"use client";
import { motion } from "framer-motion";
import {
  TrendingUp, TrendingDown, Users, Trophy, Target, ShieldAlert, Layers,
  Activity, Sparkles, type LucideIcon,
} from "lucide-react";
import { AnimatedCounter } from "@/components/shared/animated-counter";
import { cn } from "@/lib/utils";

// Server components can't pass a component across the boundary, so they pass a
// string key and we resolve the icon here (client side).
const ICONS = {
  users: Users, trophy: Trophy, target: Target, shieldAlert: ShieldAlert,
  layers: Layers, activity: Activity, sparkles: Sparkles,
} satisfies Record<string, LucideIcon>;

export type StatIcon = keyof typeof ICONS;

interface StatCardProps {
  icon: StatIcon;
  label: string;
  value: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  delta?: string;
  trend?: "up" | "down";
  index?: number;
}

export function StatCard({ icon, label, value, decimals = 0, prefix, suffix, delta, trend, index = 0 }: StatCardProps) {
  const Icon = ICONS[icon];
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.07, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="group relative overflow-hidden rounded-2xl border border-white/[0.08] bg-card p-5 gradient-border"
    >
      <div className="pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full bg-[radial-gradient(circle,rgba(200,205,214,0.1),transparent_70%)] opacity-0 transition-opacity group-hover:opacity-100" />
      <div className="mb-3 flex items-center justify-between">
        <div className="grid size-9 place-items-center rounded-lg border border-white/10 bg-white/[0.04] text-silver">
          <Icon className="size-[18px]" />
        </div>
        {delta && (
          <span className={cn(
            "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium",
            trend === "down" ? "bg-red-500/10 text-red-300" : "bg-emerald-500/10 text-emerald-300"
          )}>
            {trend === "down" ? <TrendingDown className="size-3" /> : <TrendingUp className="size-3" />}
            {delta}
          </span>
        )}
      </div>
      <div className="text-2xl font-semibold tracking-tight tabular-nums">
        <AnimatedCounter value={value} decimals={decimals} prefix={prefix} suffix={suffix} />
      </div>
      <p className="mt-1 text-sm text-muted-foreground">{label}</p>
    </motion.div>
  );
}
