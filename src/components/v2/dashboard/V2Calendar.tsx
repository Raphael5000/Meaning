"use client";

import * as React from "react";
import { Calendar } from "@/components/ui/calendar";

type CalendarProps = React.ComponentProps<typeof Calendar>;

/**
 * Thin wrapper around the shadcn Calendar (react-day-picker) that swaps the
 * v1-themed Tailwind classes for v2 CSS-var-backed equivalents so it looks
 * at home inside the v2 dashboard popover.
 *
 * The shadcn Calendar spreads `...classNames` at the end, so any keys we
 * provide fully replace the v1 defaults rather than append.
 */
export function V2Calendar(props: CalendarProps) {
  return (
    <Calendar
      {...props}
      className="relative p-3 [font-family:var(--v2-font-sans)]"
      classNames={{
        caption_label:
          "text-[13px] font-semibold [color:var(--v2-ink)] [letter-spacing:-0.01em]",
        nav: "flex items-center gap-1",
        button_previous:
          "absolute left-3 top-3 h-7 w-7 inline-flex items-center justify-center rounded-md [color:var(--v2-ink-muted)] hover:[background:var(--v2-surface-2)] hover:[color:var(--v2-ink)] transition-colors z-10",
        button_next:
          "absolute right-3 top-3 h-7 w-7 inline-flex items-center justify-center rounded-md [color:var(--v2-ink-muted)] hover:[background:var(--v2-surface-2)] hover:[color:var(--v2-ink)] transition-colors z-10",
        weekday:
          "w-8 font-medium text-[10px] uppercase tracking-[0.08em] [color:var(--v2-ink-muted)]",
        day: "relative p-0 text-center text-[12.5px] focus-within:relative focus-within:z-20",
        day_button:
          "h-8 w-8 p-0 inline-flex items-center justify-center rounded-md font-normal [color:var(--v2-ink)] hover:[background:var(--v2-surface-2)] transition-colors disabled:opacity-40 disabled:hover:bg-transparent",
        selected:
          "[background:var(--v2-ink)] [color:var(--v2-ink-inverse)] hover:[background:var(--v2-ink)] hover:[color:var(--v2-ink-inverse)] rounded-md",
        range_start:
          "day-range-start [background:var(--v2-ink)] [color:var(--v2-ink-inverse)] rounded-l-md",
        range_end:
          "day-range-end [background:var(--v2-ink)] [color:var(--v2-ink-inverse)] rounded-r-md",
        range_middle: "[background:var(--v2-surface-2)] [color:var(--v2-ink)]",
        today:
          "[box-shadow:inset_0_0_0_1px_var(--v2-line-strong)] rounded-md",
        outside: "day-outside [color:var(--v2-ink-subtle)]",
        disabled: "[color:var(--v2-ink-subtle)] opacity-50",
        hidden: "invisible",
      }}
    />
  );
}
