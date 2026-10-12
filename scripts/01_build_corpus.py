"""Build the NQ subset and persist to data/."""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from src.corpus import build_subset
from src import config


def main() -> None:
    n_p, n_q = build_subset(
        num_questions=config.NUM_QUESTIONS,
        corpus_size=config.CORPUS_SIZE,
    )
    print(f"Wrote {n_p} passages -> {config.CORPUS_PATH}")
    print(f"Wrote {n_q} questions -> {config.QUESTIONS_PATH}")


if __name__ == "__main__":
    main()
