"use client";

import { cn } from "@/lib/utils";
import { motion, useReducedMotion, AnimatePresence } from "framer-motion";
import { useEffect, useState, type ReactNode } from "react";

export type TelemetryItem = {
  id: string;
  content: ReactNode;
};

/**
 * Auto-cycling stacked cards. The first card is highlighted and cycles every `interval` ms.
 * Gives a kinetic "the product is running" feeling without faking data.
 */
export function Telemetry({
  items,
  interval = 3200,
  className,
}: {
  items: TelemetryItem[];
  interval?: number;
  className?: string;
}) {
  const reduced = useReducedMotion();
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (reduced) return;
    const id = setInterval(() => {
      setIndex((i) => (i + 1) % items.length);
    }, interval);
    return () => clearInterval(id);
  }, [items.length, interval, reduced]);

  // Display order: current at top, next behind
  const ordered = [
    items[index],
    items[(index + 1) % items.length],
    items[(index + 2) % items.length],
  ];

  return (
    <div className={cn("relative h-[320px] md:h-[360px]", className)}>
      <AnimatePresence initial={false}>
        {ordered.map((item, i) => (
          <motion.div
            key={item.id + i}
            initial={{ opacity: 0, y: 20, scale: 0.96 }}
            animate={{
              opacity: 1 - i * 0.28,
              y: i * 18,
              scale: 1 - i * 0.04,
              filter: i === 0 ? "blur(0px)" : `blur(${i}px)`,
            }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
            className="absolute inset-x-0 top-0"
            style={{ zIndex: 10 - i }}
          >
            {item.content}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
