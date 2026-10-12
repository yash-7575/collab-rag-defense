import os
from pathlib import Path
from dotenv import load_dotenv

ROOT = Path(__file__).resolve().parent.parent
load_dotenv(ROOT / ".env")

DATA_DIR = ROOT / "data"
CORPUS_DIR = DATA_DIR / "corpus"
POISON_DIR = DATA_DIR / "poisoned"
INDEX_DIR = DATA_DIR / "faiss_index"
BEIR_DIR = DATA_DIR / "beir_raw"
QUESTIONS_PATH = DATA_DIR / "questions.jsonl"
CORPUS_PATH = CORPUS_DIR / "passages.jsonl"

LOGS_DIR = ROOT / "logs"
RESULTS_DIR = ROOT / "results"
EXTERNAL_DIR = ROOT / "external"
POISONEDRAG_DIR = EXTERNAL_DIR / "PoisonedRAG"
SQLITE_PATH = LOGS_DIR / "runs.sqlite"

for d in (CORPUS_DIR, POISON_DIR, INDEX_DIR, BEIR_DIR, LOGS_DIR, RESULTS_DIR, EXTERNAL_DIR):
    d.mkdir(parents=True, exist_ok=True)

GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
GROQ_MODEL = os.getenv("GROQ_MODEL", "openai/gpt-oss-120b")
GROQ_BASE_URL = "https://api.groq.com/openai/v1"

EMBED_MODEL = "sentence-transformers/all-MiniLM-L6-v2"
PERPLEXITY_MODEL = "gpt2"

TOP_K = 5
CORPUS_SIZE = 200
NUM_QUESTIONS = 50
POISON_PER_QUESTION = 5
PERPLEXITY_PERCENTILE = 95
MAX_TOKENS = 512
