// Typed client for the collab-rag-defense FastAPI backend (server/main.py).

// Backend origin. Empty => same-origin (FastAPI serving the built SPA, or the
// Vite dev proxy). Set VITE_API_BASE at build time to point Cloudflare Pages at
// a separately hosted API, e.g. VITE_API_BASE=https://crd-api.fly.dev
const API_BASE = ((import.meta.env.VITE_API_BASE as string | undefined) ?? "").replace(/\/+$/, "");

export type Doc = {
  doc_id: string;
  snippet: string;
  perplexity: number | null;
  poisoned: boolean;
};

export type GenResult = {
  answer: string;
  retrieved: Doc[];
  kept: Doc[];
  dropped: Doc[];
  target_hit: boolean;
  gold_hit: boolean;
  n_retrieved: number;
  n_kept: number;
  n_dropped: number;
};

export type QueryResponse = {
  question: string;
  qid: string | null;
  target: string;
  gold: string;
  threshold: number;
  mode_label: string;
  undefended: GenResult;
  defended: GenResult;
  latency_ms: number;
};

export type ModeSummary = {
  mode: string;
  label: string;
  n: number;
  asr: number;
  gold: number;
};

export type RunSummary = {
  run_tag: string;
  ts: number;
  modes: ModeSummary[];
};

export type Summary = {
  has_data: boolean;
  total: number;
  threshold: number | null;
  modes: ModeSummary[];
  runs: RunSummary[];
  corpus_size: number;
  num_questions: number;
  poison_per_question: number;
};

export type Meta = {
  embed_model: string;
  llm_model: string;
  perplexity_model: string;
  top_k: number;
  corpus_size: number;
  num_questions: number;
  poison_per_question: number;
  perplexity_percentile: number;
  has_api_key: boolean;
  dataset: string;
};

export type QuestionRow = {
  qid: string;
  question: string;
  gold: string;
  target: string;
  poison_count: number;
};

export type ResultRow = {
  qid: string;
  question: string;
  target: string;
  gold: string;
  undefended: GenResult | null;
  defended: GenResult | null;
};

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  if (!res.ok) {
    let detail = res.statusText;
    try {
      const j = await res.json();
      detail = j.detail ?? detail;
    } catch {
      /* ignore */
    }
    throw new Error(typeof detail === "string" ? detail : `HTTP ${res.status}`);
  }
  return (await res.json()) as T;
}

export const api = {
  health: () => req<{ ok: boolean; models_loaded: boolean; has_data: boolean }>("/api/health"),
  meta: () => req<Meta>("/api/meta"),
  summary: () => req<Summary>("/api/summary"),
  questions: () => req<{ questions: QuestionRow[] }>("/api/questions").then((r) => r.questions),
  results: (runTag: string) =>
    req<{ run_tag: string; rows: ResultRow[] }>(
      `/api/results?run_tag=${encodeURIComponent(runTag)}`,
    ),
  query: (body: {
    question: string;
    qid?: string | null;
    n_poison: number;
  }) =>
    req<QueryResponse>("/api/query", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  runEval: (body: { questions: number; n_poison: number }) =>
    req<Summary>("/api/eval", { method: "POST", body: JSON.stringify(body) }),
};
