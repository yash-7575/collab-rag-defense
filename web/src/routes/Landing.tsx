import {
  ArrowRight,
  ArrowUpRight,
  Biohazard,
  Database,
  Flask,
  MagnifyingGlass,
  ShieldChevron,
  Sparkle,
  Terminal,
  Warning,
} from "@phosphor-icons/react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { RagFlow } from "../components/RagFlow";
import { Gauge, HBarGroup, HitMatrix, PerplexityHist } from "../components/charts";
import { Badge, CountUp, Metric, Reveal, SectionHead } from "../components/ui";
import { api, type Meta, type ResultRow, type Summary } from "../lib/api";
import { cx, truncate } from "../lib/format";
import { ATTACK_PAPERS, DEFENSE_PAPERS, type Paper } from "../lib/papers";

/* ------------------------------------------------------------------ */

function useLandingData() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [meta, setMeta] = useState<Meta | null>(null);
  const [rows, setRows] = useState<ResultRow[]>([]);
  const [err, setErr] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [s, m] = await Promise.all([api.summary(), api.meta()]);
        if (!alive) return;
        setSummary(s);
        setMeta(m);
        const latest = s.runs[s.runs.length - 1];
        if (latest) {
          const r = await api.results(latest.run_tag);
          if (alive) setRows(r.rows);
        }
      } catch {
        if (alive) setErr(true);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  return { summary, meta, rows, err };
}

function modeOf(s: Summary | null, mode: string) {
  return s?.modes.find((m) => m.mode === mode) ?? null;
}

/* ------------------------------------------------------------------ */

const PIPELINE = [
  {
    n: "01",
    icon: Warning,
    title: "Choose a wrong answer",
    body: "For each question the attacker fixes an incorrect target answer t — the lie the model should learn to repeat.",
  },
  {
    n: "02",
    icon: Terminal,
    title: "Craft the poison",
    body: "An LLM writes a short passage that opens with the question (so it retrieves) and asserts t as fact.",
  },
  {
    n: "03",
    icon: Database,
    title: "Inject into the corpus",
    body: "Five poisoned passages per question are merged with the 200 clean passages and re-indexed.",
  },
  {
    n: "04",
    icon: MagnifyingGlass,
    title: "Retrieve",
    body: "MiniLM embeds the query; FAISS returns the top-k passages — poison and clean side by side.",
  },
  {
    n: "05",
    icon: ShieldChevron,
    title: "Filter & answer",
    body: "GPT-2 perplexity drops suspicious passages, then the LLM answers from what survives.",
  },
];

/* ------------------------------------------------------------------ */

