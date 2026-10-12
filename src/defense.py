"""Perplexity-based defense (weak baseline).

We score each retrieved passage with GPT-2 and drop those whose perplexity
exceeds a threshold. The threshold is calibrated ONLY on clean corpus text
(95th percentile) so we don't leak info from poisoned data — this is the
honest baseline the PoisonedRAG paper itself uses to show weakness.
"""
from __future__ import annotations

import math
from functools import lru_cache

import numpy as np
import torch
from langchain_core.documents import Document
from transformers import GPT2LMHeadModel, GPT2TokenizerFast

from . import config
from .corpus import load_corpus

_DEVICE = "cuda" if torch.cuda.is_available() else "cpu"


@lru_cache(maxsize=1)
def _load_gpt2():
    tok = GPT2TokenizerFast.from_pretrained(config.PERPLEXITY_MODEL)
    mdl = GPT2LMHeadModel.from_pretrained(config.PERPLEXITY_MODEL).to(_DEVICE)
    mdl.eval()
    return tok, mdl


@torch.no_grad()
def perplexity(text: str, max_tokens: int = 512) -> float:
    tok, mdl = _load_gpt2()
    if not text.strip():
        return float("inf")
    enc = tok(text, return_tensors="pt", truncation=True, max_length=max_tokens)
    input_ids = enc.input_ids.to(_DEVICE)
    if input_ids.shape[1] < 2:
        return float("inf")
    out = mdl(input_ids, labels=input_ids)
    return float(math.exp(min(out.loss.item(), 20)))


def calibrate_threshold(percentile: float = config.PERPLEXITY_PERCENTILE, sample: int = 200) -> float:
    corpus = load_corpus()[:sample]
    scores = []
    for row in corpus:
        text = (row.get("title", "") + " " + row.get("text", "")).strip()
        scores.append(perplexity(text))
    return float(np.percentile(scores, percentile))


def make_filter(threshold: float):
    def _filter(docs: list[Document]) -> tuple[list[Document], list[Document]]:
        kept, dropped = [], []
        for d in docs:
            ppl = perplexity(d.page_content)
            d.metadata["perplexity"] = ppl
            (kept if ppl <= threshold else dropped).append(d)
        return kept, dropped
    return _filter
