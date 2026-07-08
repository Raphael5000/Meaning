"use client";

import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface KpiTarget {
  name: string;
  targetValue: number;
  targetDirection: string;
  cachedValue: number | null;
  displayFormat: string;
}

interface ScorecardWidgetProps {
  config: { label?: string; value?: string; change?: string; format?: string; sentiment?: "up_is_good" | "down_is_good" };
  data: unknown;
  kpiTargets?: KpiTarget[];
  widgetTitle?: string;
}

export default function ScorecardWidget({ config, data, kpiTargets, widgetTitle }: ScorecardWidgetProps) {
  // Always use config.value — the refresh endpoint updates displayConfig.value
  // server-side for manual-metrics scorecards. BQ-backed scorecards keep their
  // AI-computed value (e.g. spend/leads) which can't be derived from raw cachedData.
  let value: string | number = config.value || "—";

  // Detect currency prefix from the AI-generated config.value (e.g. "R1,234.56" → "R")
  const currencyPrefix = config.value?.match(/^([A-Z]{1,3}\$?|[R€£¥₹₦₱₩₺₪฿])\s?/)?.[1] ?? "";

  // Smart formatting: no decimals for whole numbers, 2 decimals for fractional
  let formatted: string;
  if (typeof value === "number") {
    const numStr = Number.isInteger(value)
      ? value.toLocaleString("en-US")
      : value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    formatted = currencyPrefix ? `${currencyPrefix}${numStr}` : numStr;
  } else {
    formatted = value;
  }

  const change = config.change;
  const changeNum = parseFloat(change?.replace(/[^0-9.\-+]/g, "") ?? "");
  const isZero = change != null && (changeNum === 0 || isNaN(changeNum));
  const isPositive = !isZero && change?.startsWith("+");
  const isNegative = !isZero && change?.startsWith("-");
  const changeText = isZero ? "0%" : change?.replace(/^[+-]/, "");

  // Determine if the change is good or bad based on sentiment
  const downIsGood = config.sentiment === "down_is_good";
  const isGood = !isZero && (downIsGood ? isNegative : isPositive);
  const isBad = !isZero && (downIsGood ? isPositive : isNegative);

  // Match KPI target to this scorecard using word overlap + synonyms
  const matchedKpi = kpiTargets?.find((kpi) => {
    const stopWords = new Set(["the", "a", "an", "of", "for", "and", "or", "in", "to", "per", "total", "avg", "average", "daily", "weekly", "monthly"]);
    const synonyms: Record<string, string[]> = {
      visits: ["sessions"], sessions: ["visits"],
      users: ["visitors"], visitors: ["users"],
      revenue: ["sales", "income"], sales: ["revenue"], income: ["revenue"],
    };
    const tokenize = (s: string) =>
      s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim().split(/\s+/).filter((w) => !stopWords.has(w) && w.length > 1);
    const expand = (tokens: string[]) => {
      const out = [...tokens];
      for (const t of tokens) { if (synonyms[t]) out.push(...synonyms[t]); }
      return [...new Set(out)];
    };

    const kpiTokens = expand(tokenize(kpi.name));
    const widgetTokens = expand([...new Set([...tokenize(config.label || ""), ...tokenize(widgetTitle || "")])]);

    if (widgetTokens.length === 0 || kpiTokens.length === 0) return false;

    const kpiName = kpi.name.toLowerCase();
    const label = (config.label || widgetTitle || "").toLowerCase();
    if (kpiName.includes(label) || label.includes(kpiName)) return true;

    const overlap = kpiTokens.filter((t) => widgetTokens.some((w) => w.includes(t) || t.includes(w)));
    return overlap.length >= 1;
  });

  // Resolve KPI progress
  const numericValue = typeof value === "number"
    ? value
    : parseFloat(String(value).replace(/[^0-9.\-]/g, ""));
  const hasKpi = matchedKpi && !isNaN(numericValue);
  const onTrack = hasKpi
    ? matchedKpi.targetDirection === "below"
      ? numericValue <= matchedKpi.targetValue
      : numericValue >= matchedKpi.targetValue
    : false;
  const pct = hasKpi && matchedKpi.targetValue !== 0
    ? Math.min(100, (numericValue / matchedKpi.targetValue) * 100)
    : 0;

  return (
    <div className="flex h-full flex-col items-start justify-center gap-1 px-1">
      <p className="text-[20px] font-semibold tracking-tight text-foreground font-mono leading-tight">
        {formatted}
        {hasKpi && (
          <span className="text-[11px] font-normal text-muted-foreground ml-1">
            / {matchedKpi.targetValue.toLocaleString()}
          </span>
        )}
      </p>
      <div className="flex items-center gap-1.5 flex-wrap">
        {change && (() => {
          const Icon = isPositive ? TrendingUp : isNegative ? TrendingDown : Minus;
          const pillClass = isGood
            ? "bg-emerald-500/10 text-emerald-500"
            : isBad
              ? "bg-red-500/10 text-red-500"
              : "bg-muted text-muted-foreground";
          return (
            <span className={`inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 ${pillClass}`}>
              <Icon className="h-2.5 w-2.5" />
              <span className="text-[10px] font-medium">{changeText}</span>
            </span>
          );
        })()}
        {hasKpi && (
          <span className={`inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-medium ${
            onTrack ? "bg-emerald-500/10 text-emerald-500" : "bg-red-500/10 text-red-500"
          }`}>
            {onTrack ? "On track" : "Off track"}
          </span>
        )}
      </div>
      {hasKpi && (
        <div className="w-full mt-0.5">
          <div className="h-1 w-full overflow-hidden rounded-full bg-muted/60">
            <div
              className={`h-full rounded-full ${onTrack ? "bg-emerald-500/70" : "bg-red-500/70"}`}
              style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
