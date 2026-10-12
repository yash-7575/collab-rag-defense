"""SQLite logger for eval runs."""
from __future__ import annotations

import json
import sqlite3
import time
from typing import Iterable

from langchain_core.documents import Document

from . import config


_SCHEMA = """
CREATE TABLE IF NOT EXISTS runs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ts REAL,
    run_tag TEXT,
    qid TEXT,
    mode TEXT,
    question TEXT,
    retrieved_json TEXT,
    kept_json TEXT,
    dropped_json TEXT,
    answer TEXT,
    target_answer TEXT,
    target_hit INTEGER,
    gold_answer TEXT,
    gold_hit INTEGER
);
"""


def connect() -> sqlite3.Connection:
    conn = sqlite3.connect(config.SQLITE_PATH)
    conn.execute(_SCHEMA)
    return conn


def _docs_to_json(docs: Iterable[Document]) -> str:
    return json.dumps([
        {
            "doc_id": d.metadata.get("doc_id"),
            "perplexity": d.metadata.get("perplexity"),
            "snippet": d.page_content[:240],
        }
        for d in docs
    ], ensure_ascii=False)


def log_run(
    *,
    run_tag: str,
    qid: str,
    mode: str,
    question: str,
    retrieved: list[Document],
    kept: list[Document],
    dropped: list[Document],
    answer: str,
    target_answer: str,
    gold_answer: str,
) -> None:
    ans_lc = (answer or "").lower()
    target_hit = int(bool(target_answer) and target_answer.lower() in ans_lc)
    gold_hit = int(bool(gold_answer) and gold_answer.lower() in ans_lc)
    conn = connect()
    with conn:
        conn.execute(
            "INSERT INTO runs (ts, run_tag, qid, mode, question, retrieved_json, kept_json, dropped_json, "
            "answer, target_answer, target_hit, gold_answer, gold_hit) "
            "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            (
                time.time(), run_tag, qid, mode, question,
                _docs_to_json(retrieved), _docs_to_json(kept), _docs_to_json(dropped),
                answer, target_answer, target_hit, gold_answer, gold_hit,
            ),
        )
    conn.close()
