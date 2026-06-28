<div align="center">

# 🧠 HireMind AI

### The Intelligence Layer for Modern Hiring

An AI recruitment platform that understands job descriptions **semantically**, ranks candidates **intelligently**, explains **every** decision, and produces a shortlist you can defend in any interview.

Built for the **Redrob AI Hiring Hackathon** — *Intelligent Candidate Discovery & Ranking Challenge*.

`Next.js 15` · `React 19` · `TypeScript` · `Tailwind` · `Three.js` · `Framer Motion` · `Prisma` · `Gemini 2.5 Flash` · `Python`

</div>

---

## ✨ Overview

Most "AI" rankers reward keyword density. This one doesn't. The JD for this challenge is explicit:

> *"The right answer is **not** find candidates whose skills section contains the most AI keywords. A candidate who has all the AI keywords listed as skills but whose title is 'Marketing Manager' is not a fit."*

HireMind reasons about the **gap between what a JD says and what it means**. It credits a competency far more when it shows up in real **career history** than when it's merely a skill tag, down-weights dormant/unresponsive candidates, and sinks keyword-stuffers, consulting-only careers, and the dataset's ~80 **honeypots**.

The result is two things in one repo:

1. **A polished SaaS product** — a premium black-glass dashboard where recruiters upload a JD, browse an explained ranking, explore candidate profiles, view analytics, chat with an AI recruiter, and export a submission CSV.
2. **A reproducible hackathon ranker** (`scripts/rank.py`) — ranks the full **100,000-candidate** pool in **~71 seconds** on CPU, standard-library only, producing a **validator-passing** `submission.csv`.

---

## 🎯 Features

| | |
|---|---|
| **Semantic JD understanding** | Extracts required/preferred skills, seniority, experience band, industry, behavioral traits & **anti-signals**. |
| **Hybrid retrieval** | BM25 (lexical) + TF-IDF cosine (dense proxy) + concept-evidence, fused into one calibrated score. Optional **BGE + cross-encoder** re-rank. |
| **Trap-aware ranking** | Detects keyword-stuffers, consulting-only careers, off-target CV/speech/robotics specialists, and honeypots — they sink, real builders rise. |
| **Behavioral signals** | A perfect résumé that never replies isn't hireable. Dormant/low-response candidates are down-weighted. |
| **Explainable AI** | Every candidate gets a score, confidence, strengths, weaknesses, recommendation, and *"why ranked here"* — grounded in real profile facts, never hallucinated. |
| **AI Recruiter chat** | Ask in plain English (*"best ML engineers with LLM experience"*). Gemini 2.5 Flash when a key is set; a grounded **local engine** otherwise. |
| **Analytics** | Score distribution, recommendation mix, recruitment funnel, experience bands, top/missing skills, component radar. |
| **One-click export** | Validator-compliant top-100 CSV (checked against the official `validate_submission.py`). |

---

## 🏗️ Architecture

```
┌────────────────────────── Next.js 15 (App Router) ──────────────────────────┐
│                                                                              │
│  Landing (Three.js hero, Framer Motion)        Dashboard (premium black UI)  │
│        │                                              │                       │
│        ▼                                              ▼                       │
│  ┌───────────────┐   server actions / API routes   ┌──────────────────────┐  │
│  │  /api/chat    │◄──────────────────────────────► │  In-memory ranked     │  │
│  │  /api/export  │                                 │  store (memoized)     │  │
│  │  /api/candidates                                └──────────┬───────────┘  │
│  └───────────────┘                                            │              │
│                                                               ▼              │
│                                        ┌──────────────────────────────────┐  │
│                                        │  Ranking engine (src/lib)        │  │
│                                        │  ontology · nlp(BM25/TF-IDF) ·   │  │
│                                        │  features · honeypot · explain   │  │
│                                        └──────────────────────────────────┘  │
│                                                                              │
│  Prisma + SQLite (optional persistence)        Gemini 2.5 Flash (optional)   │
└──────────────────────────────────────────────────────────────────────────────┘

scripts/rank.py  ──►  the reproducible, offline, CPU-only ranker over 100K candidates
```

---

## 🔬 AI Pipeline

```
Job Description
   │  parse → required/preferred skills, seniority, anti-signals
   ▼
Candidate corpus
   │  BM25 (lexical)  +  TF-IDF cosine (dense proxy)  ──► hybrid retrieval
   ▼
Concept-evidence layer   (career-history evidence ≫ skill tags)
   ▼
Feature engineering  (20+ signals)
   • skill match · required-skill coverage · experience-band fit
   • industry (product vs services) · leadership · career stability
   • promotion trend · education · culture fit · communication
   • AI/LLM · RAG · vector-DB · startup · open-source · GitHub
   • keyword-stuffing · consulting · off-target · honeypot risk
   ▼
Behavioral availability modifier   (down-weight dormant/unresponsive)
   ▼
Trap & honeypot penalties          (sink the traps)
   ▼
[optional] BGE dense + cross-encoder re-rank on the shortlist
   ▼
Calibrated composite  →  Top-100  →  Grounded reasoning  →  submission.csv
```

### Why this avoids the traps

- **Keyword-stuffers** — many AI skill tags but a non-engineering title and *no career-history evidence* → heavy penalty (in testing they land at rank ~690+).
- **Honeypots** — impossible profiles (e.g. 8 yrs at a company since 2023; "expert" in skills used 0 months) → detected and forced to the floor (**0 in top-100**).
- **Consulting-only / off-target / pure-research** — explicit JD anti-signals, each with a calibrated penalty.

