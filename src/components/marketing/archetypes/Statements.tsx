"use client";

import { cn } from "@/lib/utils";
import type { ReactNode, MouseEvent } from "react";
import { useRef } from "react";
import { motion, useReducedMotion } from "framer-motion";

/**
 * Full-bleed statement — edge to edge, dark band, oversized.
 * Includes a cursor-follow spotlight over the dark surface.
 */
export function FullBleedStatement({
  eyebrow,
  children,
  submeta,
  className,
  invert = true,
}: {
  eyebrow?: string;
  children: ReactNode;
  submeta?: ReactNode;
  className?: string;
  invert?: boolean;
}) {
  const ref = useRef<HTMLElement>(null);
  const reduced = useReducedMotion();

  function handleMove(e: MouseEvent<HTMLElement>) {
    if (!ref.current || reduced) return;
    const rect = ref.current.getBoundingClientRect();
    ref.current.style.setProperty("--sx", `${e.clientX - rect.left}px`);
    ref.current.style.setProperty("--sy", `${e.clientY - rect.top}px`);
  }

  return (
    <section
      ref={ref}
      onMouseMove={handleMove}
      className={cn(
        "relative px-6 py-32 md:px-12 md:py-48",
        invert && "text-white",
        className,
      )}
      style={invert ? {
        background: "linear-gradient(180deg, var(--m-bg, #f6f5f1) 0%, #0a0a0a 12%, #0a0a0a 88%, var(--m-bg, #f6f5f1) 100%)",
      } : undefined}
    >
      {/* Cursor-follow spotlight — uses mask to feather edges */}
      {invert && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(600px circle at var(--sx, 50%) var(--sy, 40%), rgba(20, 181, 142, 0.12), transparent 50%)",
            mask: "linear-gradient(180deg, transparent 0%, black 15%, black 85%, transparent 100%)",
            WebkitMask: "linear-gradient(180deg, transparent 0%, black 15%, black 85%, transparent 100%)",
          }}
        />
      )}
      <div className="noise" />
      <div className="relative z-10 mx-auto max-w-5xl">
        {eyebrow && (
          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="mono-label mb-8"
            style={{ color: invert ? "rgba(255,255,255,0.55)" : undefined }}
          >
            {eyebrow}
          </motion.p>
        )}
        <motion.h2
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "0px 0px -80px 0px" }}
          transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
          className="display-2xl"
          style={{
            textWrap: "balance" as never,
            color: invert ? "#ffffff" : undefined,
          }}
        >
          {children}
        </motion.h2>
        {submeta && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2, duration: 0.8 }}
            className="mt-10 max-w-xl text-lg"
            style={{ color: invert ? "rgba(255,255,255,0.7)" : undefined }}
          >
            {submeta}
          </motion.div>
        )}
      </div>
    </section>
  );
}

/**
 * Centered display statement — a single oversized moment. For final CTA, section breaks.
 */
export function DisplayStatement({
  eyebrow,
  children,
  submeta,
  actions,
  className,
}: {
  eyebrow?: string;
  children: ReactNode;
  submeta?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "relative px-6 py-32 md:px-12 md:py-40",
        className,
      )}
    >
      <div className="mx-auto max-w-5xl text-center">
        {eyebrow && (
          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="mono-label mb-8"
          >
            {eyebrow}
          </motion.p>
        )}
        <motion.h2
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "0px 0px -80px 0px" }}
          transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
          className="display-2xl text-[color:var(--m-text)]"
          style={{ textWrap: "balance" as never }}
        >
          {children}
        </motion.h2>
        {submeta && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2, duration: 0.8 }}
            className="mx-auto mt-8 max-w-xl text-lg text-[color:var(--m-text-secondary)]"
          >
            {submeta}
          </motion.div>
        )}
        {actions && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.3, duration: 0.8 }}
            className="mt-12 flex flex-wrap items-center justify-center gap-3"
          >
            {actions}
          </motion.div>
        )}
      </div>
    </section>
  );
}
