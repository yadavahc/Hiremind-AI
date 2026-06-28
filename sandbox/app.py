"""
HireMind AI — Ranker Sandbox (HuggingFace Spaces / Gradio)
==============================================================================
A working hosted environment where the HireMind ranker can be run on a small
candidate sample, as required by the Redrob hackathon submission spec (10.5).

Upload a candidates.jsonl sample (or use the bundled one), click Rank, and the
SAME offline, CPU-only, stdlib ranking logic from scripts/rank.py produces an
explained top-N table plus a validator-compatible CSV.
==============================================================================
"""
import io
import json
import math
import os
import tempfile
from collections import Counter

import gradio as gr

# Reuse the exact ranking logic from the hackathon ranker.
from rank import (
    JD_TEXT, CONCEPT_GROUPS, REQUIRED_GROUPS, BM25, tfidf_vectors, cosine,
    minmax, tokenize, candidate_texts, compute_features, honeypot_risk,
    reasoning_for, clamp01,
)

MAX_CANDIDATES = 5000  # sandbox guard


def _read_jsonl(text: str):
    cands = []
    for line in text.splitlines():
        line = line.strip()
        if not line:
            continue
        try:
            cands.append(json.loads(line))
        except json.JSONDecodeError:
            continue
        if len(cands) >= MAX_CANDIDATES:
            break
    return cands


def rank_pool(cands, top_n):
    """Mirror of rank.py's scoring loop (kept identical to the offline ranker)."""
    fulls, skills_l, history_l, tok_docs = [], [], [], []
    for c in cands:
        full, sk, hist = candidate_texts(c)
        fulls.append(full); skills_l.append(sk); history_l.append(hist)
        tok_docs.append(tokenize(full))

    bm25 = BM25(tok_docs)
    tfidf = tfidf_vectors(tok_docs, bm25.df, bm25.N)
    jd_terms = tokenize(JD_TEXT)
    jd_tf = Counter(jd_terms)
    jd_vec, jn = {}, 0.0
    for term, ftf in jd_tf.items():
        idf = math.log((bm25.N + 1) / (bm25.df.get(term, 0) + 1)) + 1
        w = (ftf / len(jd_terms)) * idf
        jd_vec[term] = w; jn += w * w
    jn = math.sqrt(jn) or 1.0
    jd_vec = {t: w / jn for t, w in jd_vec.items()}

    bm = [bm25.score(i, jd_terms) for i in range(bm25.N)]
    cos = [cosine(jd_vec, tfidf[i]) for i in range(bm25.N)]
    bm_n, cos_n = minmax(bm), minmax(cos)
    feats = [compute_features(cands[i], fulls[i], skills_l[i], history_l[i]) for i in range(len(cands))]
    hp = [honeypot_risk(c) for c in cands]

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
        score *= (1 - hp[i] * 0.92)
        base.append(clamp01(score))

    order = sorted(range(len(base)), key=lambda i: (-base[i], cands[i]["candidate_id"]))
    top = order[:top_n]

    rows, csv_lines = [], ["candidate_id,rank,score,reasoning"]
    n = len(top)
    for rank, i in enumerate(top, start=1):
        mono = round(1 - (rank - 1) * 0.8 / max(1, n - 1), 4)
        reason = reasoning_for(cands[i], feats[i], base[i], hp[i] >= 0.6)
        p = cands[i].get("profile", {})
        rows.append([rank, cands[i]["candidate_id"], p.get("current_title", ""),
                     p.get("years_of_experience", 0), f"{base[i]:.3f}",
                     "honeypot" if hp[i] >= 0.6 else "ok", reason])
        esc = f'"{reason.replace(chr(34), chr(34)*2)}"' if any(ch in reason for ch in ',"\n') else reason
        csv_lines.append(f'{cands[i]["candidate_id"]},{rank},{mono:.4f},{esc}')

    hp_in_top = sum(1 for i in top if hp[i] >= 0.6)
    return rows, "\n".join(csv_lines) + "\n", hp_in_top, len(cands)


def run(file_obj, pasted_text, top_n):
    if file_obj is not None:
        # Gradio 4 passes a temp-file object (.name); Gradio 5 passes a path str.
        path = getattr(file_obj, "name", file_obj)
        with open(path, "r", encoding="utf-8") as f:
            text = f.read()
    elif pasted_text and pasted_text.strip():
        text = pasted_text
    elif os.path.exists("sample_candidates.jsonl"):
        with open("sample_candidates.jsonl", "r", encoding="utf-8") as f:
            text = f.read()
    else:
        return [], "Upload a `candidates.jsonl` sample (or paste JSONL) and click **Rank candidates**.", None

    cands = _read_jsonl(text)
    if not cands:
        return [], "No valid candidates found in the input.", None

    top_n = min(int(top_n), len(cands))
    rows, csv_text, hp_in_top, total = rank_pool(cands, top_n)

    tmp = tempfile.NamedTemporaryFile(mode="w", suffix=".csv", delete=False, encoding="utf-8", newline="")
    tmp.write(csv_text); tmp.close()

    status = f"Ranked {total} candidates · showing top {top_n} · honeypots in top: {hp_in_top} (want 0)"
    return rows, status, tmp.name


with gr.Blocks(title="HireMind AI — Ranker Sandbox", theme=gr.themes.Base()) as demo:
    gr.Markdown(
        "# 🧠 HireMind AI — Ranker Sandbox\n"
        "Reproducible, **offline, CPU-only** candidate ranking for the Redrob "
        "*Senior AI Engineer* role. Reads profiles, not keywords — sinks "
        "keyword-stuffers & honeypots. Upload a `candidates.jsonl` sample or use the bundled one."
    )
    with gr.Row():
        with gr.Column(scale=1):
            file_in = gr.File(label="candidates.jsonl (optional)", file_types=[".jsonl", ".json", ".txt"])
            paste_in = gr.Textbox(label="…or paste JSONL", lines=4, placeholder='{"candidate_id":"CAND_0000001", ...}')
            top_n = gr.Slider(5, 100, value=20, step=5, label="Top N")
            btn = gr.Button("Rank candidates", variant="primary")
        with gr.Column(scale=2):
            status = gr.Markdown()
            out_csv = gr.File(label="Download submission.csv")
    table = gr.Dataframe(
        headers=["rank", "candidate_id", "title", "years", "score", "flag", "reasoning"],
        label="Ranked candidates", wrap=True,
    )
    btn.click(run, [file_in, paste_in, top_n], [table, status, out_csv])
    demo.load(run, [file_in, paste_in, top_n], [table, status, out_csv])  # rank bundled sample on load

if __name__ == "__main__":
    demo.launch()
