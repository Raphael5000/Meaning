"use client";

import * as React from "react";
import { I } from "../icons";
import { EmptyState } from "../EmptyState";

interface DashEmptyProps {
  title?: string;
  description?: string;
  cta?: string;
  onCta?: () => void;
}

/**
 * Empty state shown inside a DashboardPanel when the dashboard has no
 * widgets yet. Embedded inside an existing page (DashHeader + grid area),
 * so we use the smaller "page" size — not the full-page hero used at the
 * dashboard-list level.
 */
export function DashEmpty({
  title = "A blank dashboard.",
  description = "Describe the widgets you want and Meaning will query your sources, pick the chart type, and lay them out. Add as many as you like — you can rearrange them anytime.",
  cta = "Describe a widget",
  onCta,
}: DashEmptyProps) {
  return (
    <EmptyState
      size="page"
      icon={<I.Grid size={28} stroke={1.25} />}
      title={title}
      description={description}
      primaryAction={
        onCta
          ? {
              label: cta,
              icon: <I.Sparkle size={13} />,
              onClick: onCta,
            }
          : undefined
      }
    />
  );
}
