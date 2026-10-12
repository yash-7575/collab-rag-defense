import { GithubLogo, ArrowUpRight } from "@phosphor-icons/react";
import { Link } from "react-router-dom";

const COLS = [
  {
    head: "Study",
    links: [
      { label: "Threat model", to: "/#threat" },
      { label: "Findings", to: "/#findings" },
      { label: "Method", to: "/#method" },
    ],
  },
  {
    head: "Lab",
    links: [
      { label: "Open the Lab", to: "/lab" },
      { label: "Run an evaluation", to: "/lab" },
      { label: "Papers", to: "/#papers" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-line bg-bg-elev">
      <div className="mx-auto max-w-[1400px] px-5 py-14 md:px-8">
        <div className="grid gap-10 md:grid-cols-[1.4fr_1fr_1fr]">
          <div>
            <div className="font-display text-lg tracking-tight">Collab-RAG-Defense</div>
            <p className="mt-3 max-w-[42ch] text-sm leading-relaxed text-mut">
              A reproducible study of knowledge-corruption attacks on retrieval-augmented
              generation, and the defenses that fight back. EDI research project, Sem-5.
            </p>
            <div className="mono mt-5 flex flex-wrap gap-x-4 gap-y-1 text-[0.7rem] uppercase tracking-[0.16em] text-faint">
              <span>MiniLM · FAISS · Groq</span>
              <span>NQ / BEIR</span>
              <span>GPT-2 ppl</span>
            </div>
          </div>

          {COLS.map((col) => (
            <div key={col.head}>
              <div className="eyebrow">{col.head}</div>
              <ul className="mt-4 space-y-2.5">
                {col.links.map((l) => (
                  <li key={l.label}>
                    <Link
                      to={l.to}
                      className="link-underline text-sm text-mut transition-colors hover:text-fg"
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-col gap-4 border-t border-line pt-6 text-xs text-faint sm:flex-row sm:items-center sm:justify-between">
          <span className="mono uppercase tracking-[0.14em]">
            Reproduced attack: PoisonedRAG · Zou et al., USENIX Security 2025
          </span>
          <div className="flex items-center gap-5">
            <a
              href="https://github.com/sleeepeer/PoisonedRAG"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 transition-colors hover:text-fg"
            >
              <GithubLogo size={14} weight="bold" /> Upstream
              <ArrowUpRight size={12} weight="bold" />
            </a>
            <span>© {new Date().getFullYear()} Yash Bhagyawant</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
