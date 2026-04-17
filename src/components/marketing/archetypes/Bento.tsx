"use client";

import { cn } from "@/lib/utils";
import type { ReactNode, MouseEvent } from "react";
import { useRef } from "react";
import { motion, useReducedMotion } from "framer-motion";

export function Bento({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "grid grid-cols-1 gap-4 md:grid-cols-6 md:gap-5",
        className,
      )}
    >
      {children}
    </div>
  );
}

type TileSpan = "1" | "2" | "3" | "4" | "6";

export function BentoTile({
  children,
  className,
  colSpan = "3",
  rowSpan = "1",
  index = 0,
  spotlight = true,
}: {
  children: ReactNode;
  className?: string;
  colSpan?: TileSpan; // out of 6
  rowSpan?: "1" | "2";
  index?: number;
  spotlight?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();

  function handleMove(e: MouseEvent<HTMLDivElement>) {
    if (!ref.current || reduced) return;
    const rect = ref.current.getBoundingClientRect();
    ref.current.style.setProperty("--mx", `${e.clientX - rect.left}px`);
    ref.current.style.setProperty("--my", `${e.clientY - rect.top}px`);
  }

  const colClass = {
    "1": "md:col-span-1",
    "2": "md:col-span-2",
    "3": "md:col-span-3",
    "4": "md:col-span-4",
    "6": "md:col-span-6",
  }[colSpan];

  const rowClass = rowSpan === "2" ? "md:row-span-2" : "";

  return (
    <motion.div
      ref={ref}
      onMouseMove={handleMove}
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "0px 0px -60px 0px" }}
      transition={{
        delay: index * 0.05,
        duration: 0.8,
        ease: [0.16, 1, 0.3, 1],
      }}
      className={cn(
        "liquid-glass rounded-[20px]",
        spotlight && "spotlight spotlight-white",
        colClass,
        rowClass,
        "p-6 md:p-8",
        className,
      )}
    >
      <div className="relative z-10 flex h-full flex-col">{children}</div>
    </motion.div>
  );
}
