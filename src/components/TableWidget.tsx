"use client";

interface TableWidgetProps {
  config: { columns?: Array<{ key: string; label: string }> };
  data: unknown;
}

// Unwrap BigQuery value objects: {value: "x"} → "x"
function unwrapRow(row: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(row)) {
    if (v && typeof v === "object" && !Array.isArray(v) && "value" in (v as Record<string, unknown>)) {
      out[k] = (v as Record<string, unknown>).value;
    } else {
      out[k] = v;
    }
  }
  return out;
}

export default function TableWidget({ config, data }: TableWidgetProps) {
  const rows = Array.isArray(data) ? (data as Record<string, unknown>[]).map(unwrapRow) : [];

  if (rows.length === 0) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-xs text-muted-foreground">No data</p>
      </div>
    );
  }

  const dataKeys = new Set(Object.keys(rows[0]));
  const configColumnsMatch = config.columns && config.columns.length > 0
    && config.columns.some((c) => dataKeys.has(c.key));
  const columns = configColumnsMatch
    ? config.columns!
    : Object.keys(rows[0]).map((key) => ({ key, label: key.replace(/_/g, " ") }));

  // Detect which columns are numeric vs text for alignment
  const numericCols = new Set<string>();
  for (const col of columns) {
    if (rows.some((r) => typeof r[col.key] === "number")) {
      numericCols.add(col.key);
    }
  }

  return (
    <div className="h-full overflow-auto">
      <table className="w-full text-xs">
        <tbody>
          {rows.map((row, i) => (
            <tr
              key={i}
              className="border-b transition-colors last:border-0 hover:bg-accent/5"
              style={{ borderColor: "var(--border-color)" }}
            >
              {columns.map((col) => {
                const val = row[col.key];
                const isNum = numericCols.has(col.key);
                let display: string;

                if (typeof val === "number") {
                  display = val.toLocaleString(undefined, { maximumFractionDigits: 2 });
                } else {
                  const s = String(val ?? "");
                  // Clean up URLs: strip protocol but keep the path
                  display = s.replace(/^https?:\/\//, "").replace(/\/$/, "") || s;
                }

                return (
                  <td
                    key={col.key}
                    className={`px-3 py-2.5 text-foreground ${isNum ? "text-right font-medium tabular-nums" : "text-left"}`}
                    title={typeof val === "string" ? val : undefined}
                  >
                    <span className={isNum ? "" : "block truncate"} style={{ maxWidth: isNum ? undefined : 280 }}>
                      {display || "—"}
                    </span>
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
