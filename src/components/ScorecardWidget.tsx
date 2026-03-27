"use client";

import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface ScorecardWidgetProps {
  config: { label?: string; value?: string; change?: string; format?: string };
  data: unknown;
}

export default function ScorecardWidget({ config, data }: ScorecardWidgetProps) {
  // Extract value: prefer config.value (from AI scorecard block), fall back to first number in cached data
  let value: string | number = config.value ?? "—";

  if (value === "—" && Array.isArray(data) && data.length > 0) {
    const row = data[0] as Record<string, unknown>;
    const keys = Object.keys(row);
    for (const key of keys) {
      let v = row[key];
      // Unwrap BigQuery value objects
      if (v && typeof v === "object" && !Array.isArray(v) && "value" in (v as Record<string, unknown>)) {
        v = (v as Record<string, unknown>).value;
      }
      if (typeof v === "number") {
        value = v;
        break;
      }
    }
  }

  const formatted = typeof value === "number"
    ? value.toLocaleString(undefined, { maximumFractionDigits: 2 })
    : value;

  // Parse change string like "+12.3%", "-5%", "+1,234"
  const change = config.change;
  const isPositive = change?.startsWith("+");
  const isNegative = change?.startsWith("-");
  const changeText = change?.replace(/^[+-]/, "");

  return (
    <div className="flex h-full flex-col items-start justify-center gap-2 px-2">
      {config.label && (
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {config.label}
        </p>
      )}
      <p className="text-4xl font-bold tracking-tight text-foreground">
        {formatted}
      </p>
      {change && (
        <div className="flex items-center gap-1.5">
          {isPositive ? (
            <div className="flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5">
              <TrendingUp className="h-3 w-3 text-emerald-500" />
              <span className="text-xs font-semibold text-emerald-500">
                {changeText}
              </span>
            </div>
          ) : isNegative ? (
            <div className="flex items-center gap-1 rounded-full bg-red-500/10 px-2 py-0.5">
              <TrendingDown className="h-3 w-3 text-red-500" />
              <span className="text-xs font-semibold text-red-500">
                {changeText}
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-1 rounded-full bg-muted px-2 py-0.5">
              <Minus className="h-3 w-3 text-muted-foreground" />
              <span className="text-xs font-semibold text-muted-foreground">
                {changeText}
              </span>
            </div>
          )}
          <span className="text-[10px] text-muted-foreground">vs previous period</span>
        </div>
      )}
    </div>
  );
}
