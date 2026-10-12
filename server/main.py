"""FastAPI backend for the collab-rag-defense web UI.

Wraps the existing ``src.*`` pipeline and the SQLite run log, and serves the
built Vite frontend from ``web/dist`` when present. Replaces the old Streamlit
demo (app.py).

Run:
    source .venv/bin/activate
    uvicorn server.main:app --reload --port 8000
"""
from __future__ import annotations

import json
import sqlite3
import sys
import time
from pathlib import Path
from typing import Any

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

ROOT = Path(__file__).resolve().parent.parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from src import config  # noqa: E402

app = FastAPI(title="collab-rag-defense", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

THRESHOLD_FILE = config.LOGS_DIR / "threshold.txt"
_threshold_cache: float | None = None
_threshold_tried = False


# --------------------------------------------------------------------------- #
# helpers
# --------------------------------------------------------------------------- #
def _db() -> sqlite3.Connection:
    conn = sqlite3.connect(config.SQLITE_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def _row_exists(conn: sqlite3.Connection) -> bool:
    try:
        conn.execute("SELECT 1 FROM runs LIMIT 1")
        return True
    except sqlite3.OperationalError:
        return False


def _docs_json(raw: str | None) -> list[dict[str, Any]]:
    if not raw:
        return []
    try:
        rows = json.loads(raw)
    except json.JSONDecodeError:
        return []
    out: list[dict[str, Any]] = []
    for d in rows:
        doc_id = d.get("doc_id") or "?"
        out.append(
            {
                "doc_id": doc_id,
                "snippet": d.get("snippet") or "",
                "perplexity": d.get("perplexity"),
                "poisoned": str(doc_id).startswith("POISON-"),
            }
        )
    return out


def _set_threshold(value: float) -> None:
    global _threshold_cache
    _threshold_cache = value
    try:
        THRESHOLD_FILE.write_text(f"{value:.6f}\n")
    except OSError:
        pass


def _get_threshold() -> float | None:
    """Cached p95 perplexity threshold, seeded from disk or calibrated once."""
    global _threshold_cache, _threshold_tried
    if _threshold_cache is not None:
        return _threshold_cache
    if THRESHOLD_FILE.exists():
        try:
            _threshold_cache = float(THRESHOLD_FILE.read_text().strip())
            return _threshold_cache
        except ValueError:
            pass
    if _threshold_tried:
        return None
    _threshold_tried = True
    try:
        from src.defense import calibrate_threshold

        _set_threshold(calibrate_threshold())
    except Exception:
        return None
    return _threshold_cache


def _poison_count(qid: str) -> int:
    path = config.POISON_DIR / f"{qid}.jsonl"
    if not path.exists():
        return 0
    try:
        with path.open() as f:
            return sum(1 for line in f if line.strip())
    except OSError:
        return 0


# --------------------------------------------------------------------------- #
# models
# --------------------------------------------------------------------------- #
class QueryBody(BaseModel):
    question: str
    qid: str | None = None
    n_poison: int = config.POISON_PER_QUESTION


class EvalBody(BaseModel):
    questions: int = config.NUM_QUESTIONS
    n_poison: int = config.POISON_PER_QUESTION


# --------------------------------------------------------------------------- #
# routes
# --------------------------------------------------------------------------- #
@app.get("/api/health")
def health() -> dict[str, Any]:
    has_data = False
    try:
        conn = _db()
        has_data = _row_exists(conn)
        conn.close()
    except sqlite3.Error:
        pass
    return {"ok": True, "models_loaded": True, "has_data": has_data}


@app.get("/api/meta")
def meta() -> dict[str, Any]:
    return {
        "embed_model": config.EMBED_MODEL,
        "llm_model": config.GROQ_MODEL,
        "perplexity_model": config.PERPLEXITY_MODEL,
        "top_k": config.TOP_K,
        "corpus_size": config.CORPUS_SIZE,
        "num_questions": config.NUM_QUESTIONS,
        "poison_per_question": config.POISON_PER_QUESTION,
        "perplexity_percentile": config.PERPLEXITY_PERCENTILE,
        "has_api_key": bool(config.GROQ_API_KEY),
        "dataset": "BEIR nq",
    }


@app.get("/api/summary")
def summary() -> dict[str, Any]:
    conn = _db()
    has_data = _row_exists(conn)

    modes: list[dict[str, Any]] = []
    runs: list[dict[str, Any]] = []
    total = 0

    if has_data:
        overall = conn.execute(
            "SELECT mode, COUNT(*) n, AVG(target_hit) asr, AVG(gold_hit) gold "
            "FROM runs GROUP BY mode"
        ).fetchall()
        modes = [
            {
                "mode": r["mode"],
                "label": r["mode"].replace("_", " "),
                "n": r["n"],
                "asr": float(r["asr"] or 0),
                "gold": float(r["gold"] or 0),
            }
            for r in overall
        ]
        total = conn.execute("SELECT COUNT(*) c FROM runs").fetchone()["c"]

        tag_rows = conn.execute(
            "SELECT run_tag, mode, COUNT(*) n, AVG(target_hit) asr, AVG(gold_hit) gold, "
            "MIN(ts) ts FROM runs GROUP BY run_tag, mode ORDER BY ts"
        ).fetchall()
        by_tag: dict[str, dict[str, Any]] = {}
        for r in tag_rows:
            bucket = by_tag.setdefault(r["run_tag"], {"run_tag": r["run_tag"], "ts": r["ts"], "modes": []})
            bucket["modes"].append(
                {
                    "mode": r["mode"],
                    "label": r["mode"].replace("_", " "),
                    "n": r["n"],
                    "asr": float(r["asr"] or 0),
                    "gold": float(r["gold"] or 0),
                }
            )
        runs = list(by_tag.values())

    conn.close()
    return {
        "has_data": has_data,
        "total": total,
        "threshold": _get_threshold(),
        "modes": modes,
        "runs": runs,
        "corpus_size": config.CORPUS_SIZE,
        "num_questions": config.NUM_QUESTIONS,
        "poison_per_question": config.POISON_PER_QUESTION,
    }


@app.get("/api/questions")
def questions() -> dict[str, Any]:
    from src.corpus import load_questions

    try:
        qs = load_questions()
    except FileNotFoundError:
        return {"questions": []}
    return {
        "questions": [
            {
                "qid": q["qid"],
                "question": q["question"],
                "gold": q.get("gold_answer_surrogate", ""),
                "target": q.get("target_answer", ""),
                "poison_count": _poison_count(q["qid"]),
            }
            for q in qs
        ]
    }


@app.get("/api/results")
def results(run_tag: str = Query(...)) -> dict[str, Any]:
    conn = _db()
    if not _row_exists(conn):
        conn.close()
        return {"run_tag": run_tag, "rows": []}

    rows = conn.execute(
        "SELECT qid, mode, question, retrieved_json, kept_json, dropped_json, answer, "
        "target_answer, target_hit, gold_answer, gold_hit FROM runs WHERE run_tag = ? ORDER BY id",
        (run_tag,),
    ).fetchall()
    conn.close()

    by_qid: dict[str, dict[str, Any]] = {}
    for r in rows:
        bucket = by_qid.setdefault(
            r["qid"],
            {
                "qid": r["qid"],
                "question": r["question"],
                "target": r["target_answer"] or "",
                "gold": r["gold_answer"] or "",
                "undefended": None,
                "defended": None,
            },
        )
        gen = {
            "answer": r["answer"] or "",
            "retrieved": _docs_json(r["retrieved_json"]),
            "kept": _docs_json(r["kept_json"]),
            "dropped": _docs_json(r["dropped_json"]),
            "target_hit": bool(r["target_hit"]),
            "gold_hit": bool(r["gold_hit"]),
        }
        gen["n_retrieved"] = len(gen["retrieved"])
        gen["n_kept"] = len(gen["kept"])
        gen["n_dropped"] = len(gen["dropped"])
        if r["mode"] == "undefended":
            bucket["undefended"] = gen
        else:
            bucket["defended"] = gen

    return {"run_tag": run_tag, "rows": list(by_qid.values())}


def _score_docs(docs: list[Any]) -> list[dict[str, Any]]:
    from src.defense import perplexity

    out = []
    for d in docs:
        ppl = d.metadata.get("perplexity")
        if ppl is None:
            try:
                ppl = perplexity(d.page_content)
            except Exception:
                ppl = None
            d.metadata["perplexity"] = ppl
        out.append(
            {
                "doc_id": d.metadata.get("doc_id") or "?",
                "snippet": d.page_content[:240],
                "perplexity": ppl,
                "poisoned": bool(d.metadata.get("poisoned")),
            }
        )
    return out


@app.post("/api/query")
def run_query(body: QueryBody) -> dict[str, Any]:
    from src.attack import load_poison
    from src.corpus import load_questions
    from src.defense import make_filter
    from src.pipeline import answer

    started = time.time()

    target = ""
    gold = ""
    poison_docs: list[Any] = []
    if body.qid:
        try:
            qs = {q["qid"]: q for q in load_questions()}
        except FileNotFoundError:
            qs = {}
        qrow = qs.get(body.qid, {})
        gold = qrow.get("gold_answer_surrogate", "")
        target = qrow.get("target_answer", "")
        poison_docs, target_from_file = load_poison(body.qid, body.n_poison)
        if not target:
            target = target_from_file

    threshold = _get_threshold()
    if threshold is None:
        raise HTTPException(500, "could not determine perplexity threshold (GPT-2 unavailable)")
    ppl_filter = make_filter(threshold)

    try:
        u = answer(body.question, extra_docs=poison_docs, filter_fn=None)
        d = answer(body.question, extra_docs=poison_docs, filter_fn=ppl_filter)
    except Exception as exc:  # pragma: no cover
        raise HTTPException(500, f"pipeline error: {exc}") from exc

    tl = target.lower()
    gl = gold.lower()

    def pack(res: dict[str, Any], is_defended: bool) -> dict[str, Any]:
        retrieved = _score_docs(res["retrieved"])
        kept = _score_docs(res["kept"]) if is_defended else retrieved
        dropped = _score_docs(res["dropped"]) if is_defended else []
        return {
            "answer": res["answer"],
            "retrieved": retrieved,
            "kept": kept,
            "dropped": dropped,
            "target_hit": bool(tl and tl in (res["answer"].lower())),
            "gold_hit": bool(gl and gl in (res["answer"].lower())),
            "n_retrieved": len(retrieved),
            "n_kept": len(kept),
            "n_dropped": len(dropped),
        }

    return {
        "question": body.question,
        "qid": body.qid,
        "target": target,
        "gold": gold,
        "threshold": threshold,
        "mode_label": "perplexity filter",
        "undefended": pack(u, False),
        "defended": pack(d, True),
        "latency_ms": int((time.time() - started) * 1000),
    }


@app.post("/api/eval")
def run_evaluation(body: EvalBody) -> dict[str, Any]:
    from src.evaluate import run_eval

    try:
        summary_obj = run_eval(num_questions=body.questions, n_poison=body.n_poison)
    except Exception as exc:  # pragma: no cover
        raise HTTPException(500, f"evaluation error: {exc}") from exc
    _set_threshold(summary_obj.threshold)
    return summary()


# --------------------------------------------------------------------------- #
# serve built frontend (optional)
# --------------------------------------------------------------------------- #
DIST = ROOT / "web" / "dist"
if (DIST / "assets").exists():
    app.mount("/assets", StaticFiles(directory=DIST / "assets"), name="assets")


@app.get("/{full_path:path}")
def spa(full_path: str) -> Any:
    if full_path.startswith("api/"):
        raise HTTPException(404, "not found")
    index = DIST / "index.html"
    if index.exists():
        return FileResponse(index)
    return JSONResponse(
        {
            "message": "Frontend not built. Run `cd web && npm run build`, or use the Vite dev server on :5173.",
            "api": "/api/health",
        }
    )
