import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatNumber(n: number): string {
  return new Intl.NumberFormat("en-US").format(n);
}

export function pct(n: number, digits = 0): string {
  return `${(n * 100).toFixed(digits)}%`;
}

/** Deterministic gradient for an avatar from an id. */
export function avatarGradient(id: string): string {
  const palettes = [
    ["#e2e8f0", "#94a3b8"], ["#cbd5e1", "#64748b"], ["#f1f5f9", "#a1a1aa"],
    ["#d1d5db", "#6b7280"], ["#e5e7eb", "#9ca3af"], ["#dbeafe", "#93c5fd"],
  ];
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  const [a, b] = palettes[h % palettes.length];
  return `linear-gradient(135deg, ${a}, ${b})`;
}

export function initials(name: string): string {
  return name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}

export function scoreColor(score: number): string {
  if (score >= 0.78) return "text-emerald-400";
  if (score >= 0.6) return "text-sky-400";
  if (score >= 0.42) return "text-amber-400";
  return "text-zinc-400";
}

export function recBadge(rec: string): { label: string; className: string } {
  switch (rec) {
    case "Strong Hire": return { label: "Strong Hire", className: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30" };
    case "Interview": return { label: "Interview", className: "bg-sky-500/15 text-sky-300 border-sky-500/30" };
    case "Maybe": return { label: "Maybe", className: "bg-amber-500/15 text-amber-300 border-amber-500/30" };
    default: return { label: "Pass", className: "bg-zinc-500/15 text-zinc-400 border-zinc-500/30" };
  }
}
