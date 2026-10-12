# collab-rag-defense

Mid-sem PoC for the EDI research project on **collaborative RAG poisoning**. Reproduces the PoisonedRAG attack (Zou et al., USENIX Security) against a minimal RAG pipeline (MiniLM embeddings + FAISS + Groq LLM) and measures Attack Success Rate (ASR) under (a) no defense and (b) a weak GPT-2 perplexity filter. The residual ASR after the filter motivates the post-mid-sem Collaborative Signal Detection Layer (do NOT implement it yet — out of scope).

## Commands

All Python commands run inside the repo venv:

```bash
source .venv/bin/activate
```

Pipeline (run in order, each writes to gitignored `data/`):

```bash
python scripts/01_build_corpus.py          # BEIR NQ subset -> 200 passages, 50 questions
python scripts/02_generate_poison.py --n 5 # PoisonedRAG-style poisoned docs (Groq)
python scripts/03_run_eval.py --questions 50   # ASR eval: undefended vs perplexity filter
python scripts/04_export_results.py        # SQLite -> results/results.md
uvicorn server.main:app --port 8000        # FastAPI API + built UI (http://localhost:8000)
cd web && npm run dev                       # Vite hot-reload dev server (:5173, proxies /api)
```

The web UI replaces the old Streamlit demo. Two routes: `/` (landing) and `/lab`
(interactive run + report). `npm run build` in `web/` produces `dist/`, which the
FastAPI server serves for single-process hosting.

Quick checks:

```bash
python -c "from src import pipeline"       # imports heavy deps; verifies env
sqlite3 logs/runs.sqlite "SELECT * FROM runs LIMIT 5;"
```

There is no test suite or linter configured; verify changes by running the relevant script end-to-end.

## Layout

- `src/config.py` — single source of truth: paths, model names, thresholds (`TOP_K=5`, `CORPUS_SIZE=200`, `NUM_QUESTIONS=50`, `POISON_PER_QUESTION=5`, `PERPLEXITY_PERCENTILE=95`, `MAX_TOKENS=512`). Reads `.env`.
- `src/corpus.py` — downloads BEIR NQ, builds passage/question subsets; gold answer surrogate = passage title (NQ short answers aren't in BEIR).
- `src/pipeline.py` — LangChain RAG chain (HuggingFace embeddings, FAISS, Groq `ChatGroq`). `answer()` takes `extra_docs` (poison) and an optional `filter_fn(retrieved) -> (kept, dropped)`.
- `src/attack.py` — PoisonedRAG black-box generator: LLM picks a wrong `target_answer`, then crafts a passage starting with the question and asserting it. Poison docs get `metadata["poisoned"]=True`.
- `src/defense.py` — GPT-2 perplexity scorer; threshold calibrated as 95th pct over **clean corpus only** (no poisoned leakage — this is intentional).
- `src/evaluate.py` — eval loop, logs every query to SQLite in both modes.
- `src/logger.py` — SQLite schema at `logs/runs.sqlite`; ASR = `target_answer.lower() in answer.lower()`.
- `scripts/01..04_*.py` — CLI drivers; each does `sys.path.insert` then imports `src.*`.
- `server/main.py` — FastAPI backend: wraps `src.*` + `logs/runs.sqlite`. Endpoints `/api/{health,meta,summary,questions,results,query,eval}`; serves `web/dist` when built. Live ad-hoc queries are not logged; only `run_eval` writes to SQLite.
- `web/` — React + Vite + Tailwind v4 UI (landing + lab). Design tokens live in `web/src/index.css`; API client in `web/src/lib/api.ts`. Do not hand-edit `web/dist` (build artifact).
- `prove-landing/` — **unrelated** standalone React+Vite recreation of the prove.com homepage living in this repo; has its own node_modules and dev server (`npm run dev` inside that folder). Don't touch it when working on the Python side.

## Gitignored but essential

`data/` (corpus, questions, poisoned docs, FAISS index, beir_raw), `logs/runs.sqlite`, `results/`, `external/PoisonedRAG/` (upstream clone kept for provenance), `.env`. If any are missing, re-run scripts 01–02; eval without poison files silently skips questions (`evaluate.run_eval` `continue`s when `poison_docs` is empty).

## Conventions

- Python 3.11+ style: `from __future__ import annotations`, lowercase module names, type hints on public functions, no docstring padding — comments exist to explain research decisions (e.g., calibration methodology).
- Runtime config goes through `src/config.py`; never hardcode paths, model names, or thresholds elsewhere.
- `.env` holds `GROQ_API_KEY` and `GROQ_MODEL` (`openai/gpt-oss-120b` default). Never commit `.env` or echo the key.
- Eval changes must keep both metrics consistent: ASR (target_hit substring match) and gold match; results land in `results/results.md` only via `scripts/04_export_results.py`.
- `research.md` is the master research document (paper survey, gap, proposal) — update it when the methodology or scope changes.
- Git: work is uncommitted on `main`; don't commit unless asked.

## Gotchas

- First run of scripts 01/03 downloads NQ via BEIR and GPT-2 via transformers — slow; the venv pins `faiss-cpu`, so FAISS index builds are CPU-only.
- `pipeline.build_query_index` **re-embeds the entire corpus whenever `extra_docs` is non-empty** (known inefficiency, acceptable at 200 passages).
- Groq free tier: attack generation and eval both hit the API; keep `temperature`/retries as-is unless testing. `MAX_TOKENS=512` caps model output to stay under the free tier's output-tokens-per-minute ceiling — raising it can trigger HTTP 429 (`rate_limit_exceeded`) with large models.
- The API calibrates the perplexity threshold once and caches it to `logs/threshold.txt`; delete that file to force re-calibration.
