import {
  ArrowRight,
  CheckCircle,
  CircleNotch,
  Flask,
  Lightning,
  Play,
  ShieldChevron,
  Warning,
  XCircle,
} from "@phosphor-icons/react";
import { motion } from "motion/react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { HBarGroup, HitMatrix, PerplexityHist } from "../components/charts";
import { Badge, CountUp, Metric } from "../components/ui";
import {
  api,
  type Doc,
  type GenResult,
  type Meta,
  type QueryResponse,
  type QuestionRow,
  type ResultRow,
  type Summary,
} from "../lib/api";
import { cx, num, truncate } from "../lib/format";

type View = "corpus" | "custom";

export default function Lab() {
  const [meta, setMeta] = useState<Meta | null>(null);
  const [questions, setQuestions] = useState<QuestionRow[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [rows, setRows] = useState<ResultRow[]>([]);
  const [offline, setOffline] = useState(false);

  const [view, setView] = useState<View>("corpus");
  const [qid, setQid] = useState<string>("");
  const [custom, setCustom] = useState("");
  const [nPoison, setNPoison] = useState(5);

  const [running, setRunning] = useState(false);
  const [evalling, setEvaling] = useState(false);
  const [result, setResult] = useState<QueryResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadReport = useCallback(async (s?: Summary) => {
    const sum = s ?? (await api.summary());
    setSummary(sum);
    const latest = sum.runs[sum.runs.length - 1];
    if (latest) setRows((await api.results(latest.run_tag)).rows);
  }, []);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [m, qs, s] = await Promise.all([api.meta(), api.questions(), api.summary()]);
        if (!alive) return;
        setMeta(m);
        setQuestions(qs);
        setSummary(s);
        if (qs.length) setQid(qs[0].qid);
        const latest = s.runs[s.runs.length - 1];
        if (latest) setRows((await api.results(latest.run_tag)).rows);
      } catch {
        if (alive) setOffline(true);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const selected = useMemo(() => questions.find((q) => q.qid === qid) ?? null, [questions, qid]);
  const question = view === "custom" ? custom : selected?.question ?? "";

  const run = async () => {
    if (!question.trim() || running) return;
    setRunning(true);
    setError(null);
    setResult(null);
    try {
      const r = await api.query({
        question: question.trim(),
        qid: view === "corpus" ? qid : null,
        n_poison: nPoison,
      });
      setResult(r);
    } catch (e) {
      setError(e instanceof Error ? e.message : "run failed");
    } finally {
      setRunning(false);
    }
  };

  const runEval = async () => {
    if (evalling) return;
    setEvaling(true);
    setError(null);
    try {
      const s = await api.runEval({ questions: meta?.num_questions ?? 50, n_poison: nPoison });
      await loadReport(s);
    } catch (e) {
      setError(e instanceof Error ? e.message : "evaluation failed");
    } finally {
      setEvaling(false);
    }
  };

  const hitRows = useMemo(
    () =>
      rows.map((r) => ({
        qid: r.qid,
        target: r.target,
        undef: !!r.undefended?.target_hit,
        def: !!r.defended?.target_hit,
      })),
    [rows],
  );

  const undef = summary?.modes.find((m) => m.mode === "undefended") ?? null;
  const def = summary?.modes.find((m) => m.mode === "perplexity_filter") ?? null;

  return (
    <div className="mx-auto max-w-[1400px] px-5 py-12 md:px-8 md:py-16">
      {/* header */}
      <div className="flex flex-col gap-6 border-b border-line pb-8 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="eyebrow">The Lab</div>
          <h1 className="mt-3 font-display text-4xl leading-none tracking-tight md:text-5xl">
            Replay the attack, question by question.
          </h1>
          <p className="mt-4 max-w-[58ch] text-sm leading-relaxed text-mut">
            Choose a corpus question or type your own, dial how many poisoned passages to inject,
            then run both pipelines and read the retrieved evidence side by side.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge tone={offline ? "attack" : "safe"}>
            <span className={cx("h-1.5 w-1.5 rounded-full", offline ? "bg-attack" : "bg-safe anim-pulse")} />
            {offline ? "api offline" : "api online"}
          </Badge>
          <Badge tone={meta?.has_api_key ? "acc" : "attack"}>
            {meta?.has_api_key ? "groq key set" : "no groq key"}
          </Badge>
          <Badge>{meta?.llm_model ?? "gpt-oss-120b"}</Badge>
        </div>
      </div>

      <div className="mt-10 grid gap-10 lg:grid-cols-[360px_1fr]">
        {/* -------------------- controls -------------------- */}
        <div className="lg:sticky lg:top-24 lg:self-start">
          <div className="panel p-6">
            <div className="flex items-center gap-2">
              <Flask size={18} weight="duotone" className="text-acc-text" />
              <span className="text-sm font-medium">Query</span>
            </div>

            {/* segmented control */}
            <div className="mt-5 grid grid-cols-2 gap-1 rounded-full border border-line p-1">
              {(["corpus", "custom"] as View[]).map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setView(v)}
                  className={cx(
                    "rounded-full py-2 text-xs font-medium capitalize transition-colors",
                    view === v ? "bg-acc text-acc-ink" : "text-mut hover:text-fg",
                  )}
                >
                  {v === "corpus" ? "From corpus" : "Custom"}
                </button>
              ))}
            </div>

            {view === "corpus" ? (
              <div className="mt-4">
                <label className="mono text-[0.66rem] uppercase tracking-[0.16em] text-faint">
                  question
                </label>
                <div className="mt-2 max-h-64 space-y-1 overflow-y-auto rounded-md border border-line bg-panel-2 p-1.5">
                  {questions.length === 0 && (
                    <div className="p-3 text-xs text-faint">loading questions…</div>
                  )}
                  {questions.map((q) => (
                    <button
                      key={q.qid}
                      type="button"
                      onClick={() => setQid(q.qid)}
                      className={cx(
                        "w-full rounded-md px-3 py-2 text-left text-xs transition-colors",
                        qid === q.qid ? "bg-acc-soft text-fg" : "text-mut hover:bg-panel-3 hover:text-fg",
                      )}
                    >
                      <span className="mono text-[0.6rem] text-faint">{q.qid}</span>
                      <span className="ml-2">{truncate(q.question, 70)}</span>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="mt-4">
                <label className="mono text-[0.66rem] uppercase tracking-[0.16em] text-faint">
                  custom question
                </label>
                <textarea
                  value={custom}
                  onChange={(e) => setCustom(e.target.value)}
                  rows={3}
                  placeholder="Ask anything — poison is only injected for corpus questions."
                  className="mt-2 w-full resize-none rounded-md border border-line bg-panel-2 px-3 py-2.5 text-sm text-fg placeholder:text-faint focus:border-acc/50 focus:outline-none"
                />
              </div>
            )}

            {/* poison slider */}
            <div className="mt-6">
              <div className="flex items-baseline justify-between">
                <label className="mono text-[0.66rem] uppercase tracking-[0.16em] text-faint">
                  poisoned docs injected
                </label>
                <span className="mono text-sm text-attack">{nPoison}</span>
              </div>
              <input
                type="range"
                min={0}
                max={meta?.poison_per_question ?? 5}
                value={nPoison}
                onChange={(e) => setNPoison(Number(e.target.value))}
                className="mt-3 w-full accent-[var(--accent)]"
                aria-label="number of poisoned documents"
              />
              <div className="mono mt-1 flex justify-between text-[0.6rem] text-faint">
                <span>clean</span>
                <span>max {meta?.poison_per_question ?? 5}</span>
              </div>
            </div>

            <button
              type="button"
              onClick={run}
              disabled={running || !question.trim()}
              className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full bg-acc px-5 py-3 text-sm font-medium text-acc-ink transition-all hover:brightness-105 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-45"
            >
              {running ? (
                <CircleNotch size={16} weight="bold" className="animate-spin" />
              ) : (
                <Play size={15} weight="fill" />
              )}
              {running ? "Running both pipelines…" : "Run query"}
            </button>

            <div className="mt-3 text-center text-[0.68rem] leading-relaxed text-faint">
              {meta?.has_api_key
                ? "Calls Groq + local models. Typically 10–30s."
                : "Set GROQ_API_KEY in .env to enable live runs."}
            </div>
          </div>

          {/* eval card */}
          <div className="panel mt-5 p-6">
            <div className="flex items-center gap-2">
              <Lightning size={18} weight="duotone" className="text-acc-text" />
              <span className="text-sm font-medium">Full evaluation</span>
            </div>
            <p className="mt-2 text-xs leading-relaxed text-mut">
              Re-run the {meta?.num_questions ?? 50}-question sweep and refresh the report below.
              Slow — every question hits the API twice.
            </p>
            <button
              type="button"
              onClick={runEval}
              disabled={evalling || !meta?.has_api_key}
              className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-full border border-line px-5 py-2.5 text-xs font-medium text-fg transition-colors hover:border-line2 hover:bg-panel-2 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-45"
            >
              {evalling ? <CircleNotch size={14} weight="bold" className="animate-spin" /> : <ArrowRight size={14} weight="bold" />}
              {evalling ? "Evaluating…" : `Run eval · ${meta?.num_questions ?? 50} questions`}
            </button>
          </div>
        </div>

        {/* -------------------- results -------------------- */}
        <div className="min-w-0 space-y-10">
          {error && (
            <div className="flex items-start gap-3 rounded-md border border-attack/40 bg-attack-soft p-4 text-sm text-attack">
              <Warning size={18} weight="duotone" className="mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {!result && !running && <EmptyState />}

          {running && <RunSkeleton />}

          {result && !running && <RunResult result={result} threshold={result.threshold} />}

          {/* report */}
          <section className="border-t border-line pt-10">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <h2 className="font-display text-2xl tracking-tight">Report</h2>
                <p className="mt-1 text-xs text-mut">
                  {summary?.has_data
                    ? `Latest run · ${rows.length} questions logged`
                    : "No evaluation logged yet — run one above."}
                </p>
              </div>
              {summary?.runs.length ? (
                <Badge>{summary.runs[summary.runs.length - 1].run_tag}</Badge>
              ) : null}
            </div>

            {undef && def && (
              <div className="mt-8 grid gap-5 lg:grid-cols-3">
                <div className="panel p-6 lg:col-span-2">
                  <HBarGroup
                    groups={[
                      {
                        label: "Attack success rate",
                        bars: [
                          { label: "undefended", value: undef.asr, tone: "attack" },
                          { label: "ppl filter", value: def.asr, tone: "safe" },
                        ],
                      },
                      {
                        label: "Gold-answer match",
                        bars: [
                          { label: "undefended", value: undef.gold, tone: "attack" },
                          { label: "ppl filter", value: def.gold, tone: "safe" },
                        ],
                      },
                    ]}
                  />
                </div>
                <div className="panel grid grid-cols-2 gap-6 p-6 lg:grid-cols-1">
                  <Metric label="asr · undefended" value={<CountUp to={undef.asr * 100} suffix="%" decimals={0} />} tone="attack" sub={`n = ${undef.n}`} />
                  <Metric label="asr · filtered" value={<CountUp to={def.asr * 100} suffix="%" decimals={0} />} tone="safe" sub={`n = ${def.n}`} />
                </div>
              </div>
            )}

            {hitRows.length > 0 && (
              <div className="panel mt-5 p-6">
                <h3 className="text-sm font-medium">Per-question outcome</h3>
                <div className="mt-5">
                  <HitMatrix rows={hitRows} filter="all" />
                </div>
              </div>
            )}

            {rows.length > 0 && <ResultTable rows={rows} />}
          </section>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */

function EmptyState() {
  return (
    <div className="panel grid place-items-center px-6 py-20 text-center">
      <div className="max-w-sm">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-full border border-line bg-panel-2">
          <Flask size={24} weight="duotone" className="text-acc-text" />
        </div>
        <h3 className="mt-6 font-display text-xl tracking-tight">Nothing run yet</h3>
        <p className="mt-3 text-sm leading-relaxed text-mut">
          Pick a question and hit run. You'll get the undefended answer and the
          perplexity-filtered answer next to each other, with the retrieved evidence that
          produced each.
        </p>
      </div>
    </div>
  );
}

function RunSkeleton() {
  return (
    <div className="grid gap-5 md:grid-cols-2">
      {[0, 1].map((i) => (
        <div key={i} className="panel p-6">
          <div className="shimmer h-5 w-28 rounded-full" />
          <div className="mt-6 space-y-3">
            <div className="shimmer h-4 w-full rounded" />
            <div className="shimmer h-4 w-5/6 rounded" />
            <div className="shimmer h-4 w-2/3 rounded" />
          </div>
          <div className="mt-8 space-y-2">
            {[0, 1, 2, 3].map((j) => (
              <div key={j} className="shimmer h-10 w-full rounded-md" />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function RunResult({ result, threshold }: { result: QueryResponse; threshold: number }) {
  const docs = useMemo(() => {
    const g = result.defended;
    return [...g.kept, ...g.dropped].map((d) => ({
      doc_id: d.doc_id,
      perplexity: d.perplexity,
      poisoned: d.poisoned,
    }));
  }, [result]);

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="panel p-6"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="mono text-[0.66rem] uppercase tracking-[0.18em] text-faint">
            {result.qid ?? "custom query"}
          </span>
          <div className="flex flex-wrap items-center gap-3 text-[0.7rem] text-faint">
            <span className="mono">threshold {num(threshold, 1)}</span>
            <span className="mono">{(result.latency_ms / 1000).toFixed(1)}s</span>
          </div>
        </div>
        <p className="mt-3 text-lg leading-snug text-fg">{result.question}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          {result.target && (
            <Badge tone="attack">
              <Warning size={12} weight="bold" /> target: {result.target}
            </Badge>
          )}
          {result.gold && <Badge tone="safe">gold: {truncate(result.gold, 40)}</Badge>}
          {!result.target && <Badge>no injected poison</Badge>}
        </div>
      </motion.div>

      <div className="grid gap-5 md:grid-cols-2">
        <AnswerColumn
          title="Undefended"
          tone="attack"
          gen={result.undefended}
          threshold={threshold}
        />
        <AnswerColumn
          title="Perplexity filter"
          tone="safe"
          gen={result.defended}
          threshold={threshold}
        />
      </div>

      <div className="panel p-6">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium">Perplexity of retrieved passages</h3>
          <span className="mono text-[0.66rem] text-faint">
            {docs.filter((d) => d.poisoned).length} poison · {docs.filter((d) => !d.poisoned).length} clean
          </span>
        </div>
        <div className="mt-5">
          <PerplexityHist docs={docs} threshold={threshold} />
        </div>
      </div>
    </div>
  );
}

function AnswerColumn({
  title,
  tone,
  gen,
  threshold,
}: {
  title: string;
  tone: "attack" | "safe";
  gen: GenResult;
  threshold: number;
}) {
  const toneText = tone === "attack" ? "text-attack" : "text-safe";
  return (
    <div className="panel flex flex-col p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {tone === "attack" ? (
            <Warning size={16} weight="duotone" className={toneText} />
          ) : (
            <ShieldChevron size={16} weight="duotone" className={toneText} />
          )}
          <span className="text-sm font-medium">{title}</span>
        </div>
        {gen.target_hit ? (
          <Badge tone="attack">
            <XCircle size={12} weight="bold" /> attack hit
          </Badge>
        ) : (
          <Badge tone="safe">
            <CheckCircle size={12} weight="bold" /> resisted
          </Badge>
        )}
      </div>

      <p className="mt-5 text-[0.95rem] leading-relaxed text-fg">{gen.answer || "—"}</p>

      <div className="mono mt-5 flex flex-wrap gap-x-4 gap-y-1 border-t border-line pt-4 text-[0.66rem] uppercase tracking-[0.14em] text-faint">
        <span>{gen.n_retrieved} retrieved</span>
        {tone === "safe" && (
          <>
            <span className="text-safe">{gen.n_kept} kept</span>
            <span className="text-attack">{gen.n_dropped} dropped</span>
          </>
        )}
      </div>

      <div className="mt-4 space-y-2">
        {gen.kept.map((d) => (
          <DocRow key={`k-${d.doc_id}`} doc={d} threshold={threshold} state="kept" />
        ))}
        {gen.dropped.map((d) => (
          <DocRow key={`d-${d.doc_id}`} doc={d} threshold={threshold} state="dropped" />
        ))}
      </div>
    </div>
  );
}

function DocRow({
  doc,
  threshold,
  state,
}: {
  doc: Doc;
  threshold: number;
  state: "kept" | "dropped";
}) {
  const ppl = doc.perplexity ?? 0;
  const ratio = threshold > 0 ? Math.min(1, ppl / (threshold * 1.4)) : 0;
  return (
    <div className="rounded-md border border-line bg-panel-2 p-3">
      <div className="flex items-center gap-2">
        <span
          className={cx(
            "mono text-[0.68rem]",
            doc.poisoned ? "text-attack" : "text-mut",
          )}
        >
          {doc.doc_id}
        </span>
        {doc.poisoned && <Badge tone="attack" className="scale-90">poison</Badge>}
        <span
          className={cx(
            "mono ml-auto text-[0.66rem]",
            state === "dropped" ? "text-attack" : "text-safe",
          )}
        >
          {state} · ppl {num(ppl, 1)}
        </span>
      </div>
      <div className="mt-2 h-1 overflow-hidden rounded-full bg-panel-3">
        <div
          className={cx("h-full rounded-full", doc.poisoned ? "bg-attack" : "bg-safe")}
          style={{ width: `${Math.max(3, ratio * 100)}%` }}
        />
      </div>
      <p className="mt-2 text-[0.76rem] leading-relaxed text-mut">{truncate(doc.snippet, 150)}</p>
    </div>
  );
}

function ResultTable({ rows }: { rows: ResultRow[] }) {
  const [filter, setFilter] = useState<"all" | "attack" | "residual" | "defended">("all");
  const visible = rows.filter((r) => {
    const u = !!r.undefended?.target_hit;
    const d = !!r.defended?.target_hit;
    if (filter === "all") return true;
    if (filter === "attack") return u;
    if (filter === "residual") return u && d;
    return !u && !d;
  });

  return (
    <div className="panel mt-5 overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line p-6">
        <h3 className="text-sm font-medium">Question log</h3>
        <div className="flex gap-1 rounded-full border border-line p-1">
          {(["all", "attack", "residual", "defended"] as const).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={cx(
                "rounded-full px-3 py-1.5 text-[0.68rem] font-medium capitalize transition-colors",
                filter === f ? "bg-acc text-acc-ink" : "text-mut hover:text-fg",
              )}
            >
              {f}
            </button>
          ))}
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-left text-xs">
          <thead>
            <tr className="mono border-b border-line text-[0.62rem] uppercase tracking-[0.14em] text-faint">
              <th className="px-6 py-3 font-normal">qid</th>
              <th className="px-4 py-3 font-normal">question</th>
              <th className="px-4 py-3 font-normal">target</th>
              <th className="px-4 py-3 font-normal">undef</th>
              <th className="px-4 py-3 font-normal">filter</th>
            </tr>
          </thead>
          <tbody>
            {visible.slice(0, 60).map((r) => (
              <tr key={r.qid} className="border-b border-line/60 last:border-0 hover:bg-panel-2">
                <td className="mono px-6 py-3 text-faint">{r.qid}</td>
                <td className="max-w-[280px] px-4 py-3 text-fg">{truncate(r.question, 64)}</td>
                <td className="mono px-4 py-3 text-attack">{truncate(r.target || "—", 24)}</td>
                <td className="px-4 py-3">
                  <HitDot hit={!!r.undefended?.target_hit} />
                </td>
                <td className="px-4 py-3">
                  <HitDot hit={!!r.defended?.target_hit} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {visible.length === 0 && (
        <div className="py-10 text-center text-xs text-faint">no rows in this slice</div>
      )}
    </div>
  );
}

function HitDot({ hit }: { hit: boolean }) {
  return hit ? (
    <span className="inline-flex items-center gap-1.5 text-attack">
      <XCircle size={13} weight="fill" /> <span className="mono text-[0.66rem]">hit</span>
    </span>
  ) : (
    <span className="inline-flex items-center gap-1.5 text-safe">
      <CheckCircle size={13} weight="fill" /> <span className="mono text-[0.66rem]">miss</span>
    </span>
  );
}
