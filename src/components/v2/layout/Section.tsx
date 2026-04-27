import * as React from "react";

import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface SectionProps
  extends Omit<React.HTMLAttributes<HTMLElement>, "title"> {
  /** Section title rendered as an h3 above the card. */
  title: React.ReactNode;
  /** Optional right-aligned action (e.g. "Edit", "Manage", "Buy more"). */
  action?: React.ReactNode;
  /**
   * Wraps children in a `<Card />` by default. Pass `false` if the
   * children render their own surface (e.g. a `<Table />`).
   */
  wrap?: boolean;
  /** Padding for the wrapping card. */
  padding?: "default" | "tight" | "none";
}

const sectionPadding = {
  default: "px-5 py-1",
  tight: "p-3",
  none: "",
} as const;

/**
 * Settings-style section: a small heading with optional action button on
 * the right, then a `<Card />` containing rows. Children are usually
 * `<FieldRow />` instances or a `<Table />`.
 */
const Section = React.forwardRef<HTMLElement, SectionProps>(
  (
    {
      className,
      title,
      action,
      wrap = true,
      padding = "default",
      children,
      ...props
    },
    ref,
  ) => (
    <section
      ref={ref}
      className={cn("mb-10 last:mb-0", className)}
      {...props}
    >
      <div className="mb-3 flex items-end justify-between gap-3">
        <h3 className="text-[15px] font-semibold tracking-[-0.01em] text-foreground">
          {title}
        </h3>
        {action && <div className="flex items-center gap-2">{action}</div>}
      </div>
      {wrap ? (
        <Card className={cn(sectionPadding[padding])}>{children}</Card>
      ) : (
        children
      )}
    </section>
  ),
);
Section.displayName = "Section";

export { Section };
