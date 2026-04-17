import { Check, X, Minus } from "lucide-react";

export type ComparisonCell = boolean | "partial" | string;

export type ComparisonRowData = {
  label: string;
  competitor: ComparisonCell;
  meaning: ComparisonCell;
  note?: string;
};

export type ComparisonSectionData = {
  title: string;
  rows: ComparisonRowData[];
};

function renderCell(value: ComparisonCell, highlight: boolean) {
  if (value === true) {
    return (
      <Check
        className="h-4 w-4"
        style={{ color: highlight ? "var(--brand)" : "var(--m-text-muted)" }}
      />
    );
  }
  if (value === false) {
    return <X className="h-4 w-4 text-[color:var(--m-text-muted)]" />;
  }
  if (value === "partial") {
    return <Minus className="h-4 w-4 text-[color:var(--m-text-muted)]" />;
  }
  return (
    <span
      className="text-xs"
      style={{ color: highlight ? "var(--brand)" : "var(--m-text-secondary)" }}
    >
      {value}
    </span>
  );
}

export function ComparisonTable({
  sections,
  competitorName,
}: {
  sections: ComparisonSectionData[];
  competitorName: string;
}) {
  return (
    <div className="liquid-glass relative overflow-hidden rounded-2xl">
      <span className="liquid-glass-shimmer" aria-hidden />

      {/* Header */}
      <div
        className="relative z-10 grid grid-cols-[1.6fr_1fr_1fr] items-center gap-4 px-6 py-4"
        style={{
          borderBottom: "1px solid var(--m-hairline)",
          background: "var(--m-surface-elevated)",
        }}
      >
        <span className="mono-label">Feature</span>
        <span className="mono-label text-center">{competitorName}</span>
        <span className="mono-label text-center text-[color:var(--brand)]">
          Meaning
        </span>
      </div>

      {sections.map((section, si) => (
        <div key={section.title} className="relative z-10">
          <div
            className="px-6 py-3"
            style={{
              background: "var(--m-surface-elevated)",
              borderBottom: "1px solid var(--m-hairline)",
              borderTop: si === 0 ? "none" : "1px solid var(--m-hairline)",
            }}
          >
            <p className="text-[11px] font-semibold uppercase tracking-wide text-[color:var(--m-text)]">
              {section.title}
            </p>
          </div>
          {section.rows.map((row, ri) => (
            <div
              key={row.label}
              className="grid grid-cols-[1.6fr_1fr_1fr] items-start gap-4 px-6 py-4"
              style={{
                borderBottom:
                  si === sections.length - 1 && ri === section.rows.length - 1
                    ? "none"
                    : "1px solid var(--m-hairline)",
              }}
            >
              <div>
                <p className="text-sm text-[color:var(--m-text)]">
                  {row.label}
                </p>
                {row.note && (
                  <p className="mt-0.5 text-xs text-[color:var(--m-text-muted)]">
                    {row.note}
                  </p>
                )}
              </div>
              <div className="flex justify-center pt-0.5">
                {renderCell(row.competitor, false)}
              </div>
              <div className="flex justify-center pt-0.5">
                {renderCell(row.meaning, true)}
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
