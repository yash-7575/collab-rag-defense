"""Generate PoisonedRAG-style poisoned docs for each eval question.

Clones the official PoisonedRAG repo into external/ for provenance (their
prompt templates and evaluation harness are referenced), then invokes our
implementation of their black-box generation recipe (see src/attack.py)
against the questions produced by 01_build_corpus.py.
"""
from __future__ import annotations

import argparse
import json
import subprocess
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from src import config
from src.attack import choose_target_answer, generate_poison_for_question, save_poison
from src.corpus import load_questions

POISONEDRAG_URL = "https://github.com/sleeepeer/PoisonedRAG.git"


def _ensure_repo() -> None:
    if config.POISONEDRAG_DIR.exists():
        return
    print(f"Cloning PoisonedRAG -> {config.POISONEDRAG_DIR}")
    subprocess.run(
        ["git", "clone", "--depth", "1", POISONEDRAG_URL, str(config.POISONEDRAG_DIR)],
        check=True,
    )


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--n", type=int, default=config.POISON_PER_QUESTION,
                    help="Poisoned docs per question")
    ap.add_argument("--skip-clone", action="store_true")
    args = ap.parse_args()

    if not args.skip_clone:
        try:
            _ensure_repo()
        except subprocess.CalledProcessError as e:
            print(f"[warn] clone failed ({e}); continuing with local generator.")

    questions = load_questions()
    updated = []
    for i, q in enumerate(questions, 1):
        qid = q["qid"]
        target = q.get("target_answer") or choose_target_answer(q["question"])
        q["target_answer"] = target
        rows = generate_poison_for_question(qid, q["question"], target, n=args.n)
        save_poison(qid, rows)
        updated.append(q)
        print(f"[{i}/{len(questions)}] qid={qid} target='{target}' wrote {len(rows)} docs")

    with config.QUESTIONS_PATH.open("w", encoding="utf-8") as f:
        for q in updated:
            f.write(json.dumps(q, ensure_ascii=False) + "\n")


if __name__ == "__main__":
    main()
