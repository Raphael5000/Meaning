"use client";

import * as React from "react";
import { I } from "../icons";
import { Btn, Dot, IconBtn, MenuItem } from "../primitives";
import { PageShell } from "../PageShell";
import { EmptyState } from "../EmptyState";
import { dbToUi, summarizeSchedule, type DbSchedule } from "./schedule";

export interface AlertSummary {
  id: string;
  name: string | null;
  alertType: string;
  customPrompt: string | null;
  recipients: string;
  enabled: boolean;
  lastSentAt: string | null;
  createdAt: string;
  sendDays: string[];
  sendHour: number;
  sendMinute: number;
  intervalWeeks: number;
}

const ALERT_TYPE_LABEL: Record<string, string> = {
  weekly_snapshot: "Weekly snapshot",
  traffic_report: "Traffic report",
  top_pages: "Top pages",
  custom: "Custom",
};

interface AlertsIndexProps {
  alerts: AlertSummary[];
  onCreate: () => void;
  onOpen: (id: string) => void;
  onDelete: (id: string) => void;
  onToggle: (id: string, enabled: boolean) => void;
  loading?: boolean;
}

export function AlertsIndex({
  alerts,
  onCreate,
  onOpen,
  onDelete,
  onToggle,
  loading = false,
}: AlertsIndexProps) {
  // Keyboard shortcut: N → create
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const editing =
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.isContentEditable;
      if (editing) return;
      if (e.key === "n" || e.key === "N") {
        if (e.metaKey || e.ctrlKey || e.altKey) return;
        e.preventDefault();
        onCreate();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCreate]);

  if (loading) {
    return (
      <PageShell kicker="Alerts" title="Reports in your inbox.">
        <div
          style={{
            padding: 48,
            textAlign: "center",
            color: "var(--v2-ink-muted)",
            fontSize: 13,
          }}
        >
          Loading alerts…
        </div>
      </PageShell>
    );
  }

  if (alerts.length === 0) {
    return <AlertsEmpty onCreate={onCreate} />;
  }

  return (
    <PageShell
      kicker="Alerts"
      title="Reports in your inbox."
      subtitle="We send you the numbers you care about on the schedule you choose. Nothing to check; it just arrives."
      actions={
        <Btn
          variant="primary"
          size="md"
          icon={<I.Plus size={13} />}
          onClick={onCreate}
        >
          New alert
        </Btn>
      }
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 10,
        }}
      >
        {alerts.map((a) => (
          <AlertCard
            key={a.id}
            alert={a}
            onOpen={() => onOpen(a.id)}
            onDelete={() => onDelete(a.id)}
            onToggle={() => onToggle(a.id, !a.enabled)}
          />
        ))}
      </div>

      <div
        style={{
          marginTop: 40,
          fontSize: 11,
          color: "var(--v2-ink-subtle)",
          fontFamily: "var(--v2-font-mono)",
          textAlign: "center",
        }}
      >
        Times in GMT+2 · Change in account settings
      </div>
    </PageShell>
  );
}

