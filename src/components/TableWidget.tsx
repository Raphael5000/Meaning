"use client";

import { useState, useMemo } from "react";
import Image from "next/image";

interface TableWidgetProps {
  config: { columns?: Array<{ key: string; label: string }> };
  data: unknown;
  currencySymbol?: string;
  onUpdateColumns?: (columns: Array<{ key: string; label: string }>) => void;
}

// Platform icon mapping — matches source/channel values to SVG icons
const PLATFORM_ICONS: Record<string, { src: string; label: string }> = {
  // Google Analytics / GA4
  "google": { src: "/Google Analytics.svg", label: "Google" },
  "google / organic": { src: "/Google Analytics.svg", label: "Google" },
  "google / cpc": { src: "/Google Ads.svg", label: "Google Ads" },
  // Google Ads
  "google ads": { src: "/Google Ads.svg", label: "Google Ads" },
  "paid search": { src: "/Google Ads.svg", label: "Paid Search" },
  // Microsoft / Bing
  "bing": { src: "/Microsoft Ads.svg", label: "Bing" },
  "bing / organic": { src: "/Microsoft Ads.svg", label: "Bing" },
  "bing / cpc": { src: "/Microsoft Ads.svg", label: "Microsoft Ads" },
  "microsoft ads": { src: "/Microsoft Ads.svg", label: "Microsoft Ads" },
  "microsoft": { src: "/Microsoft Ads.svg", label: "Microsoft" },
  // LinkedIn
  "linkedin": { src: "/Linkedin.svg", label: "LinkedIn" },
  "linkedin.com": { src: "/Linkedin.svg", label: "LinkedIn" },
  "l.linkedin.com": { src: "/Linkedin.svg", label: "LinkedIn" },
  // Mailchimp
  "mailchimp": { src: "/Mailchimp.svg", label: "Mailchimp" },
  // Search Console
  "search console": { src: "/Search Console.svg", label: "Search Console" },
  "organic search": { src: "/Search Console.svg", label: "Organic Search" },
  // Ahrefs
  "ahrefs": { src: "/Ahrefs.svg", label: "Ahrefs" },
  // Meta
  "facebook": { src: "/Meta.svg", label: "Facebook" },
  "facebook.com": { src: "/Meta.svg", label: "Facebook" },
  "l.facebook.com": { src: "/Meta.svg", label: "Facebook" },
  "instagram": { src: "/Meta.svg", label: "Instagram" },
  "instagram.com": { src: "/Meta.svg", label: "Instagram" },
  "meta": { src: "/Meta.svg", label: "Meta" },
  // Common channels
  "email": { src: "/Mailchimp.svg", label: "Email" },
};

// Columns that likely contain source/platform values
const SOURCE_COLUMNS = new Set([
  "source", "medium", "source_medium", "session_source", "session_medium",
  "session_default_channel_group", "channel_group", "channel", "default_channel_group",
  "platform", "source_platform", "referrer", "domain",
]);

