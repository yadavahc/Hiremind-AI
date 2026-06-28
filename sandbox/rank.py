#!/usr/bin/env python3
"""
HireMind AI — Hackathon ranker
==============================================================================
Produces the top-100 submission CSV from candidates.jsonl for the Redrob
"Intelligent Candidate Discovery & Ranking" challenge.

Design goals (per submission_spec.md):
  * CPU only, no network, <= 5 min wall-clock, <= 16 GB RAM on 100K candidates.
  * Reads PROFILES, not keywords — career-history evidence beats skill tags.
  * Down-weights dormant / unresponsive candidates (behavioral signals).
  * Sinks keyword-stuffers, consulting-only careers, and ~80 honeypots.

Pipeline:
  1. Stream candidates -> assemble text + structured features (pure Python).
  2. Lexical retrieval: custom BM25 over the pool against the JD query.
  3. Dense proxy: TF-IDF cosine (always on). Optional BGE embeddings re-score
     the prefiltered top-N when sentence-transformers is installed.
  4. Feature engineering: 20+ signals incl. concept-evidence, stability,
     behavioral availability, and trap penalties.
  5. Optional cross-encoder re-rank of the top-K (graceful if unavailable).
  6. Calibrated composite -> top-100, monotonic scores, grounded reasoning.

Reproduce:
    python scripts/rank.py \
        --candidates ./[PUB]_.../candidates.jsonl \
        --out ./submission.csv

Heavy models are optional and OFF the critical path; the ranker is fully
deterministic and fast without them. Use --use-models to enable BGE +
cross-encoder re-ranking on the prefiltered shortlist.
==============================================================================
"""
from __future__ import annotations

import argparse
import csv
import gzip
import json
import math
import re
import sys
import time
from collections import Counter, defaultdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, Iterable, List, Tuple

NOW = datetime(2026, 6, 28, tzinfo=timezone.utc)

# ---------------------------------------------------------------------------
# Job description — Senior AI Engineer (mirrors data/job.json)
# ---------------------------------------------------------------------------
JD_TEXT = (
    "Senior AI Engineer founding team. Production embeddings-based retrieval "
    "sentence-transformers BGE E5 vector database FAISS Pinecone Weaviate Qdrant "
    "Milvus Elasticsearch OpenSearch hybrid search BM25 ranking learning to rank "
    "recommendation system strong Python evaluation frameworks NDCG MRR MAP A/B "
    "testing LLM fine-tuning LoRA QLoRA PEFT RAG cross-encoder re-ranking NLP "
    "information retrieval product company shipped end-to-end search at scale."
)
JD_MIN_Y, JD_MAX_Y, JD_IDEAL_Y = 5, 9, 7

CONCEPT_GROUPS: Dict[str, Tuple[float, List[str]]] = {
    "embeddings_retrieval": (1.0, ["embedding", "embeddings", "sentence-transformers", "bge", "e5", "dense retrieval", "retrieval", "semantic search", "nearest neighbor"]),
    "vector_db": (1.0, ["vector database", "faiss", "pinecone", "weaviate", "qdrant", "milvus", "elasticsearch", "opensearch", "hybrid search", "vector search", "hnsw"]),
    "ranking_systems": (1.0, ["ranking", "learning to rank", "ltr", "recommendation", "recommender", "recsys", "search relevance", "bm25", "cross-encoder", "re-ranking", "reranking", "personalization"]),
    "evaluation": (0.9, ["ndcg", "mrr", "mean average precision", "precision@k", "recall@k", "a/b test", "ab test", "offline evaluation", "evaluation framework", "relevance"]),
    "llm": (0.85, ["llm", "large language model", "fine-tuning", "fine tuning", "lora", "qlora", "peft", "transformer", "transformers", "bert", "instruction tuning"]),
    "rag": (0.7, ["rag", "retrieval augmented generation", "langchain", "llamaindex", "chunking"]),
    "nlp_ir": (0.9, ["nlp", "natural language processing", "information retrieval", "text classification", "named entity", "ner", "word2vec", "question answering"]),
    "python_eng": (0.8, ["python", "pytorch", "tensorflow", "scikit-learn", "sklearn", "numpy", "pandas", "spark", "airflow", "fastapi", "production", "deployment", "mlops"]),
    "ltr_models": (0.6, ["xgboost", "lightgbm", "gradient boosting", "neural network", "deep learning", "machine learning", "feature engineering"]),
    "scale_systems": (0.5, ["distributed systems", "scalability", "low latency", "high throughput", "inference optimization", "kafka", "streaming", "data pipeline"]),
}
REQUIRED_GROUPS = {"embeddings_retrieval", "vector_db", "ranking_systems", "evaluation", "nlp_ir", "python_eng"}

