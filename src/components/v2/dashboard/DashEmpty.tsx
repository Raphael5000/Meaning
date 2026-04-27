"use client";

import * as React from "react";
import { Grid, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";

interface DashEmptyProps {
  title?: string;
  description?: string;
  cta?: string;
  onCta?: () => void;
}

/**
 * Empty state shown inside DashboardPanel when the dashboard has no
 * widgets yet. Centered card on the page body — sits between DashHeader
 * and the would-be widget grid.
 */
export function DashEmpty({
  title = "A blank dashboard.",
  description = "Describe the widgets you want and Meaning will query your sources, pick the chart type, and lay them out. Add as many as you like — you can rearrange them anytime.",
  cta = "Describe a widget",
  onCta,
}: DashEmptyProps) {
  return (
    <div className="flex min-h-[360px] flex-1 items-center justify-center p-10">
      <div className="w-full max-w-[460px] rounded-lg border border-border bg-card px-6 py-12 text-center">
        <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-lg border border-border bg-muted text-muted-foreground">
          <Grid className="size-6" strokeWidth={1.5} />
        </div>
        <h2 className="mb-1.5 text-[18px] font-semibold tracking-[-0.015em] text-foreground">
          {title}
        </h2>
        <p className="mb-6 text-[13px] leading-[1.55] text-muted-foreground">
          {description}
        </p>
        {onCta && (
          <Button onClick={onCta}>
            <Sparkles className="size-3.5" />
            {cta}
          </Button>
        )}
      </div>
    </div>
  );
}
