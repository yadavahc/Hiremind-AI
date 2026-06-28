"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Search, Download, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/shared/logo";

const TITLES: Record<string, string> = {
  "/dashboard": "Overview",
  "/dashboard/upload": "Upload Job Description",
  "/dashboard/candidates": "Candidate Ranking",
  "/dashboard/analytics": "Analytics",
  "/dashboard/recruiter": "AI Recruiter",
  "/dashboard/settings": "Settings",
};

export function Topbar() {
  const pathname = usePathname();
  const title = TITLES[pathname] ?? (pathname.startsWith("/dashboard/candidates/") ? "Candidate Profile" : "Dashboard");

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-4 border-b border-white/[0.08] bg-background/70 px-5 backdrop-blur-xl lg:px-8">
      <div className="flex items-center gap-3">
        <Link href="/" className="lg:hidden"><Logo showText={false} /></Link>
        <div>
          <h1 className="text-base font-semibold tracking-tight">{title}</h1>
          <p className="hidden text-xs text-muted-foreground sm:block">Senior AI Engineer — Founding Team · Redrob AI</p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Link href="/dashboard/candidates" className="hidden items-center gap-2 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-muted-foreground transition-colors hover:border-white/20 md:flex">
          <Search className="size-4" />
          <span>Search candidates…</span>
          <kbd className="ml-2 rounded border border-white/10 bg-white/5 px-1.5 text-[10px]">⌘K</kbd>
        </Link>
        <Button asChild variant="outline" size="sm">
          <a href="/api/export" download>
            <Download className="size-4" /> <span className="hidden sm:inline">Export CSV</span>
          </a>
        </Button>
        <Button asChild variant="silver" size="sm">
          <Link href="/dashboard/recruiter">
            <Sparkles className="size-4" /> <span className="hidden sm:inline">Ask AI</span>
          </Link>
        </Button>
      </div>
    </header>
  );
}
