import * as React from "react";
import { ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils";

interface PageHeaderProps
  extends Omit<React.HTMLAttributes<HTMLElement>, "title"> {
  /**
   * Either pass `breadcrumb` (array of segments, last is current) for a
   * deep page, or `title` (single string) for top-level. Both can be
   * passed but `breadcrumb` takes precedence visually.
   */
  breadcrumb?: React.ReactNode[];
  title?: React.ReactNode;
  /**
   * Optional shadcn `<Tabs />` rendered inline next to the title. Used
   * by Settings (Account / Team) and any tabbed page.
   */
  tabs?: React.ReactNode;
  /**
   * Right-aligned slot for buttons, filter pills, etc.
   */
  actions?: React.ReactNode;
}

/**
 * 52px-tall header bar that sits at the top of every app page. Mirrors
 * the design's `<PageHeader />`: breadcrumb-or-title (left) + optional
 * inline tabs + right-aligned actions. Hairline border-bottom separates
 * it from the page body.
 */
const PageHeader = React.forwardRef<HTMLElement, PageHeaderProps>(
  ({ className, breadcrumb, title, tabs, actions, ...props }, ref) => (
    <header
      ref={ref}
      className={cn(
        "flex h-[52px] flex-shrink-0 items-center justify-between gap-4 border-b border-border px-6",
        className,
      )}
      {...props}
    >
      <div className="flex min-w-0 items-center gap-4">
        {breadcrumb && breadcrumb.length > 0 ? (
          <nav
            aria-label="Breadcrumb"
            className="flex min-w-0 items-center gap-1.5 text-[13px]"
          >
            {breadcrumb.map((segment, i) => {
              const isLast = i === breadcrumb.length - 1;
              return (
                <React.Fragment key={i}>
                  {i > 0 && (
                    <ChevronRight
                      className="size-3 text-muted-foreground/70"
                      aria-hidden="true"
                    />
                  )}
                  <span
                    className={cn(
                      "truncate",
                      isLast
                        ? "font-medium text-foreground"
                        : "text-muted-foreground",
                    )}
                  >
                    {segment}
                  </span>
                </React.Fragment>
              );
            })}
          </nav>
        ) : title ? (
          <h1 className="truncate text-[14px] font-medium tracking-[-0.005em] text-foreground">
            {title}
          </h1>
        ) : null}
        {tabs && <div className="flex shrink-0 items-center">{tabs}</div>}
      </div>
      {actions && (
        <div className="flex shrink-0 items-center gap-2">{actions}</div>
      )}
    </header>
  ),
);
PageHeader.displayName = "PageHeader";

export { PageHeader };
