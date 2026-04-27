"use client";

import * as React from "react";
import { I } from "./icons";
import { Btn } from "./primitives";

interface PageShellProps {
  /** Optional small label above the title. Accepts JSX (e.g. status pill + text). */
  kicker?: React.ReactNode;
  /** Page title — rendered with --v2-h-page. */
  title?: React.ReactNode;
  /** One-line description under the title. */
  subtitle?: React.ReactNode;
  /** When provided, renders a back button above the header row. */
  onBack?: () => void;
  /** Label for the back button. Defaults to "Back". */
  backLabel?: string;
  /** Buttons rendered on the right side of the header row. */
  actions?: React.ReactNode;
  /** "contained" centers the page at --v2-page-max; "full" goes edge-to-edge. */
  width?: "contained" | "full";
  children: React.ReactNode;
}

/**
 * Standard page chrome for index/list/detail/empty views.
 * Owns: outer scroll column, content width, back button, header row
 * (kicker + title + subtitle on the left, action buttons on the right).
 *
 * Section components compose `PageShell` and pass their list/grid/form
 * as children. They do not render their own outer wrapper or header.
 */
export function PageShell({
  kicker,
  title,
  subtitle,
  onBack,
  backLabel = "Back",
  actions,
  width = "contained",
  children,
}: PageShellProps) {
  const hasHeader = kicker || title || subtitle || actions;
  return (
    <div className="v2-page">
      <div className="v2-page-inner" data-width={width}>
        {onBack && (
          <Btn
            variant="ghost"
            size="xs"
            onClick={onBack}
            icon={<I.ChevronL size={13} />}
            className="v2-page-back"
          >
            {backLabel}
          </Btn>
        )}
        {hasHeader && (
          <header className="v2-page-header">
            <div style={{ minWidth: 0, flex: 1 }}>
              {kicker && (
                <div className="kicker" style={{ marginBottom: 6 }}>
                  {kicker}
                </div>
              )}
              {title && <h1 className="v2-page-title">{title}</h1>}
              {subtitle && <p className="v2-page-subtitle">{subtitle}</p>}
            </div>
            {actions && <div className="v2-page-header-actions">{actions}</div>}
          </header>
        )}
        {children}
      </div>
    </div>
  );
}
