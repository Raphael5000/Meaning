"use client";

import * as React from "react";
import { I } from "../icons";
import { Sparkline } from "../attachments";
import { IconBtn, MenuItem } from "../primitives";
import { standardWidgetMenu, type WidgetMenuItem } from "./WidgetShell";

interface DashScorecardProps {
  label: string;
  value: React.ReactNode;
  /** Signed delta string, e.g. "+12.4%" or "-$0.08" */
  change?: string;
  /** Period caption rendered after the delta, e.g. "vs. prev. 7d" */
  period?: string;
  /** For metrics where "down is good" (bounce rate, CPA). Inverts pos/neg color. */
  invert?: boolean;
  /** Sparkline values. If provided, renders a tiny trend strip at the bottom. */
  points?: number[];
  source?: string;
  menuItems?: WidgetMenuItem[];
  onMoreMenuHandlers?: Parameters<typeof standardWidgetMenu>[0];
  loading?: boolean;
  /** react-grid-layout drag handle refs */
  dragHandleRef?: React.Ref<HTMLButtonElement>;
  onDragHandleMouseDown?: React.MouseEventHandler<HTMLButtonElement>;
  onDragHandleTouchStart?: React.TouchEventHandler<HTMLButtonElement>;
}

/**
 * Standalone scorecard — renders its own card frame (not via WidgetShell) so the
 * 36px value can sit as a hero rather than being shoehorned into a title slot.
 * Hover chrome (drag handle + kebab) matches WidgetShell for layout consistency.
 */
export function DashScorecard({
  label,
  value,
  change,
  period,
  invert = false,
  points,
  source,
  menuItems,
  onMoreMenuHandlers,
  loading = false,
  dragHandleRef,
  onDragHandleMouseDown,
  onDragHandleTouchStart,
}: DashScorecardProps) {
  const [menuOpen, setMenuOpen] = React.useState(false);
  const resolvedMenu =
    menuItems ?? (onMoreMenuHandlers ? standardWidgetMenu(onMoreMenuHandlers) : undefined);
  const isNeg = typeof change === "string" && change.trim().startsWith("-");
  const deltaNegative = invert ? !isNeg : isNeg;

  const menuRef = React.useRef<HTMLDivElement | null>(null);
  const triggerRef = React.useRef<HTMLButtonElement | null>(null);

  React.useEffect(() => {
    if (!menuOpen) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (menuRef.current?.contains(t)) return;
      if (triggerRef.current?.contains(t)) return;
      setMenuOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [menuOpen]);

  return (
    <section
      className="widget-shell"
      style={{
        position: "relative",
        display: "flex",
        flexDirection: "column",
        height: "100%",
        background: "var(--v2-surface)",
        border: "1px solid var(--v2-line)",
        borderRadius: 10,
        overflow: "hidden",
        padding: 16,
      }}
    >
      {/* top row — drag handle + kicker + kebab */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
        <button
          ref={dragHandleRef}
          onMouseDown={onDragHandleMouseDown}
          onTouchStart={onDragHandleTouchStart}
          className="widget-drag-handle"
          aria-label="Drag to reorder"
          style={{
            width: 14,
            height: 18,
            marginTop: 1,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            background: "transparent",
            border: "none",
            cursor: "grab",
            color: "var(--v2-ink-subtle)",
            padding: 0,
          }}
        >
          <svg width="10" height="14" viewBox="0 0 10 14" aria-hidden="true">
            <circle cx="2.5" cy="2.5" r="1" fill="currentColor" />
            <circle cx="2.5" cy="7" r="1" fill="currentColor" />
            <circle cx="2.5" cy="11.5" r="1" fill="currentColor" />
            <circle cx="7.5" cy="2.5" r="1" fill="currentColor" />
            <circle cx="7.5" cy="7" r="1" fill="currentColor" />
            <circle cx="7.5" cy="11.5" r="1" fill="currentColor" />
          </svg>
        </button>
        <div
          style={{
            flex: 1,
            minWidth: 0,
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <span className="kicker">{label}</span>
          {source && (
            <>
              <span style={{ color: "var(--v2-ink-subtle)", fontSize: 9 }}>·</span>
              <span className="kicker" style={{ letterSpacing: "0.06em" }}>
                {source}
              </span>
            </>
          )}
        </div>
        {resolvedMenu && (
          <IconBtn
            ref={triggerRef}
            title="More"
            aria-expanded={menuOpen}
            className="widget-kebab"
            onClick={() => setMenuOpen((o) => !o)}
            icon={<I.More size={12.5} />}
          />
        )}
      </div>

      {/* value */}
      <div
        className="num"
        style={{
          marginTop: 8,
          fontSize: 36,
          fontWeight: 600,
          lineHeight: 1.05,
          letterSpacing: "-0.025em",
          color: "var(--v2-ink)",
        }}
      >
        {loading ? (
          <span
            className="shimmer"
            style={{
              display: "inline-block",
              width: 120,
              height: 32,
              borderRadius: 4,
              background: "var(--v2-surface-2)",
            }}
          />
        ) : (
          value
        )}
      </div>

      {/* delta */}
      {change && !loading && (
        <div style={{ marginTop: 6, display: "flex", alignItems: "baseline", gap: 6 }}>
          <span
            className={`delta ${deltaNegative ? "neg" : "pos"}`}
            style={{ fontSize: 12.5, fontWeight: 500 }}
          >
            {isNeg ? <I.Down size={10} /> : <I.Up size={10} />}
            {change}
          </span>
          {period && (
            <span style={{ fontSize: 11, color: "var(--v2-ink-muted)" }}>
              {period}
            </span>
          )}
        </div>
      )}

      {/* sparkline */}
      {points && points.length > 1 && !loading && (
        <div
          style={{
            marginTop: 12,
            flex: 1,
            display: "flex",
            alignItems: "flex-end",
          }}
        >
          <Sparkline points={points} w={220} h={32} />
        </div>
      )}

      {menuOpen && resolvedMenu && (
        <div
          ref={menuRef}
          role="menu"
          style={{
            position: "absolute",
            top: 42,
            right: 8,
            zIndex: 20,
            minWidth: 210,
            padding: 5,
            background: "var(--v2-surface)",
            border: "1px solid var(--v2-line)",
            borderRadius: 10,
            boxShadow: "var(--v2-shadow-pop)",
            fontSize: 12.5,
          }}
        >
          {resolvedMenu.map((it, i) => (
            <MenuItem
              key={`${it.label}-${i}`}
              icon={it.icon}
              shortcut={it.shortcut}
              danger={it.danger}
              onClick={() => {
                it.onSelect?.();
                setMenuOpen(false);
              }}
            >
              {it.label}
            </MenuItem>
          ))}
        </div>
      )}
    </section>
  );
}
