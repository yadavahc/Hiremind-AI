"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Upload, Users, BarChart3, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/dashboard/upload", label: "Upload", icon: Upload },
  { href: "/dashboard/candidates", label: "Ranking", icon: Users },
  { href: "/dashboard/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/dashboard/recruiter", label: "AI", icon: MessageSquare },
];

export function MobileNav() {
  const pathname = usePathname();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 flex items-center justify-around border-t border-white/[0.08] bg-background/90 px-2 py-2 backdrop-blur-xl lg:hidden">
      {NAV.map((item) => {
        const active = item.href === "/dashboard" ? pathname === item.href : pathname.startsWith(item.href);
        return (
          <Link key={item.href} href={item.href} className={cn(
            "flex flex-col items-center gap-1 rounded-lg px-3 py-1.5 text-[10px] font-medium transition-colors",
            active ? "text-foreground" : "text-muted-foreground"
          )}>
            <item.icon className="size-5" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
