import { createContext, useCallback, useContext, useEffect, useState } from "react";

type Theme = "dark" | "light";

type ThemeCtx = {
  theme: Theme;
  toggle: () => void;
  set: (t: Theme) => void;
};

const Ctx = createContext<ThemeCtx | null>(null);
const KEY = "crd-theme";

function readInitial(): Theme {
  if (typeof document === "undefined") return "light";
  const attr = document.documentElement.getAttribute("data-theme");
  if (attr === "light" || attr === "dark") return attr;
  try {
    const stored = localStorage.getItem(KEY);
    if (stored === "light" || stored === "dark") return stored;
  } catch {
    /* ignore */
  }
  return "light";
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(readInitial);

  const apply = useCallback((t: Theme) => {
    // set the attribute synchronously so components reading CSS vars during
    // the same render cycle (SVG charts) see the new palette immediately
    document.documentElement.setAttribute("data-theme", t);
    try {
      localStorage.setItem(KEY, t);
    } catch {
      /* ignore */
    }
    setThemeState(t);
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  const toggle = useCallback(
    () => apply(theme === "dark" ? "light" : "dark"),
    [apply, theme],
  );

  return (
    <Ctx.Provider value={{ theme, toggle, set: apply }}>
      {children}
    </Ctx.Provider>
  );
}

export function useTheme() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useTheme must be used within ThemeProvider");
  return c;
}
