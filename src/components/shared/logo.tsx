import { cn } from "@/lib/utils";

export function Logo({ className, showText = true }: { className?: string; showText?: boolean }) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <div className="relative grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-zinc-100 to-zinc-400 shadow-[0_4px_16px_-4px_rgba(200,205,214,0.5)]">
        <svg viewBox="0 0 24 24" className="h-5 w-5 text-black" fill="none">
          <path d="M12 2c1.6 0 3 1.3 3 3 1.7.2 3 1.6 3 3.4 0 .5-.1 1-.3 1.4 1 .6 1.6 1.7 1.6 2.9 0 1.3-.7 2.4-1.8 3 .1.4.2.8.2 1.2 0 1.8-1.4 3.2-3.2 3.2-.4 0-.8-.1-1.2-.2-.5 1-1.6 1.7-2.8 1.7s-2.3-.7-2.8-1.7c-.4.1-.8.2-1.2.2C6.4 21.7 5 20.3 5 18.5c0-.4.1-.8.2-1.2C4.1 16.7 3.4 15.6 3.4 14.3c0-1.2.6-2.3 1.6-2.9-.2-.4-.3-.9-.3-1.4 0-1.8 1.3-3.2 3-3.4 0-1.7 1.4-3 3-3z" stroke="currentColor" strokeWidth="1.3" />
          <circle cx="12" cy="12" r="2.2" fill="currentColor" />
        </svg>
      </div>
      {showText && (
        <span className="text-[15px] font-semibold tracking-tight">
          HireMind<span className="text-silver-muted"> AI</span>
        </span>
      )}
    </div>
  );
}
