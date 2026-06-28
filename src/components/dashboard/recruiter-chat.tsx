"use client";
import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Sparkles, Loader2, User, Bot, Zap } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { cn, pct, recBadge } from "@/lib/utils";

interface Chip { id: string; name: string; title: string; rank: number; score: number; recommendation: string; }
interface Msg { role: "user" | "assistant"; content: string; candidates?: Chip[]; usedGemini?: boolean; }

const SUGGESTIONS = [
  "Show me the best ML engineers",
  "Find candidates with LLM experience",
  "Why is the top candidate ranked first?",
  "Which candidates have vector DB experience?",
];

export function RecruiterChat() {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, busy]);

  const send = async (text: string) => {
    const q = text.trim();
    if (!q || busy) return;
    setInput("");
    setMessages((m) => [...m, { role: "user", content: q }]);
    setBusy(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: q }),
      });
      const data = await res.json();
      setMessages((m) => [...m, { role: "assistant", content: data.answer ?? data.error ?? "No response.", candidates: data.candidates, usedGemini: data.usedGemini }]);
    } catch {
      setMessages((m) => [...m, { role: "assistant", content: "Network error — please try again." }]);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex h-[calc(100dvh-13rem)] flex-col overflow-hidden rounded-2xl border border-white/[0.08] bg-card lg:h-[calc(100vh-9rem)]">
      {/* messages */}
      <div ref={scrollRef} className="flex-1 space-y-5 overflow-y-auto p-5 lg:p-6">
        {messages.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="mb-4 grid size-14 place-items-center rounded-2xl border border-white/10 bg-white/[0.04] text-silver">
              <Sparkles className="size-7" />
            </motion.div>
            <h3 className="text-lg font-semibold">Ask the AI Recruiter</h3>
            <p className="mt-1 max-w-md text-sm text-muted-foreground">Query the ranked pool in plain English. Grounded in real candidate data — no hallucinated profiles.</p>
            <div className="mt-6 grid w-full max-w-lg grid-cols-1 gap-2 sm:grid-cols-2">
              {SUGGESTIONS.map((s) => (
                <button key={s} onClick={() => send(s)} className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-left text-sm transition-colors hover:border-white/25 hover:bg-white/[0.05]">
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        <AnimatePresence initial={false}>
          {messages.map((m, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={cn("flex gap-3", m.role === "user" && "flex-row-reverse")}>
              <div className={cn("grid size-8 shrink-0 place-items-center rounded-lg border", m.role === "user" ? "border-white/15 bg-white/[0.06]" : "border-silver/20 bg-gradient-to-b from-white/10 to-transparent text-silver")}>
                {m.role === "user" ? <User className="size-4" /> : <Bot className="size-4" />}
              </div>
              <div className={cn("min-w-0 max-w-[85%] space-y-2", m.role === "user" && "items-end")}>
                <div className={cn("rounded-2xl px-4 py-2.5 text-sm leading-relaxed", m.role === "user" ? "rounded-tr-sm bg-white/[0.08]" : "rounded-tl-sm border border-white/[0.06] bg-white/[0.02]")}>
                  <Markdown text={m.content} />
                  {m.role === "assistant" && (
                    <div className="mt-2 flex items-center gap-1.5 text-[10px] text-muted-foreground">
                      <Zap className="size-3" />{m.usedGemini ? "Gemini 2.5 Flash" : "Local ranking engine"}
                    </div>
                  )}
                </div>
                {m.candidates && m.candidates.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {m.candidates.map((c) => {
                      const rec = recBadge(c.recommendation);
                      return (
                        <Link key={c.id} href={`/dashboard/candidates/${c.id}`} className="group inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.03] py-1 pl-1 pr-2.5 text-xs transition-colors hover:border-white/25">
                          <Avatar name={c.name} id={c.id} size={22} />
                          <span className="font-medium">{c.name}</span>
                          <span className="text-muted-foreground">#{c.rank}</span>
                          <Badge variant="outline" className={cn("hidden px-1.5 py-0 text-[10px] sm:inline-flex", rec.className)}>{pct(c.score, 0)}</Badge>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {busy && (
          <div className="flex gap-3">
            <div className="grid size-8 place-items-center rounded-lg border border-silver/20 bg-gradient-to-b from-white/10 to-transparent text-silver"><Bot className="size-4" /></div>
            <div className="flex items-center gap-1.5 rounded-2xl rounded-tl-sm border border-white/[0.06] bg-white/[0.02] px-4 py-3">
              {[0, 1, 2].map((i) => (
                <motion.span key={i} animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }} className="size-1.5 rounded-full bg-silver" />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* input */}
      <div className="border-t border-white/[0.08] p-4">
        <form onSubmit={(e) => { e.preventDefault(); send(input); }} className="flex items-center gap-2">
          <input
            value={input} onChange={(e) => setInput(e.target.value)} disabled={busy}
            placeholder="Ask about the candidate pool…"
            className="flex-1 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm placeholder:text-muted-foreground/70 focus-visible:border-white/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/10"
          />
          <button type="submit" disabled={busy || !input.trim()} className="grid size-11 shrink-0 place-items-center rounded-xl bg-gradient-to-b from-zinc-100 to-zinc-300 text-black transition-transform hover:scale-105 disabled:opacity-40">
            {busy ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
          </button>
        </form>
      </div>
    </div>
  );
}

/** Tiny markdown renderer for **bold** and newlines. */
function Markdown({ text }: { text: string }) {
  return (
    <div className="space-y-1.5">
      {text.split("\n").filter(Boolean).map((line, i) => (
        <p key={i} dangerouslySetInnerHTML={{ __html: line.replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold text-foreground">$1</strong>') }} />
      ))}
    </div>
  );
}
