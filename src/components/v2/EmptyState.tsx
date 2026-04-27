"use client";

import * as React from "react";
import { Btn } from "./primitives";

interface EmptyStateAction {
  label: string;
  onClick?: () => void;
  icon?: React.ReactNode;
  disabled?: boolean;
  /** Render as a link instead of a button (e.g. OAuth start URL). */
  href?: string;
}

interface EmptyStateProps {
  /** Square icon rendered in the framed container above the title. */
  icon?: React.ReactNode;
  kicker?: string;
  title: React.ReactNode;
  description?: React.ReactNode;
  primaryAction?: EmptyStateAction;
  secondaryAction?: EmptyStateAction;
  /**
   * "hero" — used when this is the only thing on screen (full-page empty).
   *           Renders with --v2-h-hero typography and extra top padding.
   * "page" — embedded inside an existing page (e.g. dashboard with no widgets).
   *           Renders at page-title scale.
   */
  size?: "hero" | "page";
}

/**
 * Single shape for every empty state. Centered column with an icon, kicker,
 * title, description, and 1–2 actions. Picks typography based on `size`.
 */
export function EmptyState({
  icon,
  kicker,
  title,
  description,
  primaryAction,
  secondaryAction,
  size = "page",
}: EmptyStateProps) {
  return (
    <div className="v2-empty" data-size={size}>
      {icon && <div className="v2-empty-icon">{icon}</div>}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
        {kicker && <div className="kicker">{kicker}</div>}
        <h2 className="v2-empty-title">{title}</h2>
        {description && <p className="v2-empty-desc">{description}</p>}
      </div>
      {(primaryAction || secondaryAction) && (
        <div className="v2-empty-actions">
          {primaryAction && <ActionBtn variant="primary" action={primaryAction} />}
          {secondaryAction && <ActionBtn variant="ghost" action={secondaryAction} />}
        </div>
      )}
    </div>
  );
}

function ActionBtn({
  variant,
  action,
}: {
  variant: "primary" | "ghost";
  action: EmptyStateAction;
}) {
  if (action.href) {
    // Render a styled anchor (not a <button> inside an <a>). The .v2-btn class
    // and data-* attrs drive all the visuals — the CSS selectors don't care
    // whether the element is a button or an anchor.
    return (
      <a
        href={action.href}
        className="v2-btn"
        data-variant={variant}
        data-size="md"
        aria-disabled={action.disabled || undefined}
        style={action.disabled ? { pointerEvents: "none", opacity: 0.5 } : undefined}
      >
        {action.icon}
        {action.label}
      </a>
    );
  }
  return (
    <Btn
      variant={variant}
      size="md"
      icon={action.icon}
      disabled={action.disabled}
      onClick={action.onClick}
    >
      {action.label}
    </Btn>
  );
}
