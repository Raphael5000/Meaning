import { Check, X } from "lucide-react";

export function ComparisonRow({
  rows,
  leftLabel = "Traditional dashboards",
  rightLabel = "Meaning",
}: {
  rows: { label: string; left: boolean; right: boolean }[];
  leftLabel?: string;
  rightLabel?: string;
}) {
  return (
    <div className="liquid-glass relative overflow-hidden rounded-2xl">
      <div
        className="grid grid-cols-[1fr_auto_auto] items-center gap-4 px-6 py-4"
        style={{
          borderBottom: "1px solid var(--m-hairline)",
          background: "var(--m-surface-elevated)",
        }}
      >
        <span />
        <span className="mono-label w-24 text-center">
          {leftLabel}
        </span>
        <span className="mono-label w-24 text-center text-[color:var(--brand)]">
          {rightLabel}
        </span>
      </div>
      {rows.map((row, i) => (
        <div
          key={row.label}
          className="relative z-10 grid grid-cols-[1fr_auto_auto] items-center gap-4 px-6 py-4"
          style={{
            borderBottom:
              i === rows.length - 1 ? "none" : "1px solid var(--m-hairline)",
          }}
        >
          <span className="text-sm text-[color:var(--m-text)]">
            {row.label}
          </span>
          <span className="flex w-24 justify-center">
            {row.left ? (
              <Check className="h-4 w-4 text-[color:var(--m-text-muted)]" />
            ) : (
              <X className="h-4 w-4 text-[color:var(--m-text-muted)]" />
            )}
          </span>
          <span className="flex w-24 justify-center">
            {row.right ? (
              <Check className="h-4 w-4 text-[color:var(--brand)]" />
            ) : (
              <X className="h-4 w-4 text-[color:var(--m-text-muted)]" />
            )}
          </span>
        </div>
      ))}
    </div>
  );
}