export default function Landing() {
  const { summary, meta, rows, err } = useLandingData();

  const undef = modeOf(summary, "undefended");
  const def = modeOf(summary, "perplexity_filter");

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

  const pplDocs = useMemo(() => {
    const out: { doc_id: string; perplexity: number | null; poisoned: boolean }[] = [];
    for (const r of rows) {
      const g = r.defended;
      if (!g) continue;
      for (const d of [...g.kept, ...g.dropped]) {
        out.push({
          doc_id: d.doc_id,
          perplexity: d.perplexity,
          poisoned: d.doc_id?.startsWith("POISON-") ?? false,
        });
      }
    }
    return out.slice(0, 220);
  }, [rows]);

  const threshold = summary?.threshold ?? 0;
  const residual = def?.asr ?? 0;

  return (
    <>
      {/* ============================ HERO ============================ */}
      <section className="relative overflow-hidden">
        <div
          aria-hidden
          className="grid-bed pointer-events-none absolute inset-0 opacity-60"
          style={{ maskImage: "radial-gradient(80% 60% at 50% 0%, #000 20%, transparent 75%)" }}
        />
        <div className="relative mx-auto grid max-w-[1400px] gap-12 px-5 pb-16 pt-16 md:grid-cols-[1.05fr_0.95fr] md:items-center md:gap-10 md:px-8 md:pb-24 md:pt-20">
          <div>
            <div className="eyebrow">EDI research · Sem-5 · Mid-sem PoC</div>
            <h1 className="mt-5 font-display text-[2.6rem] leading-[1.02] tracking-tight text-balance sm:text-6xl lg:text-[4.2rem]">
              Poison the corpus.
              <br />
              Watch the model{" "}
              <span className="italic text-acc-text">repeat the lie.</span>
            </h1>
            <p className="mt-6 max-w-[54ch] text-[1.02rem] leading-relaxed text-mut text-pretty">
              A reproducible study of knowledge-corruption attacks on retrieval-augmented
              generation, and the defenses built to catch them.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link
                to="/lab"
                className="group inline-flex items-center gap-2 rounded-full bg-acc px-5 py-3 text-sm font-medium text-acc-ink transition-all hover:brightness-105 active:scale-[0.98]"
              >
                Open the Lab
                <ArrowRight size={15} weight="bold" className="transition-transform group-hover:translate-x-0.5" />
              </Link>
              <a
                href="#findings"
                className="inline-flex items-center gap-2 rounded-full border border-line px-5 py-3 text-sm text-fg transition-colors hover:border-line2 hover:bg-panel"
              >
                Read the findings
              </a>
            </div>
          </div>

          <Reveal delay={0.1}>
            <div className="panel relative p-5 md:p-6">
              <div className="mb-4 flex items-center justify-between">
                <span className="mono text-[0.66rem] uppercase tracking-[0.2em] text-faint">
                  retrieval trace
                </span>
                <span className="mono inline-flex items-center gap-1.5 text-[0.66rem] uppercase tracking-[0.16em] text-acc-text">
                  <span className="h-1.5 w-1.5 rounded-full bg-acc anim-pulse" /> live shape
                </span>
              </div>
              <RagFlow />
            </div>
          </Reveal>
        </div>

        {/* stat strip — belongs under the hero, not inside it */}
        <div className="border-y border-line bg-bg-elev">
          <div className="mx-auto grid max-w-[1400px] grid-cols-2 gap-px px-5 md:grid-cols-4 md:px-8">
            {[
              {
                label: "ASR · undefended",
                node: <CountUp to={(undef?.asr ?? 0) * 100} suffix="%" decimals={0} />,
                tone: "attack" as const,
              },
              {
                label: "ASR · perplexity filter",
                node: <CountUp to={(def?.asr ?? 0) * 100} suffix="%" decimals={0} />,
                tone: "safe" as const,
              },
              {
                label: "Questions evaluated",
                node: <CountUp to={undef?.n ?? summary?.num_questions ?? 0} />,
                tone: "acc" as const,
              },
              {
                label: "Perplexity cutoff (p95)",
                node: <CountUp to={threshold} decimals={1} />,
                tone: "neutral" as const,
              },
            ].map((s) => (
              <div key={s.label} className="px-1 py-7 md:px-2 md:py-9">
                <Metric label={s.label} value={s.node} tone={s.tone} />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ========================= THREAT MODEL ======================= */}
      <section id="threat" className="mx-auto max-w-[1400px] px-5 py-20 md:px-8 md:py-28">
        <div className="grid gap-12 md:grid-cols-[0.95fr_1.05fr] md:gap-16">
          <div>
            <SectionHead
              title={<>A knowledge base is only as trustworthy as its weakest passage.</>}
              body="Retrieval-augmented generation grounds a language model in documents fetched at query time. That opens a quiet attack surface: an adversary who can add a few documents can steer the answer without ever touching the model."
            />
            <div className="mt-8 space-y-5">
              <div className="flex gap-4">
                <Biohazard size={20} weight="duotone" className="mt-0.5 shrink-0 text-attack" />
                <p className="text-sm leading-relaxed text-mut">
                  <span className="text-fg">PoisonedRAG</span> formalizes the attack as{" "}
                  <span className="mono text-fg">P = S ⊕ I</span> — a retrieval signal the query
                  will surface, fused with an incorrect assertion the model will trust.
                </p>
              </div>
              <div className="flex gap-4">
                <Flask size={20} weight="duotone" className="mt-0.5 shrink-0 text-acc-text" />
                <p className="text-sm leading-relaxed text-mut">
                  This PoC reproduces the black-box variant end to end, then scores a weak
                  baseline defense so the residual gap is measurable, not assumed.
                </p>
              </div>
            </div>
          </div>

          <Reveal delay={0.08}>
            <div className="panel p-6 md:p-8">
              <HBarGroup
                title="Observed on the NQ subset"
                groups={
                  undef && def
                    ? [
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
                      ]
                    : []
                }
              />
              {(!undef || !def) && (
                <div className="py-8 text-center text-xs text-faint">
                  {err ? "backend offline — start the API to load live metrics" : "loading metrics…"}
                </div>
              )}
            </div>
          </Reveal>
        </div>
      </section>

      {/* =========================== PIPELINE ========================= */}
      <section id="pipeline" className="border-y border-line bg-bg-elev">
        <div className="mx-auto max-w-[1400px] px-5 py-20 md:px-8 md:py-24">
          <SectionHead
            title="Five moves from a clean corpus to a corrupted answer."
            body="Each step below maps to a module in the repository. The Lab lets you replay the whole chain on a single question."
          />
          <div className="mt-12 grid gap-px overflow-hidden rounded-lg border border-line md:grid-cols-5">
            {PIPELINE.map((step, i) => (
              <Reveal key={step.n} delay={i * 0.06} className="bg-panel">
                <div className="flex h-full flex-col p-6">
                  <div className="flex items-center justify-between">
                    <step.icon size={22} weight="duotone" className="text-acc-text" />
                    <span className="mono text-[0.7rem] text-faint">{step.n}</span>
                  </div>
                  <h3 className="mt-6 text-[0.98rem] font-medium tracking-tight">{step.title}</h3>
                  <p className="mt-2 text-[0.82rem] leading-relaxed text-mut">{step.body}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* =========================== FINDINGS ========================= */}
      <section id="findings" className="mx-auto max-w-[1400px] px-5 py-20 md:px-8 md:py-28">
        <div className="eyebrow">Findings</div>
        <div className="mt-4 grid gap-8 md:grid-cols-[1.3fr_1fr] md:items-end">
          <h2 className="font-display text-3xl leading-[1.05] tracking-tight text-balance md:text-[2.8rem]">
            The perplexity filter barely dents the attack.
          </h2>
          <p className="max-w-[52ch] text-[0.95rem] leading-relaxed text-mut">
            Poisoned passages are fluent and on-topic, so a language-model perplexity gate
            keeps most of them. What survives is exactly the corruption the defense was meant
            to stop.
          </p>
        </div>

        <div className="mt-12 grid gap-5 lg:grid-cols-12">
          {/* headline gauge */}
          <Reveal className="lg:col-span-4">
            <div className="panel flex h-full flex-col items-center justify-center gap-6 p-8">
              <Gauge value={residual} label="residual ASR" tone="attack" size={160} />
              <p className="max-w-[24ch] text-center text-xs leading-relaxed text-mut">
                Attack success after filtering — the gap a stronger defense must close.
              </p>
            </div>
          </Reveal>

          {/* bars */}
          <Reveal delay={0.06} className="lg:col-span-4">
            <div className="panel h-full p-7">
              <HBarGroup
                groups={
                  undef && def
                    ? [
                        {
                          label: "Across 50 questions",
                          bars: [
                            { label: "undefended", value: undef.asr, tone: "attack" },
                            { label: "ppl filter", value: def.asr, tone: "safe" },
                          ],
                        },
                      ]
                    : []
                }
              />
              <div className="mt-6 grid grid-cols-2 gap-4 border-t border-line pt-5">
                <Metric
                  label="target hits"
                  value={<CountUp to={(undef?.asr ?? 0) * 50} decimals={0} />}
                  tone="attack"
                />
                <Metric
                  label="after filter"
                  value={<CountUp to={(def?.asr ?? 0) * 50} decimals={0} />}
                  tone="safe"
                />
              </div>
            </div>
          </Reveal>

          {/* perplexity separation */}
          <Reveal delay={0.12} className="lg:col-span-4">
            <div className="panel h-full p-7">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium">Perplexity separation</h3>
                <Badge tone="acc">p95 gate</Badge>
              </div>
              <p className="mt-2 text-xs leading-relaxed text-mut">
                Clean and poisoned passages overlap heavily — the filter's core weakness.
              </p>
              <div className="mt-5">
                <PerplexityHist docs={pplDocs} threshold={threshold || 1} />
              </div>
            </div>
          </Reveal>

          {/* hit matrix */}
          <Reveal delay={0.06} className="lg:col-span-8">
            <div className="panel h-full p-7">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h3 className="text-sm font-medium">Per-question outcome</h3>
                <div className="flex items-center gap-4 text-[0.66rem] text-faint">
                  <span className="inline-flex items-center gap-1.5">
                    <span className="h-3 w-3 rounded-[3px] bg-attack" /> hit both
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="h-3 w-3 rounded-[3px] bg-attack/45" /> filtered
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="h-3 w-3 rounded-[3px] bg-safe/70" /> resisted
                  </span>
                </div>
              </div>
              <div className="mt-6">
                <HitMatrix rows={hitRows} filter="all" />
              </div>
            </div>
          </Reveal>

          {/* method note card */}
          <Reveal delay={0.12} className="lg:col-span-4">
            <div className="panel flex h-full flex-col justify-between p-7">
              <div className="flex items-start gap-3">
                <Sparkle size={18} weight="duotone" className="mt-0.5 text-acc-text" />
                <p className="text-sm leading-relaxed text-mut">
                  A weak baseline is the point: it isolates exactly how much signal a naive
                  detector misses, and sets the bar for the novel layer.
                </p>
              </div>
              <div className="mono mt-6 space-y-1 text-[0.68rem] uppercase tracking-[0.14em] text-faint">
                <div className="flex justify-between border-t border-line pt-3">
                  <span>metric</span>
                  <span className="text-fg">substring hit</span>
                </div>
                <div className="flex justify-between border-t border-line pt-3">
                  <span>calibration</span>
                  <span className="text-fg">clean corpus only</span>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ======================== RESIDUAL BAND ======================= */}
      <section className="relative overflow-hidden border-y border-line bg-bg-elev">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-40"
          style={{ background: "radial-gradient(60% 120% at 20% 50%, var(--attack-soft), transparent 60%)" }}
        />
        <div className="relative mx-auto grid max-w-[1400px] items-center gap-10 px-5 py-20 md:grid-cols-[auto_1fr] md:px-8 md:py-24">
          <div className="font-display text-[5.5rem] leading-none tracking-tight text-attack md:text-[8rem]">
            <CountUp to={residual * 100} decimals={0} suffix="%" />
          </div>
          <div className="max-w-[60ch]">
            <h2 className="font-display text-2xl leading-tight tracking-tight md:text-3xl">
              Residual attack success after the baseline defense.
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-mut">
              Perplexity is a surface statistic. Poisoned passages are grammatically ordinary, so
              they pass. The post-mid-sem Collaborative Signal Detection Layer will instead look
              for corroboration — agreement across independent retrievals and sources — which is
              where the real signal hides. <span className="text-faint">(Out of scope for this deliverable.)</span>
            </p>
          </div>
        </div>
      </section>

      {/* ============================ PAPERS ========================== */}
      <section id="papers" className="mx-auto max-w-[1400px] px-5 py-20 md:px-8 md:py-28">
        <div className="eyebrow">Related work</div>
        <h2 className="mt-4 max-w-3xl font-display text-3xl leading-[1.05] tracking-tight text-balance md:text-[2.6rem]">
          The attacks we reproduce, and the defenses we measure against.
        </h2>
        <div className="mt-12 grid gap-px overflow-hidden rounded-lg border border-line md:grid-cols-2">
          <div className="bg-panel p-7 md:p-9">
            <div className="flex items-center gap-3">
              <Biohazard size={20} weight="duotone" className="text-attack" />
              <span className="mono text-[0.7rem] uppercase tracking-[0.2em] text-attack">Attack</span>
            </div>
            <ul className="mt-7 divide-y divide-line">
              {ATTACK_PAPERS.map((p) => (
                <PaperRow key={p.id} p={p} />
              ))}
            </ul>
          </div>
          <div className="bg-panel p-7 md:p-9">
            <div className="flex items-center gap-3">
              <ShieldChevron size={20} weight="duotone" className="text-safe" />
              <span className="mono text-[0.7rem] uppercase tracking-[0.2em] text-safe">Defense</span>
            </div>
            <ul className="mt-7 divide-y divide-line">
              {DEFENSE_PAPERS.map((p) => (
                <PaperRow key={p.id} p={p} />
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* =========================== METHOD =========================== */}
      <section id="method" className="border-t border-line bg-bg-elev">
        <div className="mx-auto max-w-[1400px] px-5 py-20 md:px-8 md:py-24">
          <SectionHead
            title="Everything is pinned, local, and reproducible."
            body="No hosted vector store, no hidden prompts. Model names, thresholds, and the eval corpus all live in one config file."
          />
          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { k: "Embeddings", v: meta?.embed_model ?? "all-MiniLM-L6-v2", tag: "local" },
              { k: "Vector store", v: "FAISS (faiss-cpu)", tag: "local" },
              { k: "Generator", v: meta?.llm_model ?? "openai/gpt-oss-120b", tag: "groq" },
              { k: "Perplexity model", v: meta?.perplexity_model ?? "gpt2", tag: "local" },
              { k: "Dataset", v: `${meta?.dataset ?? "BEIR nq"} · ${meta?.corpus_size ?? 200} passages`, tag: "beir" },
              { k: "Retrieval", v: `top-${meta?.top_k ?? 5} · ${meta?.poison_per_question ?? 5} poison/q`, tag: "config" },
            ].map((row, i) => (
              <Reveal key={row.k} delay={i * 0.04}>
                <div className="panel h-full p-6">
                  <div className="mono text-[0.66rem] uppercase tracking-[0.18em] text-faint">{row.k}</div>
                  <div className="mt-3 font-mono text-[0.92rem] text-fg">{row.v}</div>
                  <div className="mt-4">
                    <Badge>{row.tag}</Badge>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ============================ CTA ============================= */}
      <section className="mx-auto max-w-[1400px] px-5 py-20 md:px-8 md:py-28">
        <div className="relative overflow-hidden rounded-2xl border border-line bg-panel p-10 md:p-16">
          <div
            aria-hidden
            className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full"
            style={{ background: "radial-gradient(circle, var(--accent-glow), transparent 68%)" }}
          />
          <div className="relative grid items-center gap-8 md:grid-cols-[1.4fr_1fr]">
            <div>
              <h2 className="font-display text-3xl leading-[1.05] tracking-tight text-balance md:text-[2.6rem]">
                Run the whole chain on a single question.
              </h2>
              <p className="mt-4 max-w-[52ch] text-sm leading-relaxed text-mut">
                Pick a question, dial the poison count, and watch both pipelines answer side by
                side — retrieved passages, perplexity, and the moment the lie survives.
              </p>
            </div>
            <div className={cx("flex md:justify-end")}>
              <Link
                to="/lab"
                className="group inline-flex items-center gap-2 rounded-full bg-acc px-6 py-3.5 text-sm font-medium text-acc-ink transition-all hover:brightness-105 active:scale-[0.98]"
              >
                Open the Lab
                <ArrowRight size={16} weight="bold" className="transition-transform group-hover:translate-x-1" />
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

function PaperRow({ p }: { p: Paper }) {
  return (
    <li>
      <a
        href={p.url}
        target="_blank"
        rel="noreferrer"
        className="group flex flex-col gap-1.5 py-5 first:pt-0 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="text-[0.95rem] font-medium text-fg">{p.short}</span>
          <span className="mono text-[0.62rem] uppercase tracking-[0.14em] text-faint">
            {p.venue} · {p.year}
          </span>
          <ArrowUpRight
            size={14}
            weight="bold"
            className="ml-auto text-faint transition-all group-hover:text-acc-text group-hover:translate-x-0.5"
          />
        </div>
        <span className="text-[0.82rem] leading-snug text-mut">{truncate(p.title, 110)}</span>
        <span className="mono text-[0.66rem] text-faint">{p.note}</span>
      </a>
    </li>
  );
}
