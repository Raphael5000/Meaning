import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Outermost wrapper for an app page (alerts, dashboards, connections,
 * settings, etc.). Renders a vertical flex column at full height of its
 * parent — typically slotted into ChatV2's panel area or a Next.js
 * route's layout.
 *
 * Compose with `<PageHeader />` at the top and `<PageBody />` for the
 * scrollable content below.
 */
const Page = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "flex h-full min-h-0 w-full flex-col bg-background text-foreground",
      className,
    )}
    {...props}
  />
));
Page.displayName = "Page";

interface PageBodyProps extends React.HTMLAttributes<HTMLElement> {
  /**
   * Centers the inner content at a fixed max-width — used by Settings (880),
   * Alerts/Connections (1080), Dashboards (1280). Pass `none` for
   * full-bleed pages (chat).
   */
  contained?: "narrow" | "default" | "wide" | "none";
  /**
   * Standard page padding (24px). Pass `tight` for denser pages,
   * `none` if the page wants to manage its own padding.
   */
  padding?: "default" | "tight" | "none";
}

const containedSize = {
  narrow: "max-w-[880px]",
  default: "max-w-[1080px]",
  wide: "max-w-[1280px]",
  none: "",
} as const;

const paddingSize = {
  default: "p-6",
  tight: "p-4",
  none: "",
} as const;

/**
 * Scrollable main area of a page. Sits below `<PageHeader />`. The
 * `contained` prop sets a centered max-width so list/settings pages
 * line up with the design.
 */
const PageBody = React.forwardRef<HTMLElement, PageBodyProps>(
  (
    {
      className,
      contained = "default",
      padding = "default",
      children,
      ...props
    },
    ref,
  ) => (
    <main
      ref={ref}
      className={cn(
        "relative flex-1 overflow-auto",
        paddingSize[padding],
        className,
      )}
      {...props}
    >
      {contained === "none" ? (
        children
      ) : (
        <div className={cn("mx-auto w-full", containedSize[contained])}>
          {children}
        </div>
      )}
    </main>
  ),
);
PageBody.displayName = "PageBody";

export { Page, PageBody };