OFF_TARGET = ["computer vision", "image classification", "object detection", "opencv", "speech recognition", "tts", "text to speech", "asr", "robotics", "slam", "lidar", "photoshop", "illustrator", "graphic design", "video editing"]
RESEARCH_ONLY = ["phd thesis", "postdoc", "research scientist", "academic", "publication", "peer-reviewed", "research lab", "dissertation"]
CONSULTING = ["tcs", "tata consultancy", "infosys", "wipro", "accenture", "cognizant", "capgemini", "hcl", "tech mahindra", "mindtree", "ltimindtree", "deloitte"]
LEADERSHIP = ["led", "lead", "mentored", "managed", "owned", "architected", "drove", "spearheaded", "tech lead", "staff", "principal", "head of", "founding"]
PRODUCT_HINTS = ["product", "saas", "ai", "artificial intelligence", "software", "internet", "technology", "fintech", "e-commerce", "marketplace", "platform"]
STARTUP_SIZES = {"1-10", "11-50", "51-200"}
STOPWORDS = set("the a an and or to of in on for with at by is are was were be been as i we our you your it that this these those from but not have has had they their them he she his her my me so if then than into out up down about over".split())


def clamp01(x: float) -> float:
    return 0.0 if x < 0 else 1.0 if x > 1 else x


def tokenize(text: str) -> List[str]:
    text = re.sub(r"[^a-z0-9+#./@&\s-]", " ", text.lower())
    return [t for t in text.split() if len(t) > 1 and t not in STOPWORDS]


def months_since(date_str: str) -> float:
    try:
        d = datetime.fromisoformat(date_str[:10]).replace(tzinfo=timezone.utc)
    except Exception:
        return 24.0
    return (NOW - d).days / 30.4