function matchPlatformIcon(value: string): { src: string; label: string } | null {
  const lower = value.toLowerCase().trim();
  // Exact match
  if (PLATFORM_ICONS[lower]) return PLATFORM_ICONS[lower];
  // Partial match — check if value contains a known platform name
  for (const [key, icon] of Object.entries(PLATFORM_ICONS)) {
    if (lower.includes(key) || key.includes(lower)) return icon;
  }
  return null;
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

type SortDir = "asc" | "desc";

// Columns that represent monetary values
const MONEY_COLUMNS = /^(cost|spend|revenue|cpc|cpa|cpm|cpv|cpl|budget|price|amount|total_cost|total_spend|conversions_value)/i;

export default function TableWidget({ config, data, currencySymbol = "", onUpdateColumns }: TableWidgetProps) {
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [editingCol, setEditingCol] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState("");
  const [labelOverrides, setLabelOverrides] = useState<Record<string, string>>({});

  const rows = useMemo(
    () => (Array.isArray(data) ? (data as Record<string, unknown>[]).map(unwrapRow) : []),
    [data]
  );

  const dataKeys = useMemo(() => (rows.length > 0 ? new Set(Object.keys(rows[0])) : new Set<string>()), [rows]);

  const baseColumns = useMemo(() => {
    const configColumnsMatch = config.columns && config.columns.length > 0
      && config.columns.some((c) => dataKeys.has(c.key));
    if (configColumnsMatch) return config.columns!;

    // Auto-generate columns: put text/name/label columns first, then numeric
    const allKeys = rows.length > 0 ? Object.keys(rows[0]) : [];
    const textKeys: string[] = [];
    const numKeys: string[] = [];
    for (const key of allKeys) {
      const isNum = rows.some((r) => {
        const v = r[key];
        return typeof v === "number" || (typeof v === "string" && v !== "" && /^-?\d[\d,]*\.?\d*$/.test(v.trim()));
      });
      if (isNum) numKeys.push(key);
      else textKeys.push(key);
    }
    return [...textKeys, ...numKeys].map((key) => ({
      key,
      label: key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
    }));
  }, [config.columns, dataKeys, rows]);

  // Apply local label overrides on top of base columns
  const columns = useMemo(() =>
    baseColumns.map((c) => labelOverrides[c.key] ? { ...c, label: labelOverrides[c.key] } : c),
    [baseColumns, labelOverrides]
  );

  const numericCols = useMemo(() => {
    const s = new Set<string>();
    for (const col of columns) {
      if (rows.some((r) => {
        const v = r[col.key];
        return typeof v === "number" || (typeof v === "string" && v !== "" && !isNaN(Number(v)));
      })) {
        s.add(col.key);
      }
    }
    return s;
  }, [columns, rows]);

  // Detect change/percent columns for color coding
  const changeCols = useMemo(() => {
    const s = new Set<string>();
    for (const col of columns) {
      const k = col.key.toLowerCase();
      if (k.includes("change") || k.includes("delta") || k.includes("diff") ||
          (k.includes("percent") && !k.includes("ctr") && !k.includes("rate"))) {
        s.add(col.key);
      }
    }
    return s;
  }, [columns]);

  const sortedRows = useMemo(() => {
    if (!sortKey) return rows;
    const isNum = numericCols.has(sortKey);
    return [...rows].sort((a, b) => {
      let av = a[sortKey];
      let bv = b[sortKey];
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      let cmp: number;
      if (isNum) {
        cmp = Number(av) - Number(bv);
      } else {
        cmp = String(av).localeCompare(String(bv));
      }
      return sortDir === "desc" ? -cmp : cmp;
    });
  }, [rows, sortKey, sortDir, numericCols]);

  function handleSort(key: string) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir(numericCols.has(key) ? "desc" : "asc");
    }
  }

  if (rows.length === 0) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-xs text-muted-foreground">No data</p>
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto">
      <table className="w-full text-xs" style={{ tableLayout: "fixed" }}>
        <thead className="sticky top-0" style={{ background: "var(--table-header-bg)" }}>
          <tr className="border-b" style={{ borderColor: "var(--border-color)" }}>
            {columns.map((col, ci) => (
              <th
                key={col.key}
                className={`select-none px-3 py-2 font-semibold text-muted-foreground capitalize ${ci === 0 ? "text-left" : "text-right"}`}
              >
                {editingCol === col.key ? (
                  <input
                    autoFocus
                    value={editDraft}
                    onChange={(e) => setEditDraft(e.target.value)}
                    onBlur={() => {
                      const trimmed = editDraft.trim();
                      if (trimmed) {
                        setLabelOverrides((prev) => ({ ...prev, [col.key]: trimmed }));
                        if (onUpdateColumns) {
                          const updated = columns.map((c) => c.key === col.key ? { ...c, label: trimmed } : c);
                          onUpdateColumns(updated);
                        }
                      }
                      setEditingCol(null);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                      if (e.key === "Escape") setEditingCol(null);
                    }}
                    className={`w-full rounded border border-border bg-transparent px-1 py-0 text-xs font-semibold text-foreground outline-none focus:border-[var(--accent)] ${ci === 0 ? "text-left" : "text-right"}`}
                  />
                ) : (
                  <span
                    className={`inline-flex cursor-pointer items-center gap-1 transition-colors hover:text-foreground ${ci === 0 ? "" : "flex-row-reverse"}`}
                    onClick={() => handleSort(col.key)}
                    onDoubleClick={() => { setEditingCol(col.key); setEditDraft(col.label); }}
                    title="Click to sort, double-click to rename"
                  >
                    {col.label}
                    <svg
                      width="10"
                      height="10"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      style={{ opacity: sortKey === col.key ? 0.7 : 0.25 }}
                    >
                      {sortKey === col.key && sortDir === "asc"
                        ? <polyline points="18 15 12 9 6 15" />
                        : <polyline points="6 9 12 15 18 9" />}
                    </svg>
                  </span>
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sortedRows.map((row, i) => (
            <tr
              key={i}
              className="border-b transition-colors last:border-0 hover:bg-accent/5"
              style={{ borderColor: "var(--border-color)" }}
            >
              {columns.map((col, ci) => {
                const val = row[col.key];
                const isNum = numericCols.has(col.key);
                const isChange = changeCols.has(col.key);
                const alignRight = ci > 0;
                let display: string;

                if (typeof val === "number" || (typeof val === "string" && val !== "" && /^-?\d[\d,]*\.?\d*$/.test(val.trim()))) {
                  const num = typeof val === "number" ? val : parseFloat(val.replace(/,/g, ""));
                  const k = col.key.toLowerCase();
                  const isMoney = MONEY_COLUMNS.test(col.key);
                  if (k.includes("percent") || k.includes("change") || k.includes("delta")) {
                    display = `${num > 0 ? "+" : ""}${num.toLocaleString("en-US", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;
                  } else if (k.includes("ctr") || k.includes("rate")) {
                    display = `${num.toLocaleString("en-US", { minimumFractionDigits: 1, maximumFractionDigits: 2 })}%`;
                  } else if (isMoney) {
                    display = `${currencySymbol}${num.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
                  } else if (Number.isInteger(num)) {
                    display = num.toLocaleString("en-US");
                  } else {
                    display = num.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                  }
                } else if (typeof val === "string" && val.includes("%")) {
                  display = val;
                } else {
                  const s = String(val ?? "");
                  display = s.replace(/^https?:\/\//, "").replace(/\/$/, "") || s;
                }

                // Determine color for change columns
                let changeColor = "";
                if (isChange) {
                  const numVal = typeof val === "number" ? val : parseFloat(String(val ?? "").replace(/[^0-9.\-]/g, ""));
                  if (!isNaN(numVal) && numVal > 0) changeColor = "text-emerald-600";
                  else if (!isNaN(numVal) && numVal < 0) changeColor = "text-red-500";
                }

                // Check if this cell should show a platform icon
                const isSourceCol = SOURCE_COLUMNS.has(col.key.toLowerCase());
                const icon = isSourceCol && typeof val === "string" ? matchPlatformIcon(val) : null;

                return (
                  <td
                    key={col.key}
                    className={`px-3 py-2.5 ${isChange ? `font-semibold ${changeColor || "text-muted-foreground"}` : "text-foreground"} ${alignRight ? "text-right tabular-nums" : "text-left"} ${isNum ? "font-medium" : ""}`}
                    title={typeof val === "string" ? val : undefined}
                  >
                    {icon ? (
                      <span className="inline-flex items-center gap-2">
                        <Image
                          src={icon.src}
                          alt={icon.label}
                          width={16}
                          height={16}
                          className="h-4 w-4 shrink-0 object-contain"
                        />
                        <span className="truncate" style={{ maxWidth: 260 }}>
                          {display || "—"}
                        </span>
                      </span>
                    ) : (
                      <span className={isNum ? "" : "block truncate"} style={{ maxWidth: isNum ? undefined : 280 }}>
                        {display || "—"}
                      </span>
                    )}
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
