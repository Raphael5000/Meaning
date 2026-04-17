"use client";

import { cn } from "@/lib/utils";
import type { ReactNode, MutableRefObject } from "react";
import { useEffect, useRef } from "react";
import { motion, useMotionValue, useTransform, type MotionValue } from "framer-motion";

export type StickyScrollStep = {
  id: string;
  label: string;
  title: string;
  description: string;
  visual: ReactNode;
};

function StepLabel({
  step,
  index,
  total,
  progress,
}: {
  step: StickyScrollStep;
  index: number;
  total: number;
  progress: MotionValue<number>;
}) {
  // Each step's "active" centre, with smooth fade in/out around it.
  const center = (index + 0.5) / total;
  const half = 0.5 / total;
  const clamp = (v: number) => Math.max(0, Math.min(1, v));
  // Pre-sort + dedupe to guarantee monotonically non-decreasing offsets.
  const monotonic = (arr: number[]) => {
    const out = [...arr];
    for (let i = 1; i < out.length; i++) {
      if (out[i] <= out[i - 1]) out[i] = out[i - 1] + 0.0001;
    }
    return out;
  };

  const opacity = useTransform(
    progress,
    monotonic([
      clamp(center - half * 1.4),
      clamp(center - half * 0.4),
      clamp(center + half * 0.4),
      clamp(center + half * 1.4),
    ]),
    [0.25, 1, 1, 0.25],
  );
  const barScale = useTransform(
    progress,
    monotonic([
      clamp(center - half * 1.2),
      clamp(center - half * 0.4),
      clamp(center + half * 0.4),
      clamp(center + half * 1.2),
    ]),
    [0, 1, 1, 0],
  );

  return (
    <motion.li
      style={{ opacity }}
      className="relative pl-6 transition-colors"
    >
      {/* Left accent bar — grows when this step is active */}
      <motion.span
        aria-hidden
        style={{ scaleY: barScale }}
        className="absolute left-0 top-0 h-full w-[2px] origin-center bg-[color:var(--brand)]"
      />
      <p className="mono-label mb-2">{step.label}</p>
      <p className="display-md text-[color:var(--m-text)]">{step.title}</p>
      <p className="mt-3 text-base text-[color:var(--m-text-secondary)]">
        {step.description}
      </p>
    </motion.li>
  );
}

/**
 * Left column text pins while right column scrolls through visual states.
 * On small screens it degrades to a simple vertical stack.
 */
export function StickyScroll({
  steps,
  className,
}: {
  steps: StickyScrollStep[];
  className?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(
    null,
  ) as MutableRefObject<HTMLDivElement | null>;
  const scrollYProgress = useMotionValue(0);

  // Manual scroll progress: works regardless of which element is the scroll
  // container (body vs window). Reads bounding rect on every scroll/resize.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    let raf = 0;
    const measure = () => {
      raf = 0;
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const vh = window.innerHeight;
      // 0 when container's top hits viewport top, 1 when container's bottom hits viewport bottom.
      const total = rect.height - vh;
      const passed = -rect.top;
      const p = total <= 0 ? 0 : Math.max(0, Math.min(1, passed / total));
      scrollYProgress.set(p);
    };
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(measure);
    };
    // Capture-phase document listener catches scrolls from body or any inner scroller.
    document.addEventListener("scroll", onScroll, { capture: true, passive: true });
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    measure();
    return () => {
      document.removeEventListener("scroll", onScroll, { capture: true } as EventListenerOptions);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [scrollYProgress]);

  const n = steps.length;

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative grid grid-cols-1 gap-10 md:grid-cols-12 md:gap-16",
        className,
      )}
      style={{ minHeight: `${n * 80}vh` }}
    >
      <div className="md:col-span-5">
        <div className="md:sticky md:top-32 md:flex md:h-[calc(100vh-8rem)] md:items-center">
          <ul className="flex w-full flex-col gap-10">
            {steps.map((s, i) => (
              <StepLabel
                key={s.id}
                step={s}
                index={i}
                total={n}
                progress={scrollYProgress}
              />
            ))}
          </ul>
        </div>
      </div>

      <div className="md:col-span-7">
        <div className="md:sticky md:top-32 md:flex md:h-[calc(100vh-8rem)] md:items-center">
          <div className="relative w-full">
            {steps.map((s, i) => (
              <StepVisual
                key={s.id}
                index={i}
                total={n}
                progress={scrollYProgress}
              >
                {s.visual}
              </StepVisual>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function StepVisual({
  index,
  total,
  progress,
  children,
}: {
  index: number;
  total: number;
  progress: MotionValue<number>;
  children: ReactNode;
}) {
  const center = (index + 0.5) / total;
  const half = 0.5 / total;
  const clamp = (v: number) => Math.max(0, Math.min(1, v));
  const monotonic = (arr: number[]) => {
    const out = [...arr];
    for (let i = 1; i < out.length; i++) {
      if (out[i] <= out[i - 1]) out[i] = out[i - 1] + 0.0001;
    }
    return out;
  };

  const opacity = useTransform(
    progress,
    monotonic([
      clamp(center - half * 1.2),
      clamp(center - half * 0.3),
      clamp(center + half * 0.3),
      clamp(center + half * 1.2),
    ]),
    [0, 1, 1, 0],
  );
  const y = useTransform(
    progress,
    monotonic([
      clamp(center - half * 1.2),
      clamp(center),
      clamp(center + half * 1.2),
    ]),
    [24, 0, -24],
  );
  const scale = useTransform(
    progress,
    monotonic([
      clamp(center - half * 1.2),
      clamp(center),
      clamp(center + half * 1.2),
    ]),
    [0.96, 1, 0.96],
  );

  return (
    <motion.div
      style={{ opacity, y, scale }}
      className="absolute inset-0 flex items-center justify-center"
    >
      {children}
    </motion.div>
  );
}
