"use client";

import * as React from "react";
import { I } from "../icons";
import { IconBtn, Kbd, MenuItem } from "../primitives";

/**
 * WidgetShell — frame every dashboard widget sits in.
 * Hover reveals the drag handle (top-left rail) and kebab (top-right).
 * Dragging swaps the border to --v2-ink + a pop shadow.
 */

export interface WidgetMenuItem {
  icon: React.ReactNode;
  label: string;
  shortcut?: React.ReactNode;
  danger?: boolean;
  onSelect?: () => void;
}

interface WidgetShellProps {
  title: React.ReactNode;
  kicker?: string;
  source?: string;
  subtitle?: string;
  /** Pass `null` to hide the kebab entirely. Pass a node to replace it. */
  actions?: React.ReactNode | null;
  children?: React.ReactNode;
  padding?: number;
  compact?: boolean;
  dragging?: boolean;
  loading?: boolean;
  footnote?: React.ReactNode;
  menuItems?: WidgetMenuItem[];
  /** Forward to the outer <section> for react-grid-layout drag/resize */
  className?: string;
  style?: React.CSSProperties;
  dragHandleRef?: React.Ref<HTMLButtonElement>;
  onDragHandleMouseDown?: React.MouseEventHandler<HTMLButtonElement>;
  onDragHandleTouchStart?: React.TouchEventHandler<HTMLButtonElement>;
}

