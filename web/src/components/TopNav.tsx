import { AnimatePresence, motion } from "motion/react";
import { List, MoonStars, Sun, X } from "@phosphor-icons/react";
import { useState } from "react";
import { Link, NavLink } from "react-router-dom";
import { useTheme } from "../lib/theme";

const LINKS = [
  { label: "Threat model", to: "/#threat" },
  { label: "Findings", to: "/#findings" },
  { label: "Papers", to: "/#papers" },
  { label: "Method", to: "/#method" },
];

function Mark() {
  return (
    <span className="relative flex h-7 w-7 items-center justify-center">
      <svg viewBox="0 0 32 32" className="h-7 w-7" aria-hidden>
        <rect x="1" y="1" width="30" height="30" rx="8" fill="var(--panel-2)" stroke="var(--line-strong)" />
        <path
          d="M16 7c4.2 4.4 6.4 7.3 6.4 10.2A6.4 6.4 0 0 1 16 23.6a6.4 6.4 0 0 1-6.4-6.4C9.6 14.3 11.8 11.4 16 7Z"
          fill="var(--accent)"
        />
        <path d="M16 12.4v6.8" stroke="var(--accent-ink)" strokeWidth="1.6" strokeLinecap="round" />
        <path d="M12.6 15.8h6.8" stroke="var(--accent-ink)" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    </span>
  );
}

export function TopNav() {
  const { theme, toggle } = useTheme();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-line bg-bg/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-[1400px] items-center gap-4 px-5 md:px-8">
        <Link to="/" className="flex items-center gap-2.5 shrink-0" aria-label="Collab-RAG-Defense home">
          <Mark />
          <span className="flex flex-col leading-none">
            <span className="font-display text-[0.95rem] font-medium tracking-tight">
              Collab-RAG-Defense
            </span>
            <span className="mono text-[0.6rem] uppercase tracking-[0.2em] text-faint">
              EDI · Sem-5
            </span>
          </span>
        </Link>

        <nav className="ml-auto hidden items-center gap-1 lg:flex">
          {LINKS.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className="rounded-full px-3 py-2 text-sm text-mut transition-colors hover:text-fg"
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2 lg:ml-2">
          <button
            type="button"
            onClick={toggle}
            aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
            className="grid h-9 w-9 place-items-center rounded-full border border-line text-mut transition-colors hover:border-line2 hover:text-fg active:scale-[0.96]"
          >
            {theme === "dark" ? <Sun size={16} weight="bold" /> : <MoonStars size={16} weight="bold" />}
          </button>

          <NavLink
            to="/lab"
            className="hidden items-center gap-1.5 rounded-full bg-acc px-4 py-2 text-sm font-medium text-acc-ink transition-all hover:brightness-105 active:scale-[0.98] sm:inline-flex"
          >
            Open the Lab
          </NavLink>

          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-label="Menu"
            className="grid h-9 w-9 place-items-center rounded-full border border-line text-fg lg:hidden"
          >
            {open ? <X size={16} weight="bold" /> : <List size={16} weight="bold" />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {open && (
          <motion.nav
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden border-t border-line bg-bg lg:hidden"
          >
            <div className="mx-auto flex max-w-[1400px] flex-col px-5 py-3">
              {LINKS.map((l) => (
                <Link
                  key={l.to}
                  to={l.to}
                  onClick={() => setOpen(false)}
                  className="border-b border-line py-3 text-sm text-mut last:border-0 hover:text-fg"
                >
                  {l.label}
                </Link>
              ))}
              <Link
                to="/lab"
                onClick={() => setOpen(false)}
                className="mt-3 rounded-full bg-acc px-4 py-2.5 text-center text-sm font-medium text-acc-ink"
              >
                Open the Lab
              </Link>
            </div>
          </motion.nav>
        )}
      </AnimatePresence>
    </header>
  );
}
