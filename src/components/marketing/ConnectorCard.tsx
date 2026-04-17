"use client";

import Image from "next/image";
import type { MouseEvent } from "react";

export function ConnectorCard({
  name,
  description,
  src,
  status,
}: {
  name: string;
  description: string;
  src?: string;
  status?: "live" | "soon";
}) {
  function handleMouseMove(e: MouseEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    e.currentTarget.style.setProperty("--mx", `${e.clientX - rect.left}px`);
    e.currentTarget.style.setProperty("--my", `${e.clientY - rect.top}px`);
  }

  return (
    <div
      className="liquid-glass spotlight relative overflow-hidden rounded-2xl p-6 transition-colors"
      onMouseMove={handleMouseMove}
    >
      <div className="relative z-10">
        <div className="mb-4 flex items-center justify-between">
          {src ? (
            <Image
              src={src}
              alt={name}
              width={36}
              height={36}
              className="h-9 w-9 object-contain"
            />
          ) : (
            <div className="flex h-9 w-9 items-center justify-center rounded-lg text-sm font-bold bg-[color:var(--brand-soft)] text-[color:var(--brand)]">
              {name[0]}
            </div>
          )}
          {status && (
            <span
              className="rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide"
              style={{
                background:
                  status === "live"
                    ? "var(--brand-soft)"
                    : "var(--m-surface-elevated)",
                color:
                  status === "live"
                    ? "var(--brand)"
                    : "var(--m-text-muted)",
                border: "1px solid var(--m-hairline)",
              }}
            >
              {status === "live" ? "Live" : "Soon"}
            </span>
          )}
        </div>
        <h3 className="mb-1 text-base font-semibold text-[color:var(--m-text)]">
          {name}
        </h3>
        <p className="text-sm text-[color:var(--m-text-muted)]">
          {description}
        </p>
      </div>
    </div>
  );
}
