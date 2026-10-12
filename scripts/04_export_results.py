"""Export ASR summary from logs/runs.sqlite -> results/results.md."""
import sys
import sqlite3
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from src import config


def main() -> None:
    conn = sqlite3.connect(config.SQLITE_PATH)
    cur = conn.cursor()
    cur.execute(
        "SELECT run_tag, mode, "
        "COUNT(*), SUM(target_hit)*1.0/COUNT(*), SUM(gold_hit)*1.0/COUNT(*) "
        "FROM runs GROUP BY run_tag, mode ORDER BY run_tag, mode"
    )
    rows = cur.fetchall()
    conn.close()

    out = ["# Results\n", "| run_tag | mode | n | ASR (target_hit) | Gold match |", "|---|---|---|---|---|"]
    for tag, mode, n, asr, gold in rows:
        out.append(f"| {tag} | {mode} | {n} | {asr:.2%} | {gold:.2%} |")
    body = "\n".join(out) + "\n"

    (config.RESULTS_DIR / "results.md").write_text(body)
    print(body)


if __name__ == "__main__":
    main()