function AlertCard({
  alert,
  onOpen,
  onDelete,
  onToggle,
}: {
  alert: AlertSummary;
  onOpen: () => void;
  onDelete: () => void;
  onToggle: () => void;
}) {
  const [menuOpen, setMenuOpen] = React.useState(false);
  const triggerRef = React.useRef<HTMLButtonElement | null>(null);
  const menuRef = React.useRef<HTMLDivElement | null>(null);

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

  const ui = dbToUi({
    sendDays: alert.sendDays,
    sendHour: alert.sendHour,
    sendMinute: alert.sendMinute,
    intervalWeeks: alert.intervalWeeks,
  });
  const recipientCount = alert.recipients
    .split(",")
    .map((r) => r.trim())
    .filter(Boolean).length;
  const template = ALERT_TYPE_LABEL[alert.alertType] ?? "Custom";
  const nextSend = alert.enabled ? formatNextSend(alert) : "—";

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen();
        }
      }}
      className="row-hover"
      style={{
        position: "relative",
        width: "100%",
        textAlign: "left",
        cursor: "pointer",
        padding: "18px 24px",
        borderRadius: 14,
        background: "var(--v2-surface)",
        border: "1px solid var(--v2-line)",
        display: "flex",
        alignItems: "center",
        gap: 20,
        opacity: alert.enabled ? 1 : 0.55,
        transition: "all 140ms var(--v2-ease)",
        fontFamily: "var(--v2-font-sans)",
      }}
    >
      {/* Status pulse */}
      <span
        style={{
          width: 10,
          height: 10,
          borderRadius: 999,
          flexShrink: 0,
          background: alert.enabled
            ? "var(--v2-brand-vivid)"
            : "var(--v2-ink-subtle)",
          boxShadow: alert.enabled
            ? "0 0 0 4px rgba(0,238,127,0.10)"
            : "none",
        }}
      />

      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: 16,
            fontWeight: 600,
            color: "var(--v2-ink)",
            letterSpacing: "-0.005em",
            marginBottom: 3,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {alert.name || "Untitled alert"}
        </div>
        <div
          style={{
            fontSize: 12.5,
            color: "var(--v2-ink-muted)",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <span>{template}</span>
          <Dot />
          <span>{summarizeSchedule(ui)}</span>
        </div>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 28,
          fontSize: 11.5,
          color: "var(--v2-ink-muted)",
          fontFamily: "var(--v2-font-mono)",
        }}
      >
        <div style={{ textAlign: "right" }}>
          <div
            style={{
              color: "var(--v2-ink-subtle)",
              fontSize: 10,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              marginBottom: 2,
            }}
          >
            Next
          </div>
          <div style={{ color: "var(--v2-ink)" }}>{nextSend}</div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div
            style={{
              color: "var(--v2-ink-subtle)",
              fontSize: 10,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              marginBottom: 2,
            }}
          >
            To
          </div>
          <div style={{ color: "var(--v2-ink)" }}>{recipientCount}</div>
        </div>
      </div>

      <IconBtn
        ref={triggerRef}
        title="More"
        aria-expanded={menuOpen}
        onClick={(e) => {
          e.stopPropagation();
          setMenuOpen((o) => !o);
        }}
        icon={<I.More size={14} />}
      />
      <I.ChevronR
        size={16}
        style={{ color: "var(--v2-ink-subtle)", flexShrink: 0 }}
      />

      {menuOpen && (
        <div
          ref={menuRef}
          role="menu"
          onClick={(e) => e.stopPropagation()}
          style={{
            position: "absolute",
            top: "calc(100% - 4px)",
            right: 24,
            zIndex: 20,
            minWidth: 180,
            padding: 5,
            background: "var(--v2-surface)",
            border: "1px solid var(--v2-line)",
            borderRadius: 10,
            boxShadow: "var(--v2-shadow-pop)",
            fontSize: 12.5,
          }}
        >
          <MenuItem
            icon={alert.enabled ? <I.Stop size={12.5} /> : <I.Sparkle size={12.5} />}
            onClick={() => {
              setMenuOpen(false);
              onToggle();
            }}
          >
            {alert.enabled ? "Pause" : "Resume"}
          </MenuItem>
          <MenuItem
            danger
            icon={<I.X size={12.5} />}
            onClick={() => {
              setMenuOpen(false);
              if (
                window.confirm(
                  `Delete "${alert.name || "this alert"}"? This can't be undone.`,
                )
              ) {
                onDelete();
              }
            }}
          >
            Delete
          </MenuItem>
        </div>
      )}
    </div>
  );
}

function formatNextSend(alert: AlertSummary): string {
  const now = new Date();
  const dayMap: Record<string, number> = {
    sunday: 0,
    monday: 1,
    tuesday: 2,
    wednesday: 3,
    thursday: 4,
    friday: 5,
    saturday: 6,
  };
  const targetDays = alert.sendDays
    .map((d) => dayMap[d])
    .filter((d) => d !== undefined)
    .sort((a, b) => a - b);
  if (targetDays.length === 0) return "—";

  // Find the next occurrence — next day in targetDays >= today, else first day next week
  const today = now.getDay();
  const hour = alert.sendHour;
  const minute = alert.sendMinute;
  let targetDay = targetDays.find((d) => d > today);
  if (targetDay === undefined) {
    targetDay = targetDays[0];
  } else if (targetDay === today) {
    // Already today — does the time still fit?
    const stillToday =
      now.getHours() < hour || (now.getHours() === hour && now.getMinutes() < minute);
    if (!stillToday) {
      const next = targetDays.find((d) => d > today);
      targetDay = next ?? targetDays[0];
    }
  }

  const daysUntil =
    targetDay >= today ? targetDay - today : 7 - today + targetDay;
  const date = new Date(now);
  date.setDate(now.getDate() + daysUntil);
  return date.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function AlertsEmpty({ onCreate }: { onCreate: () => void }) {
  // Keyboard: N → create (also wired in main index)
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.isContentEditable
      )
        return;
      if (e.key === "n" || e.key === "N") {
        if (e.metaKey || e.ctrlKey || e.altKey) return;
        e.preventDefault();
        onCreate();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCreate]);

  return (
    <PageShell>
      <EmptyState
        size="hero"
        icon={<I.Bell size={26} />}
        title="Reports in your inbox."
        description="Describe what you want to see. We'll email it on the schedule you choose. No dashboards to check."
        primaryAction={{
          label: "Create your first alert",
          icon: <I.Plus size={14} />,
          onClick: onCreate,
        }}
      />
    </PageShell>
  );
}
