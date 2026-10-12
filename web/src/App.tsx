import { AnimatePresence, motion } from "motion/react";
import { useEffect } from "react";
import { Route, Routes, useLocation } from "react-router-dom";
import { TopNav } from "./components/TopNav";
import { SiteFooter } from "./components/SiteFooter";
import Landing from "./routes/Landing";
import Lab from "./routes/Lab";

function ScrollToTop() {
  const { pathname, hash } = useLocation();
  useEffect(() => {
    if (hash) {
      const el = document.querySelector(hash);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
        return;
      }
    }
    window.scrollTo({ top: 0, behavior: "auto" });
  }, [pathname, hash]);
  return null;
}

export default function App() {
  const location = useLocation();
  return (
    <div className="grain min-h-[100dvh] bg-bg text-fg">
      <ScrollToTop />
      <TopNav />
      <AnimatePresence mode="wait">
        <motion.main
          key={location.pathname}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        >
          <Routes location={location}>
            <Route path="/" element={<Landing />} />
            <Route path="/lab" element={<Lab />} />
            <Route path="*" element={<Landing />} />
          </Routes>
        </motion.main>
      </AnimatePresence>
      <SiteFooter />
    </div>
  );
}
