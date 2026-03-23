"use client";

interface TableWidgetProps {
  config: { columns?: Array<{ key: string; label: string }> };
  data: unknown;
}

export default function TableWidget({ config, data }: TableWidgetProps) {
  const rows = Array.isArray(data) ? (data as Record<string, unknown>[]) : [];

  if (rows.length === 0) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-xs text-muted-foreground">No data</p>
      </div>
    );
  }

  const columns = config.columns && config.columns.length > 0
    ? config.columns
    : Object.keys(rows[0]).map((key) => ({ key, label: key.replace(/_/g, " ") }));

  return (
    <div className="h-full overflow-auto">
      <table className="w-full text-xs">
        <thead className="sticky top-0" style={{ background: "var(--card-bg, var(--bg-secondary))" }}>
          <tr className="border-b" style={{ borderColor: "var(--border-color)" }}>
            {columns.map((col) => (
              <th
                key={col.key}
                className="px-2.5 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground"
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr
              key={i}
              className="border-b transition-colors last:border-0 hover:bg-accent/5"
              style={{ borderColor: "var(--border-color)" }}
            >
              {columns.map((col) => {
                const val = row[col.key];
                const display = typeof val === "number"
                  ? val.toLocaleString(undefined, { maximumFractionDigits: 2 })
                  : String(val ?? "");
                return (
                  <td key={col.key} className="px-2.5 py-2 text-foreground">
                    {display}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
