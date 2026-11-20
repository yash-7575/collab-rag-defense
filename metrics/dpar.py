"""Candidate DPAR (Document Poisoning Alignment Rate) scoring for CoSDL.

STATUS: candidate project rubric. Weights/thresholds are NOT established ground
truth. Calibrate on a labelled validation set and report false positives on
clean documents. Verify the original citation before describing as published.

Sentence score:  P(s_i) = min(f_target + f_instr + f_auth + f_kw + f_ctx, 100)
Document score:  Delta = 0.45 * (pi_P * 100) + 0.35 * mean(P) + 0.20 * max(P)

All numeric settings live in DparConfig (and can be loaded from JSON), so
calibration never requires editing code.
"""
from __future__ import annotations

import json
import re
from dataclasses import asdict, dataclass, field
from pathlib import Path
from typing import Dict, List, Optional

DEFAULT_STOPWORDS = [
    "a", "an", "the", "is", "are", "was", "were", "of", "in", "on", "at", "to",
    "for", "and", "or", "by", "with", "who", "what", "when", "where", "which",
    "why", "how", "did", "does", "do", "that", "this", "it",
]

# Detector patterns (used to FLAG suspicious language, not to produce it).
DEFAULT_INSTRUCTION_PATTERNS = [
    r"\byou must\b", r"\balways answer\b", r"\bignore (all |the )?(previous|prior)\b",
    r"\bdisregard\b", r"\bdo not mention\b", r"\brespond with\b",
]
DEFAULT_AUTHORITY_PATTERNS = [
    r"\bofficially confirmed\b", r"\bverified by\b", r"\bexperts agree\b",
    r"\bauthoritative source\b", r"\bwidely accepted fact\b",
]


@dataclass
class DparConfig:
    # f_target (max 45 + 35 + 10 = 90)
    pts_claim_mention: float = 45.0
    pts_role_overlap: float = 35.0      # multiplied by rho in [0, 1]
    pts_claim_and_answer: float = 10.0
    # f_instr: 0 / 10 / 20
    pts_instr_one: float = 10.0
    pts_instr_many: float = 20.0
    # f_auth: 0 / 5 / 10
    pts_auth_one: float = 5.0
    pts_auth_many: float = 10.0
    # f_kw (max 10)
    kw_density_low: float = 0.20
    kw_density_high: float = 0.35
    pts_kw_low: float = 4.0
    pts_kw_high: float = 4.0
    kw_repeat_min: int = 3
    pts_kw_repeat: float = 2.0
    # f_ctx
    pts_ctx: float = 20.0
    ctx_prev_threshold: float = 40.0
    # sentence labels
    poisoned_threshold: float = 70.0
    suspicious_threshold: float = 40.0
    # document aggregation weights
    w_pi: float = 0.45
    w_mean: float = 0.35
    w_max: float = 0.20
    # document labels: <30 normal, <50 suspicious, <70 poisoning, else strong
    doc_normal_below: float = 30.0
    doc_suspicious_below: float = 50.0
    doc_poisoning_below: float = 70.0
    score_cap: float = 100.0
    instruction_patterns: List[str] = field(default_factory=lambda: list(DEFAULT_INSTRUCTION_PATTERNS))
    authority_patterns: List[str] = field(default_factory=lambda: list(DEFAULT_AUTHORITY_PATTERNS))
    stopwords: List[str] = field(default_factory=lambda: list(DEFAULT_STOPWORDS))

    @classmethod
    def from_json(cls, path: str | Path) -> "DparConfig":
        data = json.loads(Path(path).read_text(encoding="utf-8"))
        return cls(**data)

    def to_json(self, path: str | Path) -> None:
        Path(path).write_text(json.dumps(asdict(self), indent=2), encoding="utf-8")


@dataclass
class SentenceScore:
    text: str
    f_target: float
    f_instr: float
    f_auth: float
    f_kw: float
    f_ctx: float
    score: float
    label: str
    has_target_claim: bool


@dataclass
class DocumentScore:
    delta: float
    pi_p: float
    mean_p: float
    max_p: float
    n_sentences: int
    label: str
    sentences: List[SentenceScore]

    def to_dict(self) -> Dict:
        return asdict(self)


_SENT_SPLIT = re.compile(r"(?<=[.!?])\s+")
_TOKEN = re.compile(r"\w+")


def split_sentences(text: str) -> List[str]:
    return [s.strip() for s in _SENT_SPLIT.split(text.strip()) if s.strip()]


