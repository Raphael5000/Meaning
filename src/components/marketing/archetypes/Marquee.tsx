"use client";

import { cn } from "@/lib/utils";
import type { ReactNode } from "react";
import { Children } from "react";

export function Marquee({
  children,
  className,
  slow = false,
  pauseOnHover = true,
  edgeFade = true,
}: {
  children: ReactNode;
  className?: string;
  slow?: boolean;
  pauseOnHover?: boolean;
  edgeFade?: boolean;
}) {
  // Duplicate children so the loop is seamless.
  const items = Children.toArray(children);

  return (
    <div
      className={cn(
        "relative overflow-hidden",
        pauseOnHover && "marquee-paused",
        edgeFade &&
          "[mask-image:linear-gradient(90deg,transparent,#000_10%,#000_90%,transparent)]",
        className,
      )}
    >
      <div className={cn("marquee", slow && "marquee-slow")}>
        {[...items, ...items].map((child, i) => (
          <div key={i} className="shrink-0 px-6">
            {child}
          </div>
        ))}
      </div>
    </div>
  );
}