---

## 🧰 Tech Stack

**Frontend** — Next.js 15 (App Router), React 19, TypeScript, TailwindCSS, shadcn-style UI on Radix, Framer Motion, GSAP-ready, Three.js + React Three Fiber + Drei, Lucide, Recharts.

**Backend** — Next.js API Routes + Server Actions, Prisma ORM, SQLite, Zod.

**AI** — Hybrid ranking (BM25 + TF-IDF + cross-encoder-style fusion), optional Sentence-Transformers **BAAI/bge-large-en-v1.5** + **cross-encoder/ms-marco-MiniLM-L-6-v2**, Gemini 2.5 Flash for natural-language features. No Docker, no Kubernetes.

---

## 🚀 Installation

```bash
# 1. Install dependencies
npm install

# 2. (optional) configure keys — the app runs fully WITHOUT them
cp .env.example .env        # add GEMINI_API_KEY to enable Gemini chat

# 3. Run the dev server
npm run dev                 # → http://localhost:3000
```

> The web app works immediately — it ranks a representative sample of the pool from `data/` via an in-memory engine. No DB seed or API key required.

### Optional commands

```bash
npm run build         # production build
npm run db:push       # create the SQLite schema
npm run db:seed       # persist candidates + ranking to SQLite (Prisma)
npm run rank          # rank the sample with the TS engine → out/submission.csv
```

### Reproduce the hackathon submission (full 100K pool)

```bash
# Standard library only — no install needed. ~71s on CPU.
python scripts/rank.py \
  --candidates "./[PUB] India_runs_data_and_ai_challenge/India_runs_data_and_ai_challenge/candidates.jsonl" \
  --out ./submission.csv

# Optional: enable BGE + cross-encoder re-rank on the shortlist
pip install -r requirements.txt
python scripts/rank.py --candidates ./candidates.jsonl --out ./submission.csv --use-models
```

Validate it with the official checker:

```bash
python "[PUB] India_runs_data_and_ai_challenge/India_runs_data_and_ai_challenge/validate_submission.py" submission.csv
# → Submission is valid.
```

---

## 📁 Folder Structure

```
.
├── data/                     # sampled candidate pool + parsed JD (web app reads these)
│   ├── candidates.sample.json
│   └── job.json
├── prisma/                   # schema + seed (optional persistence)
├── scripts/
│   ├── rank.py               # ★ reproducible hackathon ranker (100K, CPU, stdlib)
│   ├── rank.ts               # TS convenience ranker → out/submission.csv
│   └── sample-data.mjs       # builds the demo sample from candidates.jsonl
├── src/
│   ├── app/
│   │   ├── page.tsx          # premium landing page
│   │   ├── dashboard/        # overview · upload · candidates · analytics · recruiter · settings
│   │   └── api/              # candidates · chat · export
│   ├── components/
│   │   ├── landing/          # hero (Three.js), features, pipeline, sections
│   │   ├── dashboard/        # sidebar, table, uploader, recruiter chat, stat cards
│   │   ├── charts/           # recharts (dark themed)
│   │   ├── shared/           # reveal, counters, score ring, logo
│   │   └── ui/               # button, card, badge, … (shadcn-style)
│   ├── lib/
│   │   ├── ranking.ts        # ★ the engine: features, honeypots, scoring, explanations
│   │   ├── ontology.ts       # concept groups, anti-signals
│   │   ├── nlp.ts            # BM25, TF-IDF cosine
│   │   ├── analytics.ts      # dashboard aggregations
│   │   ├── recruiter.ts      # grounded NL retrieval (chat)
│   │   ├── export.ts         # validator-compliant CSV builder
│   │   ├── jd-parser.ts      # parse uploaded JD text
│   │   └── store.ts          # memoized in-memory ranked store
│   └── types/                # domain + R3F type augmentation
├── docs/
│   └── presentation.md       # 12-slide deck
├── requirements.txt
└── submission_metadata.yaml
```

---

## 📊 Results (full 100K pool)

| Metric | Value |
|---|---|
| Candidates ranked | **100,000** |
| Runtime (CPU, stdlib only) | **~71 s** (limit: 5 min) |
| Peak RAM | well under 16 GB |
| Honeypots in top-100 | **0** |
| Top-10 profile | Senior ML / AI / NLP engineers, 6–9 yrs, retrieval/ranking evidence |
| Official validator | ✅ **Submission is valid** |

---

## 🔮 Future Improvements

- Persist re-rankings per uploaded JD and support multiple concurrent roles.
- Swap the TF-IDF dense proxy for precomputed BGE embeddings + a FAISS HNSW index in the web path.
- Learning-to-rank head (XGBoost) trained on recruiter feedback loops.
- Offline→online eval harness (NDCG/MRR/MAP dashboards) and A/B testing hooks.
- Bias & fairness auditing on the shortlist.

---

## 📸 Screenshots

> _Placeholders — run `npm run dev` to see them live._

| Landing | Dashboard | Candidate detail | AI Recruiter |
|---|---|---|---|
| `docs/screenshots/landing.png` | `docs/screenshots/dashboard.png` | `docs/screenshots/candidate.png` | `docs/screenshots/recruiter.png` |

---

<div align="center">
Built with care for the Redrob AI Hiring Hackathon — <strong>HireMind AI</strong>.
</div>
