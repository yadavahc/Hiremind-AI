---
title: HireMind AI Ranker
emoji: 🧠
colorFrom: gray
colorTo: indigo
sdk: gradio
python_version: "3.11"
app_file: app.py
pinned: false
license: mit
---

# HireMind AI — Ranker Sandbox

Reproducible, **offline, CPU-only** candidate ranking for the Redrob AI Hiring
Hackathon (*Senior AI Engineer — Founding Team*).

Upload a `candidates.jsonl` sample (or use the bundled 60-candidate one), pick
**Top N**, and the same ranking logic as the full `scripts/rank.py` produces an
explained, validator-compatible ranking. It reads **profiles, not keywords** —
keyword-stuffers and honeypots are pushed down.

- **Main app & repo:** https://github.com/yadavahc/Hiremind-AI
- **Full ranker:** `scripts/rank.py` — 100K candidates in ~71s on CPU, stdlib only.
- No GPU, no network, no API calls during ranking.
