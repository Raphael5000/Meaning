const CHART_TYPES = [
  "Bar",
  "Line",
  "Area",
  "Pie",
  "Donut",
  "Scatter",
  "Funnel",
  "Treemap",
  "Sunburst",
  "Heatmap",
  "Geographic Map",
  "Radar",
  "Gauge",
  "Sankey",
];

export function ChartTypeBadges({ types = CHART_TYPES }: { types?: string[] }) {
  return (
    <div className="flex flex-wrap gap-2">
      {types.map((t) => (
        <span
          key={t}
          className="rounded-full px-3 py-1 text-xs font-medium"
          style={{
            background: "var(--m-surface-elevated)",
            color: "var(--m-text-secondary)",
            border: "1px solid var(--m-hairline)",
          }}
        >
          {t}
        </span>
      ))}
    </div>
  );
}
