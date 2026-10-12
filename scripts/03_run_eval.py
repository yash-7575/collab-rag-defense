"""Run the full ASR evaluation and print a summary."""
import argparse
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from src import config
from src.evaluate import run_eval


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--questions", type=int, default=config.NUM_QUESTIONS)
    ap.add_argument("--n-poison", type=int, default=config.POISON_PER_QUESTION)
    ap.add_argument("--tag", type=str, default=None)
    args = ap.parse_args()

    s = run_eval(num_questions=args.questions, n_poison=args.n_poison, run_tag=args.tag)
    print()
    print(f"N questions evaluated:  {s.n}")
    print(f"Perplexity threshold:   {s.threshold:.2f}")
    print(f"ASR undefended:         {s.asr_undefended:.2%}")
    print(f"ASR perplexity-filter:  {s.asr_defended:.2%}")
    print(f"Gold-match undefended:  {s.gold_undefended:.2%}")
    print(f"Gold-match defended:    {s.gold_defended:.2%}")


if __name__ == "__main__":
    main()
