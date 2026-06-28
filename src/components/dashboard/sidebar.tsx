"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import {
  LayoutDashboard, Upload, Users, BarChart3, MessageSquare, Settings, ChevronRight,
} from "lucide-react";
import { Logo } from "@/components/shared/logo";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/dashboard/upload", label: "Upload JD", icon: Upload },
  { href: "/dashboard/candidates", label: "Candidates", icon: Users },
  { href: "/dashboard/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/dashboard/recruiter", label: "AI Recruiter", icon: MessageSquare },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-white/[0.08] bg-[#070708] p-4 lg:flex">
      <Link href="/" className="mb-8 flex items-center px-2 pt-2">
        <Logo />
      </Link>

      <nav className="flex flex-1 flex-col gap-1">
        <p className="mb-1 px-3 text-[11px] font-medium uppercase tracking-wider text-muted-foreground/60">Workspace</p>
        {NAV.map((item) => {
          const active = item.href === "/dashboard" ? pathname === item.href : pathname.startsWith(item.href);
          return (
            <Link key={item.href} href={item.href} className="relative">
              {active && (
                <motion.div
                  layoutId="sidebar-active"
                  className="absolute inset-0 rounded-xl border border-white/10 bg-white/[0.06]"
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                />
              )}
              <div className={cn(
                "relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors",
                active ? "text-foreground" : "text-muted-foreground hover:text-foreground"
              )}>
                <item.icon className="size-[18px]" />
                <span className="font-medium">{item.label}</span>
                {active && <ChevronRight className="ml-auto size-4 text-silver-muted" />}
              </div>
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto rounded-xl border border-white/[0.08] bg-gradient-to-b from-white/[0.04] to-transparent p-4">
        <div className="flex items-center gap-2 text-xs font-medium text-silver">
          <span className="relative flex size-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
            <span className="relative inline-flex size-2 rounded-full bg-emerald-400" />
          </span>
          Engine online
        </div>
        <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
          Ranking the Senior AI Engineer pool. Switch the active JD anytime from Upload.
        </p>
      </div>
    </aside>
  );
}
