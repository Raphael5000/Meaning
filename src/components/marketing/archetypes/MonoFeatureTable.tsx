"use client";

import { Check, Minus } from "lucide-react";
import { motion } from "framer-motion";

export type MonoTableRow = {
  label: string;
  left: boolean;
  right: boolean;
};

export function MonoFeatureTable({
  rows,
  leftHeader = "Dashboards",
  rightHeader = "Meaning",
}: {
  rows: MonoTableRow[];
  leftHeader?: string;
  rightHeader?: string;
}) {
  return (
    <div className="w-full">
      <div className="hairline-b grid grid-cols-[1.6fr_1fr_1fr] gap-4 pb-4">
        <span className="mono-label">Capability</span>
        <span className="mono-label text-center">{leftHeader}</span>
        <span className="mono-label text-center text-[color:var(--brand)]">
          {rightHeader}
        </span>
      </div>
      {rows.map((row, i) => (
        <motion.div
          key={row.label}
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "0px 0px -40px 0px" }}
          transition={{ delay: i * 0.03, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="hairline-b grid grid-cols-[1.6fr_1fr_1fr] items-center gap-4 py-5"
        >
          <span className="text-base text-[color:var(--m-text)]">
            {row.label}
          </span>
          <span className="flex justify-center">
            {row.left ? (
              <Check className="h-4 w-4 text-[color:var(--m-text-muted)]" />
            ) : (
              <Minus className="h-4 w-4 text-[color:var(--m-text-muted)]" />
            )}
          </span>
          <span className="flex justify-center">
            {row.right ? (
              <Check className="h-4 w-4 text-[color:var(--brand)]" />
            ) : (
              <Minus className="h-4 w-4 text-[color:var(--m-text-muted)]" />
            )}
          </span>
        </motion.div>
      ))}
    </div>
  );
}
