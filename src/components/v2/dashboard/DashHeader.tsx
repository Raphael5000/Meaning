"use client";

import * as React from "react";
import { I } from "../icons";
import { Btn, Dot, IconBtn } from "../primitives";
interface DashHeaderProps {
  title: string;
  owner?: string;
  lastRefreshed?: string;
  chatOpen?: boolean;
  onToggleChat?: () => void;
  onAddWidget?: () => void;
  onBack?: () => void;
  onRefresh?: () => void;
  refreshing?: boolean;
  /** Optional slot on the far right (e.g. refreshing indicator) */
  trailing?: React.ReactNode;
  /** Date picker slot rendered between trailing and action buttons */
  datePicker?: React.ReactNode;
  onEditTitle?: () => void;
  editingTitle?: boolean;
  titleDraft?: string;
  onTitleDraftChange?: (v: string) => void;
  onTitleCommit?: () => void;
}

export function DashHeader({
  title,
  owner,
  lastRefreshed,
  chatOpen = false,
  onToggleChat,
  onAddWidget,
  onBack,
  onRefresh,
  refreshing = false,
  trailing,
  datePicker,
  onEditTitle,
  editingTitle = false,
  titleDraft,
  onTitleDraftChange,
  onTitleCommit,
}: DashHeaderProps) {
  const [titleHover, setTitleHover] = React.useState(false);
  return (
    <header
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "14px 24px",
        borderBottom: "1px solid var(--v2-line)",
        background: "var(--v2-surface)",
      }}
    >
      {onBack && (
        <IconBtn
          size="md"
          onClick={onBack}
          aria-label="Back to dashboards"
          icon={<I.ChevronL size={14} />}
          style={{ marginRight: 2 }}
        />
      )}

      <div
        style={{
          flex: 1,
          minWidth: 0,
          display: "flex",
          flexDirection: "column",
          gap: 2,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span
            style={{
              fontSize: 10,
              letterSpacing: "0.09em",
              textTransform: "uppercase",
              color: "var(--v2-ink-muted)",
              fontWeight: 600,
            }}
          >
            Dashboard
          </span>
          {owner && (
            <>
              <Dot />
              <span style={{ fontSize: 11.5, color: "var(--v2-ink-muted)" }}>
                {owner}
              </span>
            </>
          )}
          {lastRefreshed && (
            <>
              <Dot />
              <span style={{ fontSize: 11.5, color: "var(--v2-ink-muted)" }}>
                Refreshed {lastRefreshed}
              </span>
            </>
          )}
        </div>
        {editingTitle ? (
          <input
            autoFocus
            value={titleDraft ?? ""}
            onChange={(e) => onTitleDraftChange?.(e.target.value)}
            onBlur={onTitleCommit}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                onTitleCommit?.();
              } else if (e.key === "Escape") {
                e.preventDefault();
                onTitleCommit?.();
              }
            }}
            style={{
              fontSize: 18,
              fontWeight: 600,
              letterSpacing: "-0.015em",
              color: "var(--v2-ink)",
              background: "transparent",
              border: "none",
              outline: "none",
              padding: 0,
              fontFamily: "var(--v2-font-sans)",
              width: "100%",
            }}
          />
        ) : (
          <div
            style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}
            onMouseEnter={() => setTitleHover(true)}
            onMouseLeave={() => setTitleHover(false)}
          >
            <h1
              onClick={onEditTitle}
              style={{
                margin: 0,
                fontSize: 18,
                fontWeight: 600,
                letterSpacing: "-0.015em",
                color: "var(--v2-ink)",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                cursor: onEditTitle ? "text" : "default",
              }}
            >
              {title}
            </h1>
            {onEditTitle && (
              <IconBtn
                size="xs"
                onClick={onEditTitle}
                aria-label="Rename dashboard"
                icon={<I.Edit size={12} />}
                style={{
                  opacity: titleHover ? 1 : 0,
                  transition: "opacity 120ms var(--v2-ease)",
                  flexShrink: 0,
                }}
              />
            )}
          </div>
        )}
      </div>

      {trailing}
      {datePicker}
      {onRefresh && (
        <Btn
          variant="outline"
          size="sm"
          icon={
            <I.Refresh
              size={13}
              style={
                refreshing
                  ? { animation: "spin 1s linear infinite" }
                  : undefined
              }
            />
          }
          onClick={onRefresh}
          disabled={refreshing}
        >
          {refreshing ? "Refreshing…" : "Refresh"}
        </Btn>
      )}
      {onAddWidget && (
        <Btn
          variant="outline"
          size="sm"
          icon={<I.Plus size={13} />}
          onClick={onAddWidget}
        >
          Add widget
        </Btn>
      )}
      {onToggleChat && (
        <Btn
          variant={chatOpen ? "primary" : "outline"}
          size="sm"
          icon={<I.Sparkle size={13} />}
          onClick={onToggleChat}
        >
          Ask
        </Btn>
      )}
    </header>
  );
}
