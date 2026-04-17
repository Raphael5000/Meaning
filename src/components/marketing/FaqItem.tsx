"use client";

import { useState } from "react";

export function FaqItem({
  question,
  answer,
}: {
  question: string;
  answer: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div
      className="liquid-glass relative cursor-pointer overflow-hidden rounded-2xl transition-all duration-300"
      onClick={() => setOpen(!open)}
    >
      <div className="relative z-10">
        <div className="flex items-center justify-between px-6 py-5">
          <span className="text-base font-medium text-[color:var(--m-text-secondary)] md:text-lg">
            {question}
          </span>
          <span
            className="ml-4 flex h-8 w-8 shrink-0 items-center justify-center text-xl text-[color:var(--m-text-muted)] transition-transform duration-300"
            style={{
              transform: open ? "rotate(45deg)" : "rotate(0deg)",
            }}
          >
            +
          </span>
        </div>
        <div
          className="transition-all duration-300 ease-in-out"
          style={{
            maxHeight: open ? "400px" : "0",
            opacity: open ? 1 : 0,
          }}
        >
          <p className="px-6 pb-5 text-sm leading-relaxed text-[color:var(--m-text-muted)]">
            {answer}
          </p>
        </div>
      </div>
    </div>
  );
}
