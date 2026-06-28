import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { localAnswer, buildContext } from "@/lib/recruiter";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const SYSTEM = `You are HireMind's AI Recruiter assistant. You help a recruiter reason about a ranked candidate pool.
Rules:
- ONLY discuss candidates present in the provided context. Never invent candidates, skills, or facts.
- Be specific: cite ranks, scores, years of experience, named skills, and behavioral signals from the context.
- Acknowledge concerns honestly; don't oversell.
- Keep answers tight (under ~180 words) and use light markdown (bold names, short lists).
- If the context has no relevant candidate, say so plainly.`;

export async function POST(req: NextRequest) {
  let message = "";
  try {
    const body = await req.json();
    message = String(body.message ?? "").slice(0, 1000);
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  if (!message.trim()) return NextResponse.json({ error: "Empty message." }, { status: 400 });

  const apiKey = process.env.GEMINI_API_KEY;

  // No key → grounded local engine.
  if (!apiKey) {
    return NextResponse.json(localAnswer(message));
  }

  try {
    const { context, chips } = buildContext(message);
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      systemInstruction: SYSTEM,
    });
    const prompt = `${context}\n\nRecruiter question: ${message}\n\nAnswer using only the candidates above.`;
    const result = await model.generateContent(prompt);
    const answer = result.response.text().trim();
    return NextResponse.json({ answer, candidates: chips, usedGemini: true });
  } catch (err) {
    // Any API failure → fall back to the local engine so the UX never breaks.
    const fallback = localAnswer(message);
    return NextResponse.json({ ...fallback, note: "Gemini unavailable — answered with the local engine." });
  }
}
