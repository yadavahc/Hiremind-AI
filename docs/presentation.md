---
title: HireMind AI — The Intelligence Layer for Modern Hiring
subtitle: Redrob AI Hiring Hackathon · Intelligent Candidate Discovery & Ranking
theme: black
---

# Slide 1 — Title

# 🧠 HireMind AI
### The Intelligence Layer for Modern Hiring

An AI recruitment platform that reads job descriptions **semantically**, ranks candidates **intelligently**, and explains **every** decision.

*Redrob AI Hiring Hackathon — Intelligent Candidate Discovery & Ranking Challenge*

`Next.js 15` · `React 19` · `Python` · `Gemini 2.5 Flash` · `BGE` · `Hybrid Retrieval`

---

# Slide 2 — The Problem

## Keyword matching fails at hiring

- A **100,000-candidate** pool, one Senior AI Engineer role, and only **~10 real matches** expected.
- The dataset is adversarial **by design**:
  - **Keyword-stuffers** — every AI skill listed, but a "Marketing Manager" title.
  - **Plain-language Tier-5s** — built a recommender, never wrote "RAG".
  - **~80 honeypots** — subtly impossible profiles (8 yrs at a 3-yr-old company).
- Behavioral reality: *a perfect résumé that hasn't logged in for 6 months and replies to 5% of recruiters is **not hireable**.*

> The JD literally says: *"the right answer is **not** the most AI keywords."*

---

# Slide 3 — The Solution

## Read profiles, not keywords

**HireMind AI** ships two things in one repo:

1. **A premium recruiter product** — upload a JD → explained, trap-checked, exportable shortlist.
2. **A reproducible offline ranker** — 100K candidates in **~71s** on CPU, **0 honeypots** in top-100, **validator-passing** CSV.

The core idea: **evidence in career history ≫ a skill tag.** Corroborated competencies rise; claimed-but-unproven ones are discounted; traps sink.

---

# Slide 4 — Architecture

## One engine, two surfaces

```
Next.js 15 (App Router, React 19)
 ├─ Landing: Three.js hero + Framer Motion
 ├─ Dashboard: overview · candidates · analytics · recruiter · settings
 ├─ API: /candidates · /chat (Gemini+fallback) · /export
 └─ Server-side ranked store (memoized)  ─┐
                                          ▼
        Ranking engine (TypeScript, mirrored in Python)
        ontology · BM25 · TF-IDF · features · honeypots · explain
                                          │
         Prisma+SQLite (optional)  ·  Gemini 2.5 Flash (optional)

scripts/rank.py → the reproducible 100K, CPU-only, stdlib ranker
```

No Docker. No Kubernetes. `npm install && npm run dev`.

---

# Slide 5 — Frontend

## A product, not a demo

- **Pure-black, glassmorphic** design system — silver accents, premium typography.
- **Three.js** neural particle hero that reacts to the mouse.
- **Framer Motion** reveals, animated counters, score rings, layout transitions.
- Fully **responsive**, accessible, dark-native; built on Radix + shadcn-style primitives.
- Pages: **Overview · Upload JD · Candidate Ranking · Candidate Detail · Analytics · AI Recruiter · Settings.**

> Looks like it was built by Linear / Vercel / Stripe.

---

# Slide 6 — Backend

## Fast, offline, deterministic

- **Next.js Server Actions + API Routes**, **Prisma + SQLite**, **Zod** validation.
- An **in-memory ranked store** memoizes the whole ranking so reads are instant.
- **Uploading a JD** re-parses entities and **re-ranks the pool in place**.
- **No network during ranking** — the constraint that matters for production scale is respected end-to-end.

---

# Slide 7 — The Ranking Engine

## Hybrid retrieval + 20 features + traps

```
BM25 (lexical) ─┐
TF-IDF cosine ──┼─► hybrid "semantic" retrieval
concept evidence┘
        │
        ▼   20+ engineered features
 skill match · required coverage · experience band · industry (product vs services)
 leadership · stability · promotion trend · education · culture · communication
 AI/LLM · RAG · vector-DB · startup · open-source · GitHub · career growth
        │
        ▼   behavioral availability ×   trap penalties −
 (dormant/unresponsive down-weight) (stuffing · consulting · off-target · honeypot)
        │
        ▼
 calibrated composite → top-100
```

Optional **BGE + cross-encoder** re-rank on the prefiltered shortlist.

---

# Slide 8 — Explainable AI

## Every rank is defensible

For each candidate:

- **Score · confidence · recommendation** (Strong Hire → Pass).
- **Strengths & concerns** — grounded in real facts (years, title, named skills, signal values).
- **"Why ranked here"** — connects to specific JD requirements; acknowledges gaps honestly.
- **1–2 sentence reasoning** for the CSV — *specific, varied, no hallucination, rank-consistent* (exactly the Stage-4 manual-review checks).

> The reasoning reads like a sharp recruiter wrote it — because it's built from the same evidence the score is.

---

# Slide 9 — Demo

## What the judges will see

1. **Landing** → "Rank candidates now".
2. **Overview** → live stats, score distribution, top of the shortlist.
3. **Candidates** → search / sort / filter, expand a row to see reasoning + component bars.
4. **Candidate detail** → radar, career timeline, behavioral signals, AI summary.
5. **Upload JD** → drop a new role, watch the pipeline re-rank.
6. **AI Recruiter** → *"Why is the top candidate ranked first?"*
7. **Export** → `submission.csv`.

---

# Slide 10 — Results

## Numbers that hold up

| Metric | Result |
|---|---|
| Candidates ranked | **100,000** |
| Runtime (CPU, stdlib only) | **~71 s** (limit 5 min) |
| Memory | well under 16 GB |
| **Honeypots in top-100** | **0** |
| Keyword-stuffers | sink to rank ~690+ |
| Top-10 | Senior ML/AI/NLP engineers, 6–9 yrs, retrieval evidence |
| Official `validate_submission.py` | ✅ **Submission is valid** |

---

# Slide 11 — Future Scope

## Where it goes next

- Precomputed **BGE embeddings + FAISS HNSW** in the web path (drop the TF-IDF proxy).
- **Learning-to-rank** head (XGBoost) trained on recruiter-feedback loops.
- Offline→online **eval harness** (NDCG/MRR/MAP) + A/B testing hooks.
- **Bias & fairness** auditing on the shortlist.
- Multi-role workspaces and persisted re-rankings.

---

# Slide 12 — Thank You

# Thank you 🙏

### HireMind AI — *The Intelligence Layer for Modern Hiring*

- ✅ Reads profiles, not keywords
- ✅ Explains every decision
- ✅ 100K candidates, ~71s, 0 honeypots, valid submission
- ✅ A product, not a demo

**`npm install && npm run dev`**

*Questions? Ask the AI Recruiter.*