def tokenize(text: str) -> List[str]:
    return _TOKEN.findall(text.lower())


def query_terms(query: str, cfg: DparConfig) -> set:
    stop = set(cfg.stopwords)
    return {t for t in tokenize(query) if t not in stop}


def _count_matches(sentence: str, patterns: List[str]) -> int:
    return sum(1 for p in patterns if re.search(p, sentence, flags=re.IGNORECASE))


def f_target(sentence: str, q_terms: set, target_claim: str, correct_answer: str,
             cfg: DparConfig) -> float:
    s_low = sentence.lower()
    has_t = bool(target_claim) and target_claim.lower() in s_low
    has_a = bool(correct_answer) and correct_answer.lower() in s_low
    pts = 0.0
    if has_t:
        pts += cfg.pts_claim_mention
    if q_terms:
        rho = len(q_terms & set(tokenize(sentence))) / len(q_terms)
        pts += cfg.pts_role_overlap * rho
    if has_t and has_a:
        pts += cfg.pts_claim_and_answer
    return pts


def f_instr(sentence: str, cfg: DparConfig) -> float:
    n = _count_matches(sentence, cfg.instruction_patterns)
    return 0.0 if n == 0 else (cfg.pts_instr_one if n == 1 else cfg.pts_instr_many)


def f_auth(sentence: str, cfg: DparConfig) -> float:
    n = _count_matches(sentence, cfg.authority_patterns)
    return 0.0 if n == 0 else (cfg.pts_auth_one if n == 1 else cfg.pts_auth_many)


def f_kw(sentence: str, q_terms: set, cfg: DparConfig) -> float:
    tokens = tokenize(sentence)
    if not tokens or not q_terms:
        return 0.0
    hits = [t for t in tokens if t in q_terms]
    density = len(hits) / len(tokens)
    pts = 0.0
    if density > cfg.kw_density_low:
        pts += cfg.pts_kw_low
    if density > cfg.kw_density_high:
        pts += cfg.pts_kw_high
    # Interpretation: a single role term repeated >= kw_repeat_min times.
    if any(hits.count(t) >= cfg.kw_repeat_min for t in set(hits)):
        pts += cfg.pts_kw_repeat
    return pts


def sentence_label(score: float, has_target_claim: bool, cfg: DparConfig) -> str:
    if score >= cfg.poisoned_threshold:
        return "poisoned"
    if score >= cfg.suspicious_threshold:
        return "suspicious"
    return "normal"


def document_label(delta: float, cfg: DparConfig) -> str:
    if delta < cfg.doc_normal_below:
        return "normal"
    if delta < cfg.doc_suspicious_below:
        return "suspicious"
    if delta < cfg.doc_poisoning_below:
        return "poisoning"
    return "strong_poisoning"


def score_document(text: str, query: str, target_claim: str, correct_answer: str,
                   cfg: Optional[DparConfig] = None) -> DocumentScore:
    cfg = cfg or DparConfig()
    sentences = split_sentences(text)
    if not sentences:
        return DocumentScore(0.0, 0.0, 0.0, 0.0, 0, "normal", [])

    q_terms = query_terms(query, cfg)
    scored: List[SentenceScore] = []
    prev_score, prev_has_claim = 0.0, False

    for i, s in enumerate(sentences):
        ft = f_target(s, q_terms, target_claim, correct_answer, cfg)
        fi = f_instr(s, cfg)
        fa = f_auth(s, cfg)
        fk = f_kw(s, q_terms, cfg)
        fc = cfg.pts_ctx if (i > 0 and (prev_score >= cfg.ctx_prev_threshold or prev_has_claim)) else 0.0
        total = min(ft + fi + fa + fk + fc, cfg.score_cap)
        has_claim = bool(target_claim) and target_claim.lower() in s.lower()
        scored.append(SentenceScore(s, ft, fi, fa, fk, fc, total,
                                    sentence_label(total, has_claim, cfg), has_claim))
        prev_score, prev_has_claim = total, has_claim

    n = len(scored)
    scores = [x.score for x in scored]
    pi_p = sum(1 for x in scores if x >= cfg.poisoned_threshold) / n
    mean_p = sum(scores) / n
    max_p = max(scores)
    delta = cfg.w_pi * (pi_p * 100.0) + cfg.w_mean * mean_p + cfg.w_max * max_p
    return DocumentScore(delta, pi_p, mean_p, max_p, n, document_label(delta, cfg), scored)
