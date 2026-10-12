"""Load a small NQ subset for RAG evaluation.

Downloads Natural Questions via BEIR, picks NUM_QUESTIONS questions that each
have at least one relevant passage in the corpus, then builds a compact
CORPUS_SIZE-passage subset that (a) contains every gold passage and (b) is
padded with random distractors up to the size budget.
"""
from __future__ import annotations

import json
import random
from pathlib import Path
from typing import Iterable

from beir import util
from beir.datasets.data_loader import GenericDataLoader

from . import config

BEIR_DATASET = "nq"
BEIR_URL = f"https://public.ukp.informatik.tu-darmstadt.de/thakur/BEIR/datasets/{BEIR_DATASET}.zip"


def _download_nq() -> Path:
    out_dir = config.BEIR_DIR
    dataset_dir = out_dir / BEIR_DATASET
    if not dataset_dir.exists():
        util.download_and_unzip(BEIR_URL, str(out_dir))
    return dataset_dir


def _write_jsonl(path: Path, rows: Iterable[dict]) -> int:
    n = 0
    with path.open("w", encoding="utf-8") as f:
        for row in rows:
            f.write(json.dumps(row, ensure_ascii=False) + "\n")
            n += 1
    return n


def build_subset(
    num_questions: int = config.NUM_QUESTIONS,
    corpus_size: int = config.CORPUS_SIZE,
    seed: int = 42,
) -> tuple[int, int]:
    """Return (n_passages_written, n_questions_written)."""
    dataset_dir = _download_nq()
    corpus, queries, qrels = GenericDataLoader(data_folder=str(dataset_dir)).load(split="test")

    rng = random.Random(seed)

    # Pick questions that have >=1 relevant doc actually in the corpus.
    eligible = [
        qid for qid, rels in qrels.items()
        if any(did in corpus for did, score in rels.items() if score > 0)
    ]
    rng.shuffle(eligible)
    chosen_qids = eligible[:num_questions]

    # Collect gold passages first (guarantees retrievability of correct answer).
    gold_docs: dict[str, dict] = {}
    questions_rows: list[dict] = []
    for qid in chosen_qids:
        rel_dids = [did for did, s in qrels[qid].items() if s > 0 and did in corpus]
        if not rel_dids:
            continue
        gold_did = rel_dids[0]
        gold_docs[gold_did] = corpus[gold_did]
        gold_text = (corpus[gold_did].get("title", "") + " " + corpus[gold_did].get("text", "")).strip()
        # Heuristic: extract a short answer surrogate. NQ short answers are not
        # in BEIR, so we use the passage title as a coarse gold surrogate. The
        # evaluate script also checks gold via the retrieval id, not string.
        questions_rows.append({
            "qid": qid,
            "question": queries[qid],
            "gold_doc_id": gold_did,
            "gold_answer_surrogate": corpus[gold_did].get("title", "")[:120],
            "target_answer": "",  # filled by attack step (attacker-chosen)
        })

    # Pad with random distractors up to corpus_size.
    remaining_ids = [d for d in corpus.keys() if d not in gold_docs]
    rng.shuffle(remaining_ids)
    pad_n = max(0, corpus_size - len(gold_docs))
    padded_ids = remaining_ids[:pad_n]

    passage_rows = []
    for did, doc in gold_docs.items():
        passage_rows.append({"doc_id": did, "title": doc.get("title", ""), "text": doc.get("text", "")})
    for did in padded_ids:
        doc = corpus[did]
        passage_rows.append({"doc_id": did, "title": doc.get("title", ""), "text": doc.get("text", "")})

    n_p = _write_jsonl(config.CORPUS_PATH, passage_rows)
    n_q = _write_jsonl(config.QUESTIONS_PATH, questions_rows)
    return n_p, n_q


def load_corpus() -> list[dict]:
    with config.CORPUS_PATH.open() as f:
        return [json.loads(line) for line in f]


def load_questions() -> list[dict]:
    with config.QUESTIONS_PATH.open() as f:
        return [json.loads(line) for line in f]
