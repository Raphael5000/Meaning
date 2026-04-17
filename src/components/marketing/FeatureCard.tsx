"use client";

import type { MouseEvent } from "react";

export function FeatureCard({
  icon,
  title,
  description,
}: {
  icon?: React.ReactNode;
  title: string;
  description: string;
}) {
  function handleMouseMove(e: MouseEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    e.currentTarget.style.setProperty("--mx", `${e.clientX - rect.left}px`);
    e.currentTarget.style.setProperty("--my", `${e.clientY - rect.top}px`);
  }

  return (
    <div
      className="liquid-glass spotlight relative h-full overflow-hidden rounded-2xl p-6"
      onMouseMove={handleMouseMove}
    >
      <span className="liquid-glass-shimmer" aria-hidden />
      <div className="relative z-10">
        {icon && (
          <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-[color:var(--brand-soft)] text-[color:var(--brand)]">
            {icon}
          </div>
        )}
        <h3 className="mb-2 text-lg font-semibold text-[color:var(--m-text)]">
          {title}
        </h3>
        <p className="text-sm leading-relaxed text-[color:var(--m-text-secondary)]">
          {description}
        </p>
      </div>
    </div>
  );
}
