import { motion, useReducedMotion } from "motion/react";

type Chip = { id: string; ppl: number; poison: boolean };

const CHIPS: Chip[] = [
  { id: "doc-0417", ppl: 38, poison: false },
  { id: "doc-0892", ppl: 44, poison: false },
  { id: "POISON-0", ppl: 61, poison: true },
  { id: "doc-1153", ppl: 35, poison: false },
  { id: "POISON-1", ppl: 58, poison: true },
];

const CHIP_X = 186;
const CHIP_W = 158;
const CHIP_H = 42;
const CHIP_Y0 = 30;
const STEP = 62;
const chipCY = (i: number) => CHIP_Y0 + i * STEP + CHIP_H / 2;

const QUERY = { x: 14, y: 162, w: 112, h: 54, cy: 189 };
const GATE = { x: 386, y: 150, w: 142, h: 54, cy: 177 };
const ANS = { x: 386, y: 268, w: 142, h: 74 };

export function RagFlow() {
  const reduce = useReducedMotion();

  return (
    <div className="relative w-full">
      <svg viewBox="0 0 540 380" className="w-full" role="img" aria-label="RAG poisoning pipeline diagram">
        <defs>
          <marker id="crd-arrow" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
            <path d="M0 0 L10 5 L0 10 z" fill="var(--line-strong)" />
          </marker>
          <marker id="crd-arrow-p" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
            <path d="M0 0 L10 5 L0 10 z" fill="var(--attack)" />
          </marker>
        </defs>

        {/* query → chips */}
        {CHIPS.map((c, i) => (
          <line
            key={`q-${c.id}`}
            x1={QUERY.x + QUERY.w}
            y1={QUERY.cy}
            x2={CHIP_X}
            y2={chipCY(i)}
            stroke={c.poison ? "var(--attack)" : "var(--line-strong)"}
            strokeWidth={1.2}
            strokeDasharray="5 6"
            markerEnd={c.poison ? "url(#crd-arrow-p)" : "url(#crd-arrow)"}
            style={reduce ? undefined : { animation: `crd-dash 7s linear infinite`, animationDelay: `${i * 0.4}s` }}
            opacity={c.poison ? 0.9 : 0.7}
          />
        ))}

        {/* chips → gate */}
        {CHIPS.map((c, i) => (
          <line
            key={`g-${c.id}`}
            x1={CHIP_X + CHIP_W}
            y1={chipCY(i)}
            x2={GATE.x}
            y2={GATE.cy}
            stroke="var(--line-strong)"
            strokeWidth={1.2}
            markerEnd="url(#crd-arrow)"
            style={reduce ? undefined : { animation: `crd-dash 9s linear infinite`, animationDelay: `${i * 0.3}s` }}
            opacity={0.6}
          />
        ))}

        {/* gate → answer */}
        <line
          x1={GATE.x + GATE.w / 2}
          y1={GATE.y + GATE.h}
          x2={ANS.x + ANS.w / 2}
          y2={ANS.y}
          stroke="var(--accent)"
          strokeWidth={1.4}
          markerEnd="url(#crd-arrow)"
          style={reduce ? undefined : { animation: "crd-dash 5s linear infinite" }}
        />

        {/* query node */}
        <g>
          <rect x={QUERY.x} y={QUERY.y} rx={12} width={QUERY.w} height={QUERY.h} fill="var(--panel-2)" stroke="var(--line-strong)" />
          <text x={QUERY.x + 14} y={QUERY.y + 22} className="mono" fontSize="9.5" fill="var(--text-faint)" letterSpacing="1.5">INPUT</text>
          <text x={QUERY.x + 14} y={QUERY.y + 40} fontSize="13" fill="var(--text)" fontFamily="var(--font-display)">query q</text>
        </g>

        {/* chips */}
        {CHIPS.map((c, i) => (
          <g key={c.id}>
            <rect
              x={CHIP_X}
              y={CHIP_Y0 + i * STEP}
              rx={9}
              width={CHIP_W}
              height={CHIP_H}
              fill={c.poison ? "var(--attack-soft)" : "var(--panel)"}
              stroke={c.poison ? "var(--attack)" : "var(--line)"}
              strokeWidth={c.poison ? 1.4 : 1}
            />
            <circle cx={CHIP_X + 16} cy={chipCY(i)} r={3.2} fill={c.poison ? "var(--attack)" : "var(--text-faint)"} className={reduce ? undefined : "anim-pulse"} />
            <text x={CHIP_X + 30} y={chipCY(i) + 4} className="mono" fontSize="11" fill={c.poison ? "var(--attack)" : "var(--text)"}>
              {c.id}
            </text>
            <text x={CHIP_X + CHIP_W - 12} y={chipCY(i) + 4} className="mono" fontSize="10" textAnchor="end" fill="var(--text-faint)">
              ppl {c.ppl}
            </text>
          </g>
        ))}

        {/* gate node */}
        <g>
          <rect x={GATE.x} y={GATE.y} rx={12} width={GATE.w} height={GATE.h} fill="var(--panel-2)" stroke="var(--accent)" strokeWidth={1.3} />
          <text x={GATE.x + 14} y={GATE.y + 22} className="mono" fontSize="9.5" fill="var(--accent-text)" letterSpacing="1.5">DEFENSE</text>
          <text x={GATE.x + 14} y={GATE.y + 40} fontSize="12.5" fill="var(--text)" fontFamily="var(--font-display)">perplexity ≤ p95</text>
        </g>

        {/* answer node */}
        <g>
          <rect x={ANS.x} y={ANS.y} rx={12} width={ANS.w} height={ANS.h} fill="var(--panel-2)" stroke="var(--line-strong)" />
          <text x={ANS.x + 14} y={ANS.y + 22} className="mono" fontSize="9.5" fill="var(--text-faint)" letterSpacing="1.5">ANSWER</text>
          <text x={ANS.x + 14} y={ANS.y + 42} fontSize="12.5" fill="var(--text)" fontFamily="var(--font-display)">Groq LLM</text>
          <text x={ANS.x + 14} y={ANS.y + 60} className="mono" fontSize="10" fill="var(--text-faint)">temp 0 · one sentence</text>
        </g>
      </svg>

      <div className="mono mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-[0.66rem] uppercase tracking-[0.16em] text-faint">
        <span className="inline-flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-attack" /> poisoned passage
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-faint" /> clean passage
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-acc" /> kept by filter
        </span>
      </div>

      {!reduce && (
        <motion.div
          aria-hidden
          className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full"
          style={{ background: "radial-gradient(circle, var(--accent-glow), transparent 68%)" }}
          animate={{ opacity: [0.5, 0.85, 0.5] }}
          transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
        />
      )}
    </div>
  );
}
