"use client";

import { cn } from "@/lib/utils";
import type { ReactNode, MouseEvent } from "react";
import { useRef, useEffect, useCallback, useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, ArrowRight } from "lucide-react";

export type HScrollCard = {
  id: string;
  label: string;
  title: string;
  visual: ReactNode;
};

/**
 * Infinite-loop horizontal scroll gallery with auto-scroll.
 * Auto-scrolls slowly, pauses on hover, arrows for manual control.
 */
export function HorizontalScroll({
  cards,
  className,
}: {
  cards: HScrollCard[];
  className?: string;
}) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  const hovering = useRef(false);
  const rafId = useRef<number>(0);
  const speed = useRef(0.5); // px per frame (~30px/s at 60fps)

  // Triple the cards for seamless looping
  const tripled = [...cards, ...cards, ...cards];

  // On mount, scroll to the start of the middle set
  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    requestAnimationFrame(() => {
      const oneSet = el.scrollWidth / 3;
      el.scrollLeft = oneSet;
      setReady(true);
    });
  }, []);

  // Auto-scroll loop + seamless wrap
  useEffect(() => {
    const el = scrollerRef.current;
    if (!el || !ready) return;

    function tick() {
      if (!el) return;
      if (!hovering.current) {
        el.scrollLeft += speed.current;
      }

      // Seamless loop clamping
      const oneSet = el.scrollWidth / 3;
      if (el.scrollLeft >= oneSet * 2) {
        el.scrollLeft -= oneSet;
      } else if (el.scrollLeft <= 0) {
        el.scrollLeft += oneSet;
      }

      rafId.current = requestAnimationFrame(tick);
    }

    rafId.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId.current);
  }, [ready]);

  function scroll(delta: number) {
    if (!scrollerRef.current) return;
    scrollerRef.current.scrollBy({ left: delta, behavior: "smooth" });
  }

  const handleMouseEnter = useCallback(() => {
    hovering.current = true;
  }, []);

  const handleMouseLeave = useCallback(() => {
    hovering.current = false;
  }, []);

  // Card spotlight handler
  const handleMouseMove = useCallback((e: MouseEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    const rect = el.getBoundingClientRect();
    el.style.setProperty("--mx", `${e.clientX - rect.left}px`);
    el.style.setProperty("--my", `${e.clientY - rect.top}px`);
  }, []);

  return (
    <div
      className={cn("relative", className)}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Controls — liquid glass arrow buttons */}
      <div className="mb-6 flex items-center justify-end gap-2 px-6 md:px-12">
        <button
          onClick={() => scroll(-320)}
          className="liquid-glass flex h-10 w-10 items-center justify-center rounded-full transition-all hover:scale-105"
          aria-label="Scroll left"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <button
          onClick={() => scroll(320)}
          className="liquid-glass flex h-10 w-10 items-center justify-center rounded-full transition-all hover:scale-105"
          aria-label="Scroll right"
        >
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>

      <div
        ref={scrollerRef}
        className={cn(
          "flex gap-4 overflow-x-auto scroll-smooth px-6 pb-6 md:px-12 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
          !ready && "opacity-0"
        )}
      >
        {tripled.map((card, i) => (
          <motion.div
            key={`${card.id}-${i}`}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "0px -10% 0px -10%" }}
            transition={{
              delay: (i % cards.length) * 0.03,
              duration: 0.6,
              ease: [0.16, 1, 0.3, 1],
            }}
            onMouseMove={handleMouseMove}
            className="liquid-glass spotlight spotlight-white w-[72vw] shrink-0 rounded-2xl p-6 md:w-[340px]"
          >
            <p className="mono-label mb-3 block">{card.label}</p>
            <h3 className="mb-4 text-sm font-medium text-[color:var(--m-text)]">
              {card.title}
            </h3>
            <div className="mt-auto">{card.visual}</div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
