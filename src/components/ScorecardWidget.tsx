"use client";

interface ScorecardWidgetProps {
  config: { label?: string; value?: string; format?: string };
  data: unknown;
}

export default function ScorecardWidget({ config, data }: ScorecardWidgetProps) {
  // If config has a static value (from AI generation), use it
  // Otherwise extract from cached data
  let value: string | number = config.value ?? "—";

  if (Array.isArray(data) && data.length > 0) {
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

  return (
    <div className="flex h-full flex-col items-center justify-center gap-1">
      <p className="text-4xl font-bold tracking-tight" style={{ color: "var(--accent)" }}>
        {formatted}
      </p>
      {config.label && (
        <p className="text-xs font-medium text-muted-foreground">{config.label}</p>
      )}
    </div>
  );
}
