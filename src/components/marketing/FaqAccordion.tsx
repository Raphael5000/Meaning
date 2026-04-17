"use client";

import { useState } from "react";
import { Reveal } from "@/components/marketing/system/Reveal";

function FaqRow({
  question,
  answer,
  isLast,
}: {
  question: string;
  answer: string;
  isLast: boolean;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <div
        className="rounded-xl px-5 py-5 transition-colors hover:bg-[rgba(30,240,180,0.03)] md:px-7 md:py-6"
        role="button"
        tabIndex={0}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setOpen((o) => !o);
          }
        }}
      >
        <div className="flex cursor-pointer items-start justify-between gap-6">
          <span className="text-base text-[color:var(--m-text)] md:text-lg">
            {question}
          </span>
          <span
            className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-sm transition-all duration-300"
            style={{
              background: "rgba(128,128,128,0.08)",
              color: open ? "var(--brand)" : "var(--m-text-muted)",
              transform: open ? "rotate(45deg)" : "rotate(0deg)",
            }}
          >
            +
          </span>
        </div>
        <div
          className="grid transition-[grid-template-rows] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]"
          style={{ gridTemplateRows: open ? "1fr" : "0fr" }}
        >
          <div className="overflow-hidden">
            <p className="pt-3 max-w-2xl text-sm leading-relaxed text-[color:var(--m-text-secondary)] md:text-base">
              {answer}
            </p>
          </div>
        </div>
      </div>
      {!isLast && (
        <div
          className="mx-5 border-b md:mx-7"
          style={{ borderColor: "rgba(128,128,128,0.1)" }}
        />
      )}
    </>
  );
}

export function FaqAccordion({
  faqs,
}: {
  faqs: { question: string; answer: string }[];
}) {
  return (
    <div className="liquid-glass relative overflow-hidden rounded-2xl p-1 md:p-2">
      <span className="liquid-glass-shimmer" aria-hidden />
      {faqs.map((f, i) => (
        <Reveal key={f.question} delay={i * 0.03}>
          <FaqRow
            question={f.question}
            answer={f.answer}
            isLast={i === faqs.length - 1}
          />
        </Reveal>
      ))}
    </div>
  );
}
