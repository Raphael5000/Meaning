"use client";

import * as React from "react";
import { I } from "../icons";
import { Btn, Chip, Dot } from "../primitives";
import { PageShell } from "../PageShell";
import { EmailPreview, previewFromForm } from "./EmailPreview";
import { SchedulePill } from "./SchedulePill";
import { RecipientsPill } from "./RecipientsPill";
import {
  dbToUi,
  summarizeSchedule,
  uiToDb,
  type UiSchedule,
} from "./schedule";
import type { AlertSummary } from "./AlertsIndex";

const ALERT_TYPE_LABEL: Record<string, string> = {
  weekly_snapshot: "Weekly snapshot",
  traffic_report: "Traffic report",
  top_pages: "Top pages",
  custom: "Custom",
};

interface AlertDetailProps {
  alert: AlertSummary;
  onBack: () => void;
  onSave: (payload: {
    name: string;
    alertType: string;
    customPrompt: string | null;
    recipients: string;
    schedule: UiSchedule;
    enabled: boolean;
  }) => Promise<void> | void;
  onSendTest: () => Promise<void> | void;
  onDelete: () => Promise<void> | void;
  saving?: boolean;
  testing?: boolean;
}

export function AlertDetail({
  alert,
  onBack,
  onSave,
  onSendTest,
  onDelete,
  saving = false,
  testing = false,
}: AlertDetailProps) {
  const [editing, setEditing] = React.useState(false);
  const [name, setName] = React.useState(alert.name ?? "");
  const [alertType, setAlertType] = React.useState(alert.alertType);
  const [customPrompt, setCustomPrompt] = React.useState(
    alert.customPrompt ?? "",
  );
  const [recipients, setRecipients] = React.useState(alert.recipients);
  const [schedule, setSchedule] = React.useState<UiSchedule>(() =>
    dbToUi({
      sendDays: alert.sendDays,
      sendHour: alert.sendHour,
      sendMinute: alert.sendMinute,
      intervalWeeks: alert.intervalWeeks,
    }),
  );
  const [enabled, setEnabled] = React.useState(alert.enabled);
  /** When editing, the page swaps between the form and a full preview. */
  const [editMode, setEditMode] = React.useState<"form" | "preview">("form");

  // Reset form when alert changes (e.g. switched to a different alert)
  React.useEffect(() => {
    setEditing(false);
    setEditMode("form");
    setName(alert.name ?? "");
    setAlertType(alert.alertType);
    setCustomPrompt(alert.customPrompt ?? "");
    setRecipients(alert.recipients);
    setSchedule(
      dbToUi({
        sendDays: alert.sendDays,
        sendHour: alert.sendHour,
        sendMinute: alert.sendMinute,
        intervalWeeks: alert.intervalWeeks,
      }),
    );
    setEnabled(alert.enabled);
  }, [alert]);

  const recipientList = recipients
    .split(",")
    .map((r) => r.trim())
    .filter(Boolean);
  const recipientCount = recipientList.length;
  const template = ALERT_TYPE_LABEL[alertType] ?? "Custom";

  const previewProps = React.useMemo(
    () =>
      previewFromForm({
        name: name || "Alert",
        alertType,
        customPrompt: alertType === "custom" ? customPrompt : undefined,
      }),
    [name, alertType, customPrompt],
  );

  async function handleSave() {
    await onSave({
      name: name.trim() || alert.name || "Untitled alert",
      alertType,
      customPrompt:
        alertType === "custom" ? customPrompt.trim() || null : null,
      recipients: recipients.trim(),
      schedule,
      enabled,
    });
    setEditing(false);
    void uiToDb;
  }

  function handleCancelEdit() {
    setName(alert.name ?? "");
    setAlertType(alert.alertType);
    setCustomPrompt(alert.customPrompt ?? "");
    setRecipients(alert.recipients);
    setSchedule(
      dbToUi({
        sendDays: alert.sendDays,
        sendHour: alert.sendHour,
        sendMinute: alert.sendMinute,
        intervalWeeks: alert.intervalWeeks,
      }),
    );
    setEnabled(alert.enabled);
    setEditing(false);
    setEditMode("form");
  }

  const statusPill = (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        fontSize: 11,
        fontWeight: 500,
        color: enabled ? "var(--v2-brand-ink)" : "var(--v2-ink-muted)",
        padding: "3px 8px 3px 6px",
        borderRadius: 999,
        background: enabled
          ? "rgba(0,238,127,0.08)"
          : "var(--v2-surface-2)",
        textTransform: "none",
        letterSpacing: 0,
      }}
    >
      <span
        style={{
          width: 6,
          height: 6,
          borderRadius: 999,
          background: enabled ? "var(--v2-brand-vivid)" : "var(--v2-ink-subtle)",
        }}
      />
      {enabled ? "Active" : "Paused"}
    </span>
  );

  const titleNode = editing ? (
    <input
      value={name}
      onChange={(e) => setName(e.target.value)}
      placeholder="Alert name"
      style={{
        width: "100%",
        font: "inherit",
        color: "inherit",
        background: "transparent",
        border: "none",
        borderBottom: "1px solid var(--v2-ink)",
        outline: "none",
        padding: "2px 0",
      }}
    />
  ) : (
    <>{alert.name || "Untitled alert"}</>
  );

  const subtitleNode = (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 14,
        fontSize: 12,
        color: "var(--v2-ink-muted)",
        fontFamily: "var(--v2-font-mono)",
        flexWrap: "wrap",
      }}
    >
      <span>{summarizeSchedule(schedule)}</span>
      <Dot />
      <span>
        {recipientCount} recipient{recipientCount === 1 ? "" : "s"}
      </span>
      {alert.lastSentAt && (
        <>
          <Dot />
          <span>
            Last sent ·{" "}
            {new Date(alert.lastSentAt).toLocaleDateString(undefined, {
              month: "short",
              day: "numeric",
            })}
          </span>
        </>
      )}
    </span>
  );

  const editPreviewToggle =
    editMode === "form" ? (
      <Btn
        variant="outline"
        size="md"
        icon={<I.Eye size={13} />}
        onClick={() => setEditMode("preview")}
      >
        Preview
      </Btn>
    ) : (
      <Btn
        variant="outline"
        size="md"
        icon={<I.ChevronL size={13} />}
        onClick={() => setEditMode("form")}
      >
        Back to form
      </Btn>
    );

  const actionsNode = editing ? (
    <>
      {editPreviewToggle}
      <Btn variant="ghost" size="md" onClick={handleCancelEdit}>
        Cancel
      </Btn>
      <Btn
        variant="primary"
        size="md"
        icon={<I.Check size={13} />}
        disabled={saving}
        onClick={handleSave}
      >
        {saving ? "Saving…" : "Save changes"}
      </Btn>
    </>
  ) : (
    <>
      <Btn
        variant="outline"
        size="sm"
        disabled={testing}
        onClick={onSendTest}
      >
        {testing ? "Sending…" : "Send test"}
      </Btn>
      <Btn
        variant="outline"
        size="sm"
        icon={<I.Edit size={12} />}
        onClick={() => {
          setEditing(true);
          setEditMode("form");
        }}
      >
        Edit
      </Btn>
      <Btn
        variant="outline"
        size="sm"
        onClick={async () => {
          setEnabled(!enabled);
          await onSave({
            name: alert.name || name,
            alertType,
            customPrompt:
              alertType === "custom" ? customPrompt.trim() || null : null,
            recipients,
            schedule,
            enabled: !enabled,
          });
        }}
      >
        {enabled ? "Pause" : "Resume"}
      </Btn>
      <Btn
        variant="ghost"
        size="sm"
        onClick={() => {
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
      </Btn>
    </>
  );

  return (
    <PageShell
      width="full"
      onBack={onBack}
      backLabel="All alerts"
      kicker={
        <span style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
          {statusPill}
          <span>{template}</span>
        </span>
      }
      title={titleNode}
      subtitle={subtitleNode}
      actions={actionsNode}
    >

      {/* Edit panel — only when editing AND in form mode.
          Negative margins extend the surface band edge-to-edge. */}
      {editing && editMode === "form" && (
        <div
          style={{
            marginLeft: "calc(-1 * var(--v2-page-pad-x))",
            marginRight: "calc(-1 * var(--v2-page-pad-x))",
            marginBottom: "calc(-1 * var(--v2-page-pad-y))",
            marginTop: 12,
            flex: 1,
            padding: "24px 32px 64px",
            borderTop: "1px solid var(--v2-line)",
            background: "var(--v2-surface)",
            display: "flex",
            flexDirection: "column",
            gap: 18,
          }}
        >
          {alertType === "custom" && (
            <div>
              <div className="kicker" style={{ marginBottom: 8 }}>
                Prompt
              </div>
              <textarea
                value={customPrompt}
                onChange={(e) => setCustomPrompt(e.target.value)}
                placeholder="Describe what should be in the email…"
                rows={3}
                className="no-focus-ring"
                style={{
                  width: "100%",
                  padding: 14,
                  background: "var(--v2-surface)",
                  border: "1px solid var(--v2-line-strong)",
                  borderRadius: 12,
                  outline: "none",
                  fontFamily: "var(--v2-font-sans)",
                  fontSize: 14,
                  color: "var(--v2-ink)",
                  lineHeight: 1.55,
                  resize: "vertical",
                }}
              />
            </div>
          )}

          <div>
            <div className="kicker" style={{ marginBottom: 8 }}>
              Template
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {(
                [
                  { key: "weekly_snapshot", label: "Weekly Snapshot" },
                  { key: "traffic_report", label: "Traffic Report" },
                  { key: "top_pages", label: "Top Pages" },
                  { key: "custom", label: "Custom" },
                ] as const
              ).map((t) => (
                <Chip
                  key={t.key}
                  active={alertType === t.key}
                  onClick={() => setAlertType(t.key)}
                >
                  {t.label}
                </Chip>
              ))}
            </div>
          </div>

          <div>
            <div className="kicker" style={{ marginBottom: 10 }}>
              Delivery
            </div>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 8,
                maxWidth: 540,
              }}
            >
              <SchedulePill value={schedule} onChange={setSchedule} />
              <RecipientsPill value={recipients} onChange={setRecipients} />
            </div>
          </div>
        </div>
      )}

      {/* Preview — shown when viewing OR when editing-and-toggled-to-preview.
          Stage extends edge-to-edge by negating PageShell padding. */}
      {(!editing || editMode === "preview") && (
      <div
        style={{
          flex: 1,
          marginLeft: "calc(-1 * var(--v2-page-pad-x))",
          marginRight: "calc(-1 * var(--v2-page-pad-x))",
          marginBottom: "calc(-1 * var(--v2-page-pad-y))",
          marginTop: 12,
          background: "var(--v2-surface-2)",
          padding: "40px 32px 64px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        <div
          style={{
            maxWidth: 720,
            width: "100%",
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginBottom: 16,
          }}
        >
          <span className="kicker">
            {editing
              ? "Preview · updates with your changes"
              : alert.lastSentAt
                ? `Last sent · ${new Date(alert.lastSentAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}`
                : "Preview"}
          </span>
        </div>
        <div style={{ maxWidth: 720, width: "100%" }}>
          <EmailPreview {...previewProps} width={640} />
        </div>

        {/* Recipients list (read-only — open tracking deferred).
            Only shown when not editing (in edit mode the user has these in the form). */}
        {!editing && recipientList.length > 0 && (
          <div style={{ maxWidth: 640, width: "100%", marginTop: 32 }}>
            <div className="kicker" style={{ marginBottom: 12 }}>
              Recipients
            </div>
            <div
              style={{
                background: "var(--v2-surface)",
                border: "1px solid var(--v2-line)",
                borderRadius: 12,
                padding: 4,
              }}
            >
              {recipientList.map((email) => (
                <div
                  key={email}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "10px 12px",
                    borderRadius: 8,
                  }}
                >
                  <div
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 999,
                      background: "var(--v2-surface-2)",
                      border: "1px solid var(--v2-line)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 10,
                      fontWeight: 600,
                      color: "var(--v2-ink)",
                      textTransform: "uppercase",
                    }}
                  >
                    {email.slice(0, 2)}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: 12.5,
                        color: "var(--v2-ink)",
                        fontFamily: "var(--v2-font-mono)",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {email}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      )}
    </PageShell>
  );
}