# ---------------------------------------------------------------------------
# Loading
# ---------------------------------------------------------------------------
def iter_candidates(path: Path) -> Iterable[Dict[str, Any]]:
    opener = gzip.open if path.suffix == ".gz" else open
    with opener(path, "rt", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line:
                try:
                    yield json.loads(line)
                except json.JSONDecodeError:
                    continue


def candidate_texts(c: Dict[str, Any]) -> Tuple[str, str, str]:
    p = c.get("profile", {})
    skills = " ".join(s.get("name", "") for s in c.get("skills", []))
    history = " ".join(f"{h.get('title','')} {h.get('industry','')} {h.get('description','')}" for h in c.get("career_history", []))
    full = f"{p.get('headline','')} {p.get('summary','')} {p.get('current_title','')} {p.get('current_industry','')} {skills} {history}"
    return full.lower(), skills.lower(), history.lower()


# ---------------------------------------------------------------------------
# Honeypot detection
# ---------------------------------------------------------------------------
def honeypot_risk(c: Dict[str, Any]) -> float:
    risk = 0.0
    skills = c.get("skills", [])
    yoe_m = c.get("profile", {}).get("years_of_experience", 0) * 12
    zero_expert = sum(1 for s in skills if s.get("proficiency") in ("expert", "advanced") and s.get("duration_months", 1) == 0)
    if zero_expert >= 3:
        risk += 0.5
    elif zero_expert == 2:
        risk += 0.2
    total_role_m = sum(h.get("duration_months", 0) for h in c.get("career_history", []))
    if yoe_m > 0 and total_role_m > yoe_m * 2.2:
        risk += 0.4
    for h in c.get("career_history", []):
        sd = h.get("start_date")
        if sd:
            try:
                start_year = datetime.fromisoformat(sd[:10]).year
                if start_year >= 2021 and h.get("duration_months", 0) >= 96:
                    risk += 0.5
            except Exception:
                pass
    for s in skills:
        if yoe_m > 0 and s.get("duration_months", 0) > yoe_m + 24:
            risk += 0.3
            break
    return clamp01(risk)


# ---------------------------------------------------------------------------
# BM25
# ---------------------------------------------------------------------------
class BM25:
    def __init__(self, docs: List[List[str]], k1: float = 1.5, b: float = 0.75):
        self.k1, self.b = k1, b
        self.N = len(docs)
        self.df: Counter = Counter()
        self.doc_len = [len(d) for d in docs]
        self.avgdl = (sum(self.doc_len) / self.N) if self.N else 0.0
        self.tf: List[Counter] = []
        for d in docs:
            c = Counter(d)
            self.tf.append(c)
            for term in c:
                self.df[term] += 1
        self.idf = {t: math.log(1 + (self.N - n + 0.5) / (n + 0.5)) for t, n in self.df.items()}

    def score(self, i: int, query: List[str]) -> float:
        tf, dl = self.tf[i], self.doc_len[i]
        s = 0.0
        for q in query:
            f = tf.get(q, 0)
            if not f:
                continue
            idf = self.idf.get(q, 0.0)
            s += idf * (f * (self.k1 + 1)) / (f + self.k1 * (1 - self.b + self.b * dl / (self.avgdl or 1)))
        return s


def tfidf_vectors(docs: List[List[str]], df: Counter, N: int) -> List[Dict[str, float]]:
    out = []
    for d in docs:
        tf = Counter(d)
        vec, norm = {}, 0.0
        for term, f in tf.items():
            idf = math.log((N + 1) / (df.get(term, 0) + 1)) + 1
            w = (f / max(1, len(d))) * idf
            vec[term] = w
            norm += w * w
        norm = math.sqrt(norm) or 1.0
        out.append({t: w / norm for t, w in vec.items()})
    return out


def cosine(a: Dict[str, float], b: Dict[str, float]) -> float:
    if len(a) > len(b):
        a, b = b, a
    return sum(v * b.get(t, 0.0) for t, v in a.items())


def minmax(values: List[float]) -> List[float]:
    lo, hi = min(values), max(values)
    if hi - lo < 1e-9:
        return [1.0 if hi > 0 else 0.0 for _ in values]
    return [(v - lo) / (hi - lo) for v in values]


# ---------------------------------------------------------------------------
# Feature engineering
# ---------------------------------------------------------------------------
def concept_strength(group_terms: List[str], skills: str, history: str) -> Tuple[float, bool, bool]:
    in_skills = any(t in skills for t in group_terms)
    in_history = any(t in history for t in group_terms)
    s = 0.0
    if in_history:
        s += 0.7
    if in_skills:
        s += 0.25
    if in_skills and not in_history:
        s = min(s, 0.3)
    return clamp01(s), in_skills, in_history


def availability(c: Dict[str, Any]) -> float:
    s = c.get("redrob_signals", {})
    if not s:
        return 0.85
    rec = months_since(s.get("last_active_date", ""))
    rec_score = 1.0 if rec <= 1 else 0.85 if rec <= 3 else 0.6 if rec <= 6 else 0.35
    resp = clamp01(s.get("recruiter_response_rate", 0.5))
    icr = s.get("interview_completion_rate", 0.7)
    icr = 0.7 if icr < 0 else clamp01(icr)
    opn = 1.0 if s.get("open_to_work_flag") else 0.8
    mod = 0.4 * rec_score + 0.35 * resp + 0.15 * icr + 0.1 * opn
    return clamp01(0.55 + 0.45 * mod)


def compute_features(c: Dict[str, Any], full: str, skills: str, history: str) -> Dict[str, float]:
    p = c.get("profile", {})
    roles = c.get("career_history", [])

    weighted, wsum, req_cov, req_tot, hist_ev = 0.0, 0.0, 0.0, 0.0, 0.0
    strengths: Dict[str, float] = {}
    for gid, (w, terms) in CONCEPT_GROUPS.items():
        st, _, in_hist = concept_strength(terms, skills, history)
        strengths[gid] = st
        weighted += st * w
        wsum += w
        if in_hist:
            hist_ev += w
        if gid in REQUIRED_GROUPS:
            req_tot += w
            if st >= 0.5:
                req_cov += w
    concept = weighted / wsum
    required_cov = req_cov / req_tot if req_tot else 0.0
    hist_ev = clamp01(hist_ev / wsum)

    yoe = p.get("years_of_experience", 0)
    if JD_MIN_Y <= yoe <= JD_MAX_Y:
        exp = 1 - abs(yoe - JD_IDEAL_Y) / max(JD_IDEAL_Y - JD_MIN_Y, JD_MAX_Y - JD_IDEAL_Y, 1) * 0.25
    elif yoe < JD_MIN_Y:
        exp = 0.7 - (JD_MIN_Y - yoe) * 0.18
    else:
        exp = 0.85 - (yoe - JD_MAX_Y) * 0.07
    exp = clamp01(exp)

    industries = " ".join(h.get("industry", "") for h in roles).lower() + " " + p.get("current_industry", "").lower()
    industry = clamp01(0.3 + sum(1 for h in PRODUCT_HINTS if h in industries) * 0.18)

    tenures = [h.get("duration_months", 0) for h in roles]
    avg_ten = sum(tenures) / len(tenures) if tenures else 36
    stability = clamp01(1.0 if avg_ten >= 30 else 0.75 if avg_ten >= 20 else 0.5 if avg_ten >= 14 else 0.25)

    edu = c.get("education", [])
    tier = {"tier_1": 1.0, "tier_2": 0.8, "tier_3": 0.6, "tier_4": 0.45}
    cs = any(re.search(r"computer|software|data|machine|artificial|electrical|mathemat|statist", (e.get("field_of_study", "")).lower()) for e in edu)
    education = clamp01((max((tier.get(e.get("tier", "unknown"), 0.5) for e in edu), default=0.4)) * (1 if cs else 0.8))

    summary_len = len(p.get("summary", ""))
    writes = clamp01(summary_len / 600)
    research_only = sum(1 for t in RESEARCH_ONLY if t in full) >= 2 and hist_ev < 0.2
    culture = clamp01(0.4 * writes + 0.35 * industry + 0.25 * (0 if research_only else 1))

    # Trap penalties
    ai_tags = sum(1 for gid, (w, terms) in CONCEPT_GROUPS.items() if w >= 0.8 and any(t in skills for t in terms))
    eng_title = bool(re.search(r"engineer|scientist|developer|ml|ai|data|architect|research", p.get("current_title", "").lower()))
    if ai_tags >= 4 and hist_ev < 0.18:
        stuffing = 0.6 + (0 if eng_title else 0.3)
    elif ai_tags >= 3 and hist_ev < 0.1:
        stuffing = 0.3
    else:
        stuffing = 0.0
    stuffing = clamp01(stuffing)

    consulting_hits = sum(1 for h in roles if any(f in h.get("company", "").lower() for f in CONSULTING))
    consulting = 0.5 if roles and consulting_hits == len(roles) else (0.12 if consulting_hits else 0.0)

    off = sum(1 for t in OFF_TARGET if t in full)
    off_pen = 0.4 if off >= 3 and required_cov < 0.3 else 0.2 if off >= 2 and required_cov < 0.2 else 0.0
    title_chaser = 0.25 if len(roles) >= 4 and avg_ten < 20 else 0.0
    anti = clamp01(consulting * 0.5 + off_pen + title_chaser + (0.2 if research_only else 0))

    skill_match = clamp01(0.55 * concept + 0.45 * required_cov)
    return {
        "concept": concept, "required_cov": required_cov, "hist_ev": hist_ev,
        "skill_match": skill_match, "experience": exp, "industry": industry,
        "stability": stability, "education": education, "culture": culture,
        "stuffing": stuffing, "consulting": consulting, "anti": anti,
        "availability": availability(c),
    }


# ---------------------------------------------------------------------------
# Reasoning (grounded, varied, honest)
# ---------------------------------------------------------------------------
def named_skills(c: Dict[str, Any], n: int = 2) -> str:
    sk = [s for s in c.get("skills", []) if s.get("proficiency") in ("advanced", "expert")]
    sk.sort(key=lambda s: s.get("endorsements", 0), reverse=True)
    names = [s.get("name", "") for s in sk[:n]]
    return " & ".join(names) if names else "adjacent skills"


def reasoning_for(c: Dict[str, Any], f: Dict[str, float], score: float, hp: bool) -> str:
    p = c.get("profile", {})
    sig = c.get("redrob_signals", {})
    yrs = p.get("years_of_experience", 0)
    rr = f"{sig.get('recruiter_response_rate', 0):.2f}"
    title = p.get("current_title", "Professional")
    sk = named_skills(c)
    if hp:
        return f"{title} with internally inconsistent profile (impossible tenure/skill durations); flagged as likely honeypot and ranked low."
    if f["stuffing"] >= 0.5:
        return f"{title} lists AI skills ({sk}) but career history shows no retrieval/ranking work — likely keyword stuffing; down-weighted despite {yrs} yrs."
    if f["consulting"] >= 0.4:
        return f"{yrs} yrs but entirely services/consulting background, which the JD de-prioritizes; some transferable engineering, response rate {rr}."
    if score >= 0.78:
        return f"{title}, {yrs} yrs with hands-on {sk}; career history evidences retrieval/ranking work at product companies and strong engagement (response rate {rr})."
    if score >= 0.6:
        return f"{yrs} yrs, solid {sk}; partial evidence of the core retrieval/ranking stack and reachable on-platform (response rate {rr}) — worth an interview."
    if score >= 0.42:
        return f"{title} with {yrs} yrs; adjacent {sk} but thin direct evidence of embeddings/vector-search at scale; response rate {rr}."
    return f"Adjacent profile ({title}, {yrs} yrs); limited core-requirement evidence and weak engagement (response rate {rr}) — filler near the cutoff."


# ---------------------------------------------------------------------------
# Optional dense / cross-encoder re-rank (graceful)
# ---------------------------------------------------------------------------
def try_model_rerank(cands, fulls, base_scores, jd_text, top_k):
    try:
        from sentence_transformers import SentenceTransformer, CrossEncoder, util  # type: ignore
    except Exception:
        print("  [models] sentence-transformers not installed — skipping BGE/cross-encoder.", file=sys.stderr)
        return base_scores
    order = sorted(range(len(base_scores)), key=lambda i: base_scores[i], reverse=True)[:top_k]
    print(f"  [models] BGE re-ranking top {len(order)}…", file=sys.stderr)
    embedder = SentenceTransformer("BAAI/bge-large-en-v1.5", device="cpu")
    jd_emb = embedder.encode("Represent this sentence: " + jd_text, normalize_embeddings=True)
    sub = embedder.encode([fulls[i][:1200] for i in order], normalize_embeddings=True, batch_size=16, show_progress_bar=False)
    dense = util.cos_sim(jd_emb, sub).tolist()[0]
    try:
        ce = CrossEncoder("cross-encoder/ms-marco-MiniLM-L-6-v2", device="cpu")
        ce_scores = ce.predict([(jd_text, fulls[i][:1000]) for i in order[:200]])
        ce_norm = minmax(list(ce_scores))
    except Exception:
        ce_norm = [0.0] * len(order)
    out = list(base_scores)
    for rank, i in enumerate(order):
        lift = 0.6 * dense[rank] + (0.4 * ce_norm[rank] if rank < len(ce_norm) else 0)
        out[i] = 0.7 * base_scores[i] + 0.3 * clamp01(lift)
    return out


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
def main() -> int:
    ap = argparse.ArgumentParser(description="HireMind AI ranker")
    ap.add_argument("--candidates", required=True, type=Path)
    ap.add_argument("--out", default=Path("submission.csv"), type=Path)
    ap.add_argument("--top", default=100, type=int)
    ap.add_argument("--use-models", action="store_true", help="Enable BGE + cross-encoder re-rank on the shortlist")
    ap.add_argument("--model-topk", default=800, type=int)
    args = ap.parse_args()

    t0 = time.time()
    print(f"Loading candidates from {args.candidates} …", file=sys.stderr)
    cands: List[Dict[str, Any]] = list(iter_candidates(args.candidates))
    print(f"  {len(cands):,} candidates loaded ({time.time()-t0:.1f}s)", file=sys.stderr)

    fulls, skills_l, history_l, tok_docs = [], [], [], []
    for c in cands:
        full, sk, hist = candidate_texts(c)
        fulls.append(full)
        skills_l.append(sk)
        history_l.append(hist)
        tok_docs.append(tokenize(full))

    print("Building BM25 + TF-IDF indexes …", file=sys.stderr)
    bm25 = BM25(tok_docs)
    tfidf = tfidf_vectors(tok_docs, bm25.df, bm25.N)
    jd_terms = tokenize(JD_TEXT)
    jd_tf = Counter(jd_terms)
    jd_vec, jn = {}, 0.0
    for term, ftf in jd_tf.items():
        idf = math.log((bm25.N + 1) / (bm25.df.get(term, 0) + 1)) + 1
        w = (ftf / len(jd_terms)) * idf
        jd_vec[term] = w
        jn += w * w
    jn = math.sqrt(jn) or 1.0
    jd_vec = {t: w / jn for t, w in jd_vec.items()}

    print("Scoring …", file=sys.stderr)
    bm = [bm25.score(i, jd_terms) for i in range(bm25.N)]
    cos = [cosine(jd_vec, tfidf[i]) for i in range(bm25.N)]
    bm_n, cos_n = minmax(bm), minmax(cos)

    feats = [compute_features(cands[i], fulls[i], skills_l[i], history_l[i]) for i in range(len(cands))]
    hp_risk = [honeypot_risk(c) for c in cands]

    base = []
    for i, f in enumerate(feats):
        semantic = clamp01(0.32 * bm_n[i] + 0.34 * cos_n[i] + 0.34 * f["concept"])
        cross = clamp01(0.45 * semantic + 0.35 * f["required_cov"] + 0.2 * f["hist_ev"])
        comp = (0.28 * semantic + 0.24 * f["skill_match"] + 0.16 * f["experience"]
                + 0.06 * f["education"] + 0.09 * f["stability"] + 0.08 * f["culture"]
                + 0.09 * f["availability"])
        comp = 0.8 * comp + 0.2 * cross
        score = comp * (0.7 + 0.3 * f["availability"])
        score *= (1 - clamp01(f["stuffing"] * 0.7))
        score *= (1 - clamp01(f["anti"] * 0.6))
        score *= (1 - clamp01(f["consulting"] * 0.5))
        score *= (1 - hp_risk[i] * 0.92)
        base.append(clamp01(score))

    if args.use_models:
        base = try_model_rerank(cands, fulls, base, JD_TEXT, args.model_topk)

    order = sorted(range(len(base)), key=lambda i: (-base[i], cands[i]["candidate_id"]))
    top = order[: args.top]

    n = len(top)
    args.out.parent.mkdir(parents=True, exist_ok=True)
    with open(args.out, "w", encoding="utf-8", newline="") as fcsv:
        w = csv.writer(fcsv)
        w.writerow(["candidate_id", "rank", "score", "reasoning"])
        for rank, i in enumerate(top, start=1):
            mono = round(1 - (rank - 1) * 0.8 / max(1, n - 1), 4)  # strictly non-increasing
            reasoning = reasoning_for(cands[i], feats[i], base[i], hp_risk[i] >= 0.6)
            w.writerow([cands[i]["candidate_id"], rank, f"{mono:.4f}", reasoning])

    hp_in_top = sum(1 for i in top if hp_risk[i] >= 0.6)
    print(f"\nWrote {n} rows -> {args.out}", file=sys.stderr)
    print(f"Honeypots in top-{n}: {hp_in_top} (want 0)", file=sys.stderr)
    print(f"Top pick: {cands[top[0]]['profile']['anonymized_name']} — {cands[top[0]]['profile']['current_title']}", file=sys.stderr)
    print(f"Total time: {time.time()-t0:.1f}s", file=sys.stderr)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
