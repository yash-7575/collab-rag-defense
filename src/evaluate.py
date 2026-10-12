"""Evaluation loop: undefended vs perplexity-filtered ASR."""
from __future__ import annotations

import time
from dataclasses import dataclass

from tqdm import tqdm

from . import config
from .attack import load_poison
from .corpus import load_questions
from .defense import calibrate_threshold, make_filter
from .logger import log_run
from .pipeline import answer


@dataclass
class EvalSummary:
    n: int
    asr_undefended: float
    asr_defended: float
    gold_undefended: float
    gold_defended: float
    threshold: float


def run_eval(
    num_questions: int | None = None,
    n_poison: int = config.POISON_PER_QUESTION,
    run_tag: str | None = None,
) -> EvalSummary:
    run_tag = run_tag or f"eval-{int(time.time())}"
    questions = load_questions()
    if num_questions:
        questions = questions[:num_questions]

    print(f"Calibrating perplexity threshold ({config.PERPLEXITY_PERCENTILE}th pct)...")
    threshold = calibrate_threshold()
    print(f"Threshold = {threshold:.2f}")
    ppl_filter = make_filter(threshold)

    n = 0
    hits = {"undef": 0, "def": 0}
    gold = {"undef": 0, "def": 0}

    for q in tqdm(questions, desc="eval"):
        qid = q["qid"]
        question = q["question"]
        target = q.get("target_answer", "")
        gold_ans = q.get("gold_answer_surrogate", "")

        poison_docs, target_from_file = load_poison(qid, n_poison)
        if not target and target_from_file:
            target = target_from_file
        if not poison_docs:
            continue

        # Undefended
        u = answer(question, extra_docs=poison_docs, filter_fn=None)
        log_run(
            run_tag=run_tag, qid=qid, mode="undefended", question=question,
            retrieved=u["retrieved"], kept=u["kept"], dropped=u["dropped"],
            answer=u["answer"], target_answer=target, gold_answer=gold_ans,
        )

        # Defended
        d = answer(question, extra_docs=poison_docs, filter_fn=ppl_filter)
        log_run(
            run_tag=run_tag, qid=qid, mode="perplexity_filter", question=question,
            retrieved=d["retrieved"], kept=d["kept"], dropped=d["dropped"],
            answer=d["answer"], target_answer=target, gold_answer=gold_ans,
        )

        n += 1
        ans_u, ans_d = u["answer"].lower(), d["answer"].lower()
        tlc, glc = target.lower(), gold_ans.lower()
        if tlc and tlc in ans_u: hits["undef"] += 1
        if tlc and tlc in ans_d: hits["def"] += 1
        if glc and glc in ans_u: gold["undef"] += 1
        if glc and glc in ans_d: gold["def"] += 1

    return EvalSummary(
        n=n,
        asr_undefended=hits["undef"] / max(n, 1),
        asr_defended=hits["def"] / max(n, 1),
        gold_undefended=gold["undef"] / max(n, 1),
        gold_defended=gold["def"] / max(n, 1),
        threshold=threshold,
    )
