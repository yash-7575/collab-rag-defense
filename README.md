# collab-rag-defense — Mid-Sem PoC

Proof-of-concept for the EDI research project on **collaborative RAG poisoning**.
This mid-sem deliverable reproduces the published **PoisonedRAG** attack against a
minimal RAG pipeline and measures ASR under (a) no defense and (b) a weak baseline
**perplexity filter** — motivating the novel Collaborative Signal Detection Layer
scheduled for after mid-sem.

**Out of scope for mid-sem** (do not implement yet): Consistency Analyzer,
Co-occurrence Tracker, Provenance Aggregation, Risk Scoring Engine.

## Stack

- Embeddings: `sentence-transformers/all-MiniLM-L6-v2` (local)
- Vector store: FAISS (local, `faiss-cpu`)
- LLM: Groq (`openai/gpt-oss-120b` by default; free-tier)
- Perplexity model: GPT-2 (`transformers`)
- Orchestration: LangChain
- UI: **React + Vite + TypeScript + Tailwind v4** (`web/`), served by **FastAPI** (`server/`)
- Dataset: Natural Questions via BEIR

## Setup

```bash
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
# edit .env and set:
#   GROQ_API_KEY=gsk_...
#   GROQ_MODEL=openai/gpt-oss-120b   # or qwen/qwen3.8-27b

cd web && npm install && cd ..
```

## Run

### Pipeline

```bash
# 1. Download NQ subset, build FAISS index (~200 passages, 50 questions)
python scripts/01_build_corpus.py

# 2. Generate PoisonedRAG-style poisoned docs (~5 per question)
python scripts/02_generate_poison.py --n 5

# 3. Evaluate: undefended vs. perplexity-filter
python scripts/03_run_eval.py --questions 50

# 4. Export ASR table -> results/results.md
python scripts/04_export_results.py
```

### Web UI

Two processes: the API and the Vite dev server (the dev server proxies `/api` to
the backend).

```bash
# terminal 1 — API
source .venv/bin/activate
uvicorn server.main:app --reload --port 8000

# terminal 2 — dev server (hot reload)
cd web && npm run dev          # http://localhost:5173
```

For a single-process production build, build the frontend and let FastAPI serve it:

```bash
cd web && npm run build && cd ..
uvicorn server.main:app --port 8000   # http://localhost:8000
```

## Layout

```
src/
  config.py     # paths, models, thresholds (reads .env)
  corpus.py     # BEIR NQ subset loader
  pipeline.py   # FAISS + Groq RAG chain
  attack.py     # PoisonedRAG black-box poison generator
  defense.py    # GPT-2 perplexity filter
  logger.py     # SQLite per-run log
  evaluate.py   # ASR loop for both modes
scripts/        # 01..04 driver scripts
server/main.py  # FastAPI backend over src.* + logs/runs.sqlite
web/            # React + Vite frontend (landing + lab)
data/           # (gitignored) corpus, questions, poisoned docs, FAISS index
logs/           # (gitignored) runs.sqlite
external/       # (gitignored) PoisonedRAG upstream clone (provenance)
```

## Web UI

- `/` — landing: threat model, pipeline, live findings, related work, method.
- `/lab` — interactive lab: pick a corpus question or type your own, dial the
  poison count, and run both pipelines side by side (retrieved passages,
  perplexity histogram, per-question report).

The UI reads its numbers from the SQLite log and the `src.*` pipeline via the
API — no data is hardcoded.

## Attack methodology

We follow the PoisonedRAG black-box recipe (Zou et al., USENIX Security 2025):
for each target question `q`, an attacker-chosen incorrect answer `t` is
synthesized, then the LLM is prompted to craft a short passage that (a) begins
with `q` (so it retrieves for `q`) and (b) asserts `t`. The upstream repo is
cloned into `external/PoisonedRAG/` for provenance and reference. See
`src/attack.py`.

## Defense methodology

`src/defense.py` scores each retrieved passage with GPT-2 perplexity and drops
those above a threshold. Threshold is calibrated as the 95th percentile of
perplexity over the **clean corpus only** (no leakage from poisoned data).
This is the well-known weak baseline — the PoisonedRAG paper reports AUC 0.25–0.30
for perplexity detection, and our numbers should show substantial residual ASR
even with the filter on. That residual ASR is the motivation for the novel
collaborative-detection work post-mid-sem.

## Metrics

- **ASR** = fraction of eval questions where the attacker's `target_answer`
  appears as a substring of the LLM output (standard PoisonedRAG metric).
- **Gold match** = fraction where the gold-answer surrogate (NQ passage title)
  appears in the output. Coarse sanity signal, not the headline number.

## References

- PoisonedRAG (attack): https://github.com/sleeepeer/PoisonedRAG
- poisoned-rag-defense (methodology reference): https://github.com/olliematthews/poisoned-rag-defense
- BEIR: https://github.com/beir-cellar/beir
- Groq quickstart: https://console.groq.com/docs/quickstart