export function WidgetShell({
  title,
  kicker,
  source,
  subtitle,
  actions,
  children,
  padding = 16,
  compact = false,
  dragging = false,
  loading = false,
  footnote,
  menuItems,
  className,
  style,
  dragHandleRef,
  onDragHandleMouseDown,
  onDragHandleTouchStart,
}: WidgetShellProps) {
  const [menuOpen, setMenuOpen] = React.useState(false);
  const menuRef = React.useRef<HTMLDivElement | null>(null);
  const triggerRef = React.useRef<HTMLButtonElement | null>(null);

  React.useEffect(() => {
    if (!menuOpen) return;
    const onDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (menuRef.current?.contains(target)) return;
      if (triggerRef.current?.contains(target)) return;
      setMenuOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  return (
    <section
      className={`widget-shell${dragging ? " dragging" : ""}${className ? ` ${className}` : ""}`}
      style={{
        position: "relative",
        display: "flex",
        flexDirection: "column",
        height: "100%",
        minHeight: 0,
        background: "var(--v2-surface)",
        border: `1px solid ${dragging ? "var(--v2-ink)" : "var(--v2-line)"}`,
        borderRadius: 10,
        overflow: "hidden",
        boxShadow: dragging
          ? "0 12px 32px -8px rgba(0,0,0,0.25), 0 0 0 1px var(--v2-ink)"
          : "none",
        transition:
          "box-shadow 150ms var(--v2-ease), border-color 150ms var(--v2-ease)",
        ...style,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          gap: 8,
          padding: compact ? "10px 12px 8px" : "14px 16px 10px",
          minHeight: compact ? 38 : 52,
        }}
      >
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

        <div style={{ flex: 1, minWidth: 0 }}>
          {(kicker || source) && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                marginBottom: 2,
              }}
            >
              {kicker && <span className="kicker">{kicker}</span>}
              {source && (
                <>
                  <span style={{ color: "var(--v2-ink-subtle)", fontSize: 9 }}>
                    ·
                  </span>
                  <span
                    className="kicker"
                    style={{ letterSpacing: "0.06em" }}
                  >
                    {source}
                  </span>
                </>
              )}
            </div>
          )}
          <div
            style={{
              fontSize: compact ? 13 : 14.5,
              fontWeight: 600,
              color: "var(--v2-ink)",
              letterSpacing: "-0.005em",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {title}
          </div>
          {subtitle && (
            <div
              style={{
                fontSize: 11.5,
                color: "var(--v2-ink-muted)",
                marginTop: 2,
              }}
            >
              {subtitle}
            </div>
          )}
        </div>

        {actions !== null && (
          <div style={{ display: "flex", gap: 2, marginTop: -2 }}>
            {actions ?? (
              <IconBtn
                ref={triggerRef}
                title="More"
                aria-expanded={menuOpen}
                onClick={() => setMenuOpen((o) => !o)}
                icon={<I.More size={13} />}
                className="widget-kebab"
              />
            )}
          </div>
        )}
      </div>

      <div style={{ borderTop: "1px solid var(--v2-line)" }} />

      <div
        style={{
          flex: 1,
          minHeight: 0,
          padding: compact ? 12 : padding,
          position: "relative",
        }}
      >
        {loading ? <WidgetSkeleton /> : children}
      </div>

      {footnote && (
        <>
          <div style={{ borderTop: "1px solid var(--v2-line)" }} />
          <div
            style={{
              padding: "9px 16px",
              fontSize: 11,
              color: "var(--v2-ink-muted)",
              fontFamily: "var(--v2-font-mono)",
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            {footnote}
          </div>
        </>
      )}

      {menuOpen && menuItems && (
        <WidgetMenuPanel
          ref={menuRef}
          items={menuItems}
          onClose={() => setMenuOpen(false)}
        />
      )}
    </section>
  );
}

const WidgetMenuPanel = React.forwardRef<
  HTMLDivElement,
  { items: WidgetMenuItem[]; onClose: () => void }
>(function WidgetMenuPanel({ items, onClose }, ref) {
  return (
    <div
      ref={ref}
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
      {items.map((it, i) => (
        <MenuItem
          key={`${it.label}-${i}`}
          icon={it.icon}
          shortcut={it.shortcut}
          danger={it.danger}
          onClick={() => {
            it.onSelect?.();
            onClose();
          }}
        >
          {it.label}
        </MenuItem>
      ))}
    </div>
  );
});

/** The 6-action set used by data widgets. Pass onSelect handlers in from the owner. */
export function standardWidgetMenu(handlers: {
  onEdit?: () => void;
  onRefresh?: () => void;
  onAskFollowup?: () => void;
  onDuplicate?: () => void;
  onExportCsv?: () => void;
  onRemove?: () => void;
}): WidgetMenuItem[] {
  return [
    { icon: <I.Edit size={12.5} />, label: "Edit prompt", shortcut: <Kbd>E</Kbd>, onSelect: handlers.onEdit },
    { icon: <I.Refresh size={12.5} />, label: "Refresh now", onSelect: handlers.onRefresh },
    { icon: <I.Sparkle size={12.5} />, label: "Ask follow-up", shortcut: <Kbd>⌘K</Kbd>, onSelect: handlers.onAskFollowup },
    { icon: <I.Copy size={12.5} />, label: "Duplicate", onSelect: handlers.onDuplicate },
    { icon: <I.Download size={12.5} />, label: "Export CSV", onSelect: handlers.onExportCsv },
    { icon: <I.X size={12.5} />, label: "Remove from dashboard", danger: true, onSelect: handlers.onRemove },
  ];
}

export function WidgetSkeleton() {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 10,
        height: "100%",
        justifyContent: "space-between",
        padding: 4,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "flex-end",
          gap: 8,
          flex: 1,
          minHeight: 0,
        }}
      >
        {[0.45, 0.72, 0.6, 0.88, 0.55, 0.92, 0.78].map((h, i) => (
          <div
            key={i}
            className="barpulse shimmer"
            style={{
              flex: 1,
              height: `${h * 100}%`,
              background: "var(--v2-surface-2)",
              borderRadius: 3,
              border: "1px solid var(--v2-line)",
              animationDelay: `${i * 0.08}s`,
            }}
          />
        ))}
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          fontSize: 11,
          color: "var(--v2-ink-muted)",
          fontFamily: "var(--v2-font-mono)",
        }}
      >
        <span className="pulse-dot" />
        <span>Querying sources · building chart…</span>
      </div>
    </div>
  );
}
