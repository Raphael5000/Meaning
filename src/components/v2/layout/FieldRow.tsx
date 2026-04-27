import * as React from "react";

import { cn } from "@/lib/utils";

interface FieldRowProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Label shown in the left column (muted). */
  label: React.ReactNode;
  /** Value shown in the middle column. Accepts plain text or JSX. */
  value: React.ReactNode;
  /**
   * Right-aligned action — typically a small `<Button variant="ghost">`
   * or a `<Switch />`/`<Badge />`.
   */
  action?: React.ReactNode;
  /** Drops the bottom border. Use on the last row of a Section. */
  last?: boolean;
}

/**
 * Settings-style row: 3-column grid (label | value | action) with a
 * hairline border-bottom between rows. Used inside a `<Section />`.
 */
const FieldRow = React.forwardRef<HTMLDivElement, FieldRowProps>(
  ({ className, label, value, action, last, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "grid grid-cols-[180px_1fr_auto] items-center gap-4 py-3.5",
        !last && "border-b border-border",
        className,
      )}
      {...props}
    >
      <div className="text-[12.5px] text-muted-foreground">{label}</div>
      <div className="text-[13px] text-foreground">{value}</div>
      <div className="flex items-center justify-end">{action}</div>
    </div>
  ),
);
FieldRow.displayName = "FieldRow";

export { FieldRow };
