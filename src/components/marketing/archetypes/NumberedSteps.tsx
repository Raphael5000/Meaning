"use client";

import { motion } from "framer-motion";
import { MonoLabel } from "@/components/marketing/system/MonoLabel";

export type Step = {
  number: string;
  label: string;
  title: string;
  description: string;
};

export function NumberedSteps({ steps }: { steps: Step[] }) {
  return (
    <ol className="flex flex-col">
      {steps.map((s, i) => (
        <motion.li
          key={s.number}
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "0px 0px -60px 0px" }}
          transition={{ delay: i * 0.08, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="hairline-t grid grid-cols-[auto_1fr] gap-6 py-12 md:grid-cols-[auto_1fr_1fr] md:gap-12 md:py-16"
        >
          <span className="mono text-xs tracking-[0.18em] text-[color:var(--brand)]">
            {s.number}
          </span>
          <div>
            <MonoLabel className="mb-3 block">{s.label}</MonoLabel>
            <h3 className="display-md text-[color:var(--m-text)]">{s.title}</h3>
          </div>
          <p className="text-base leading-relaxed text-[color:var(--m-text-secondary)] md:self-end md:max-w-sm">
            {s.description}
          </p>
        </motion.li>
      ))}
    </ol>
  );
}
