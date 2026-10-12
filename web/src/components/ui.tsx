import { animate, motion, useInView, useMotionValue, useReducedMotion } from "motion/react";
import { useEffect, useRef, type ReactNode } from "react";
import { cx } from "../lib/format";

export function Reveal({
  children,
  delay = 0,
  y = 18,
  className,
}: {
  children: ReactNode;
  delay?: number;
  y?: number;
  className?: string;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={reduce ? false : { opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.25 }}
      transition={{ duration: 0.6, delay, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.div>
  );
}

export function CountUp({
  to,
  decimals = 0,
  suffix = "",
  prefix = "",
  duration = 1.1,
  className,
}: {
  to: number;
  decimals?: number;
  suffix?: string;
  prefix?: string;
  duration?: number;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.6 });
  const reduce = useReducedMotion();
  const mv = useMotionValue(0);

  const fmt = (v: number) => `${prefix}${v.toFixed(decimals)}${suffix}`;

  useEffect(() => {
    if (!inView || !ref.current) return;
    if (reduce) {
      ref.current.textContent = fmt(to);
      return;
    }
    const c = animate(mv, to, {
      duration,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => {
        if (ref.current) ref.current.textContent = fmt(v);
      },
    });
    return () => c.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inView, to, reduce]);

  return (
    <span ref={ref} className={className}>
      {fmt(0)}
    </span>
  );
}

export function Badge({
  children,
  tone = "neutral",
  className,
}: {
  children: ReactNode;
  tone?: "neutral" | "acc" | "attack" | "safe";
  className?: string;
}) {
  const tones: Record<string, string> = {
    neutral: "border-line text-mut",
    acc: "border-acc/40 text-acc-text bg-acc-soft",
    attack: "border-attack/40 text-attack bg-attack-soft",
    safe: "border-safe/40 text-safe bg-safe-soft",
  };
  return (
    <span
      className={cx(
        "mono inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[0.65rem] uppercase tracking-[0.14em]",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

export function SectionHead({
  index,
  title,
  body,
  align = "left",
}: {
  index?: string;
  title: ReactNode;
  body?: ReactNode;
  align?: "left" | "center";
}) {
  return (
    <div className={cx("max-w-2xl", align === "center" && "mx-auto text-center")}>
      {index && <div className="eyebrow">{index}</div>}
      <h2 className="mt-3 font-display text-3xl leading-[1.05] tracking-tight text-balance md:text-[2.6rem]">
        {title}
      </h2>
      {body && (
        <p className="mt-4 max-w-[62ch] text-[0.95rem] leading-relaxed text-mut text-pretty">
          {body}
        </p>
      )}
    </div>
  );
}

export function Metric({
  label,
  value,
  sub,
  tone = "neutral",
  className,
}: {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  tone?: "neutral" | "acc" | "attack" | "safe";
  className?: string;
}) {
  const valTone: Record<string, string> = {
    neutral: "text-fg",
    acc: "text-acc-text",
    attack: "text-attack",
    safe: "text-safe",
  };
  return (
    <div className={cx("flex flex-col gap-2", className)}>
      <span className="mono text-[0.68rem] uppercase tracking-[0.18em] text-faint">
        {label}
      </span>
      <span className={cx("font-display text-4xl tracking-tight tabular-nums", valTone[tone])}>
        {value}
      </span>
      {sub && <span className="text-xs text-mut">{sub}</span>}
    </div>
  );
}

export function Rule({ className }: { className?: string }) {
  return <div className={cx("h-px w-full bg-line", className)} />;
}
