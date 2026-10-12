import { useTheme } from "../lib/theme";
import { cx, pct } from "../lib/format";

/* Read theme colors as concrete values so SVG can use them reliably. */
function cssVar(name: string): string {
  if (typeof window === "undefined") return "#888";
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || "#888";
}

function useColors() {
  const { theme } = useTheme();
  void theme;
  return {
    acc: cssVar("--accent"),
    attack: cssVar("--attack"),
    safe: cssVar("--safe"),
    text: cssVar("--text"),
    muted: cssVar("--text-muted"),
    faint: cssVar("--text-faint"),
    line: cssVar("--line-strong"),
    panel: cssVar("--panel-2"),
    panel3: cssVar("--panel-3"),
  };
}

/* ---------------------------------------------------------------- *\
   Grouped horizontal bars
\* ---------------------------------------------------------------- */
export type HBar = { label: string; value: number; tone: "attack" | "safe" | "acc" };

export function HBarGroup({
  title,
  groups,
  max = 1,
}: {
  title?: string;
  groups: { label: string; bars: HBar[] }[];
  max?: number;
}) {
  const c = useColors();
  const toneColor = (t: HBar["tone"]) => (t === "attack" ? c.attack : t === "safe" ? c.safe : c.acc);

  return (
    <div className="space-y-6">
      {title && <div className="eyebrow">{title}</div>}
      {groups.map((g) => (
        <div key={g.label}>
          <div className="flex items-baseline justify-between">
            <span className="text-sm text-fg">{g.label}</span>
            <span className="mono text-[0.7rem] text-faint">rate</span>
          </div>
          <div className="mt-2 space-y-1.5">
            {g.bars.map((b) => (
              <div key={b.label} className="flex items-center gap-3">
                <span className="mono w-24 shrink-0 text-[0.66rem] uppercase tracking-[0.12em] text-faint">
                  {b.label}
                </span>
                <div className="relative h-3 flex-1 overflow-hidden rounded-full bg-panel-2">
                  <div
                    className="h-full rounded-full transition-[width] duration-700 ease-[cubic-bezier(0.16,1,0.3,1)]"
                    style={{ width: `${Math.max(2, (b.value / max) * 100)}%`, background: toneColor(b.tone) }}
                  />
                </div>
                <span className="mono w-14 shrink-0 text-right text-[0.72rem] tabular-nums text-fg">
                  {pct(b.value)}
                </span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ---------------------------------------------------------------- *\
   Perplexity histogram: clean vs poison counts across a shared axis
\* ---------------------------------------------------------------- */
export function PerplexityHist({
  docs,
  threshold,
  bins = 22,
}: {
  docs: { doc_id: string; perplexity: number | null; poisoned: boolean }[];
  threshold: number;
  bins?: number;
}) {
  const c = useColors();
  const pts = docs.filter((d) => d.perplexity != null) as {
    doc_id: string;
    perplexity: number;
    poisoned: boolean;
  }[];

  if (pts.length === 0) {
    return (
      <div className="flex h-[170px] items-center justify-center rounded-md border border-line bg-panel-2 text-xs text-faint">
        no scored passages yet
      </div>
    );
  }

  const dataMax = Math.max(...pts.map((p) => p.perplexity), threshold, 1);
  const niceMax = Math.ceil(dataMax / 50) * 50;
  const W = 640;
  const H = 190;
  const padL = 10;
  const padR = 10;
  const top = 16;
  const base = H - 30;
  const plotW = W - padL - padR;

  const counts = Array.from({ length: bins }, () => ({ clean: 0, poison: 0 }));
  for (const p of pts) {
    const idx = Math.min(bins - 1, Math.floor((p.perplexity / niceMax) * bins));
    if (p.poisoned) counts[idx].poison += 1;
    else counts[idx].clean += 1;
  }
  const maxCount = Math.max(1, ...counts.map((b) => b.clean + b.poison));

  const bw = plotW / bins;
  const barH = (v: number) => (v / maxCount) * (base - top);
  const xThresh = padL + (Math.min(threshold, niceMax) / niceMax) * plotW;
  const tickStep = niceMax / 5;

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Perplexity distribution of retrieved passages">
        {/* baseline */}
        <line x1={padL} y1={base} x2={W - padR} y2={base} stroke={c.line} strokeWidth={1} />

        {counts.map((b, i) => {
          const x = padL + i * bw;
          const hc = barH(b.clean);
          const hp = barH(b.poison);
          return (
            <g key={i}>
              {b.clean > 0 && (
                <rect x={x + 1} y={base - hc} width={bw - 2} height={hc} rx={1.5} fill={c.muted} opacity={0.55} />
              )}
              {b.poison > 0 && (
                <rect x={x + 1} y={base - hc - hp} width={bw - 2} height={hp} rx={1.5} fill={c.attack} opacity={0.92} />
              )}
            </g>
          );
        })}

        {/* threshold */}
        <line x1={xThresh} y1={top - 6} x2={xThresh} y2={base} stroke={c.acc} strokeWidth={1.5} strokeDasharray="4 4" />
        <text x={xThresh + 4} y={top + 4} className="mono" fontSize="9.5" fill={c.acc}>
          p95 {threshold.toFixed(0)}
        </text>

        {/* ticks */}
        {Array.from({ length: 6 }, (_, i) => i * tickStep).map((t, i) => (
          <text key={i} x={padL + (t / niceMax) * plotW} y={H - 10} className="mono" fontSize="9" textAnchor="middle" fill={c.faint}>
            {t.toFixed(0)}
          </text>
        ))}
      </svg>
      <div className="mono mt-1 flex items-center gap-5 text-[0.64rem] uppercase tracking-[0.14em] text-faint">
        <span className="inline-flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-[2px]" style={{ background: c.muted, opacity: 0.55 }} /> clean
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-[2px]" style={{ background: c.attack }} /> poisoned
        </span>
        <span className="ml-auto">passages / bin</span>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- *\
   Hit matrix: one cell per question, attack/defense outcome
\* ---------------------------------------------------------------- */
export function HitMatrix({
  rows,
  filter,
}: {
  rows: { qid: string; target: string; undef: boolean; def: boolean }[];
  filter: "all" | "attack" | "residual" | "defended";
}) {
  const visible = rows.filter((r) => {
    if (filter === "all") return true;
    if (filter === "attack") return r.undef;
    if (filter === "residual") return r.undef && r.def;
    return !r.undef && !r.def;
  });

  if (visible.length === 0) {
    return <div className="py-10 text-center text-xs text-faint">no questions in this slice</div>;
  }

  return (
    <div className="flex flex-wrap gap-1.5" role="list" aria-label="Per-question attack outcome">
      {visible.map((r) => {
        const tone = r.undef ? (r.def ? "bg-attack" : "bg-attack/45") : "bg-safe/70";
        return (
          <span
            key={r.qid}
            role="listitem"
            title={`${r.qid} · ${r.target || "—"} · undef ${r.undef ? "hit" : "miss"} / def ${r.def ? "hit" : "miss"}`}
            className={cx(
              "h-4 w-4 rounded-[3px] transition-transform hover:scale-125 hover:ring-1 hover:ring-line2",
              tone,
            )}
          />
        );
      })}
    </div>
  );
}

/* ---------------------------------------------------------------- *\
   Radial gauge (single value)
\* ---------------------------------------------------------------- */
export function Gauge({
  value,
  label,
  tone = "acc",
  size = 132,
}: {
  value: number;
  label: string;
  tone?: "acc" | "attack" | "safe";
  size?: number;
}) {
  const c = useColors();
  const r = size / 2 - 12;
  const circ = 2 * Math.PI * r;
  const col = tone === "attack" ? c.attack : tone === "safe" ? c.safe : c.acc;
  const dash = circ * (1 - value);

  return (
    <div className="flex flex-col items-center gap-1" style={{ width: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={`${label}: ${pct(value)}`}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={c.panel3} strokeWidth={9} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={col}
          strokeWidth={9}
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={dash}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ transition: "stroke-dashoffset 0.9s cubic-bezier(0.16,1,0.3,1)" }}
        />
        <text
          x="50%"
          y="49%"
          textAnchor="middle"
          dominantBaseline="central"
          fontSize={size * 0.24}
          fill={c.text}
          fontFamily="var(--font-display)"
        >
          {pct(value)}
        </text>
      </svg>
      <span className="mono text-[0.62rem] uppercase tracking-[0.16em] text-faint">{label}</span>
    </div>
  );
}
