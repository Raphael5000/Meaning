"use client";

import { useState, useMemo } from "react";
import Image from "next/image";

interface TableWidgetProps {
  config: { columns?: Array<{ key: string; label: string }> };
  data: unknown;
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

export default function TableWidget({ config, data }: TableWidgetProps) {
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const rows = useMemo(
    () => (Array.isArray(data) ? (data as Record<string, unknown>[]).map(unwrapRow) : []),
    [data]
  );

  const dataKeys = useMemo(() => (rows.length > 0 ? new Set(Object.keys(rows[0])) : new Set<string>()), [rows]);

  const columns = useMemo(() => {
    const configColumnsMatch = config.columns && config.columns.length > 0
      && config.columns.some((c) => dataKeys.has(c.key));
    return configColumnsMatch
      ? config.columns!
      : (rows.length > 0 ? Object.keys(rows[0]) : []).map((key) => ({ key, label: key.replace(/_/g, " ") }));
  }, [config.columns, dataKeys, rows]);

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
      <table className="w-full text-xs">
        <thead className="sticky top-0" style={{ background: "var(--table-header-bg)" }}>
          <tr className="border-b" style={{ borderColor: "var(--border-color)" }}>
            {columns.map((col) => (
              <th
                key={col.key}
                onClick={() => handleSort(col.key)}
                className={`cursor-pointer select-none px-3 py-2 font-semibold text-muted-foreground capitalize transition-colors hover:text-foreground ${numericCols.has(col.key) ? "text-right" : "text-left"}`}
              >
                <span className={`inline-flex items-center gap-1 ${numericCols.has(col.key) ? "flex-row-reverse" : ""}`}>
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
              {columns.map((col) => {
                const val = row[col.key];
                const isNum = numericCols.has(col.key);
                let display: string;

                if (typeof val === "number") {
                  display = val.toLocaleString(undefined, { maximumFractionDigits: 2 });
                } else {
                  const s = String(val ?? "");
                  display = s.replace(/^https?:\/\//, "").replace(/\/$/, "") || s;
                }

                // Check if this cell should show a platform icon
                const isSourceCol = SOURCE_COLUMNS.has(col.key.toLowerCase());
                const icon = isSourceCol && typeof val === "string" ? matchPlatformIcon(val) : null;

                return (
                  <td
                    key={col.key}
                    className={`px-3 py-2.5 text-foreground ${isNum ? "text-right font-medium tabular-nums" : "text-left"}`}
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
