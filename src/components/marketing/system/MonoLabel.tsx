import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

export function MonoLabel({
  children,
  className,
  tone = "muted",
}: {
  children: ReactNode;
  className?: string;
  tone?: "muted" | "brand" | "primary";
}) {
  return (
    <span
      className={cn(
        "mono-label",
        tone === "brand" && "text-[color:var(--brand)]",
        tone === "primary" && "text-[color:var(--m-text)]",
        className,
      )}
    >
      {children}
    </span>
  );
}

/**
 * Glowing pill eyebrow — used for hero and section headings.
 * Replaces MonoLabel tone="brand" in prominent positions.
 */
export function GlowPill({
  children,
  className,
  dot = true,
}: {
  children: ReactNode;
  className?: string;
  dot?: boolean;
}) {
  return (
    <span className={cn("glow-pill", className)}>
      {dot && <span className="glow-pill-dot" aria-hidden />}
      {children}
    </span>
  );
}

export function SectionMarker({
  number,
  label,
  className,
}: {
  number: string; // "01"
  label: string; // "CHAT"
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-3",
        className,
      )}
    >
      <span className="mono text-[color:var(--brand)] text-xs tracking-[0.18em]">
        {number}
      </span>
      <span className="h-px w-8 bg-[color:var(--m-hairline-strong)]" />
      <span className="mono-label">{label}</span>
    </div>
  );
}
