"use client";

import { Marquee } from "@/components/marketing/archetypes/Marquee";
import { cn } from "@/lib/utils";

export type TickerItem = {
  source: string;
  text: string;
  value?: string;
};

/**
 * Thin mono ticker strip. Infinite scroll of illustrative query telemetry.
 * Not real data — it's an atmospheric device, like Resend's stacked 200 OK cards.
 */
export function LiveTicker({
  items,
  className,
}: {
  items: TickerItem[];
  className?: string;
}) {
  return (
    <section
      className={cn(
        "hairline-t hairline-b relative overflow-hidden py-5",
        className,
      )}
    >
      <Marquee slow>
        {items.map((item, i) => (
          <div
            key={`${item.source}-${i}`}
            className="flex items-center gap-4 whitespace-nowrap"
          >
            <span className="flex items-center gap-2">
              <span
                className="h-1.5 w-1.5 rounded-full bg-[color:var(--brand)]"
                style={{ boxShadow: "0 0 8px var(--brand-ring)" }}
              />
              <span className="mono text-[10px] tracking-[0.18em] text-[color:var(--brand)]">
                {item.source}
              </span>
            </span>
            <span className="mono text-xs text-[color:var(--m-text-secondary)]">
              {item.text}
            </span>
            {item.value && (
              <span className="mono text-xs font-medium text-[color:var(--m-text)]">
                {item.value}
              </span>
            )}
            <span className="h-3 w-px bg-[color:var(--m-hairline-strong)]" />
          </div>
        ))}
      </Marquee>
    </section>
  );
}
