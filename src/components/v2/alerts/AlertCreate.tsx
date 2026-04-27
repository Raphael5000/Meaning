"use client";

import * as React from "react";
import { I } from "../icons";
import { Btn, Chip } from "../primitives";
import { PageShell } from "../PageShell";
import {
  EmailPreview,
  EmailPreviewPlaceholder,
  previewFromForm,
} from "./EmailPreview";
import { SchedulePill } from "./SchedulePill";
import { RecipientsPill } from "./RecipientsPill";
import { uiToDb, type UiSchedule } from "./schedule";

const TEMPLATES = [
  { key: "weekly_snapshot", label: "Weekly Snapshot" },
  { key: "traffic_report", label: "Traffic Report" },
  { key: "top_pages", label: "Top Pages" },
  { key: "custom", label: "Custom" },
] as const;

interface AlertCreateProps {
  onCancel: () => void;
  onSave: (payload: {
    name: string;
    alertType: string;
    customPrompt: string | null;
    recipients: string;
    schedule: UiSchedule;
  }) => Promise<void> | void;
  onSendTest?: (payload: {
    name: string;
    alertType: string;
    customPrompt: string | null;
    recipients: string;
    schedule: UiSchedule;
  }) => Promise<void> | void;
  /** Pre-filled when editing an existing alert (Phase: not used yet — detail
   *  has its own inline edit). Reserved for future "Duplicate" flows. */
  initial?: {
    name: string;
    alertType: string;
    customPrompt: string | null;
    recipients: string;
    schedule: UiSchedule;
  };
  saving?: boolean;
  testing?: boolean;
}

const DEFAULT_SCHEDULE: UiSchedule = {
  frequency: "weekly",
  day: "monday",
  hour: 9,
};

export function AlertCreate({
  onCancel,
  onSave,
  onSendTest,
  initial,
  saving = false,
  testing = false,
}: AlertCreateProps) {
  const [name, setName] = React.useState(initial?.name ?? "");
  const [alertType, setAlertType] = React.useState(
    initial?.alertType ?? "weekly_snapshot",
  );
  const [customPrompt, setCustomPrompt] = React.useState(
    initial?.customPrompt ?? "",
  );
  const [recipients, setRecipients] = React.useState(initial?.recipients ?? "");
  const [schedule, setSchedule] = React.useState<UiSchedule>(
    initial?.schedule ?? DEFAULT_SCHEDULE,
  );
  const [error, setError] = React.useState<string | null>(null);
  const [mode, setMode] = React.useState<"form" | "preview">("form");

  const isCustom = alertType === "custom";
  const showPlaceholder =
    !name.trim() && !customPrompt.trim() && alertType === "custom";

  const previewProps = React.useMemo(
    () =>
      previewFromForm({
        name: name.trim() || autoName(alertType),
        alertType,
        customPrompt: isCustom ? customPrompt : undefined,
      }),
    [name, alertType, customPrompt, isCustom],
  );

  const canSave =
    !saving && !!recipients.split(",").map((r) => r.trim()).filter(Boolean).length;

  function buildPayload() {
    return {
      name: name.trim() || autoName(alertType),
      alertType,
      customPrompt: isCustom ? customPrompt.trim() || null : null,
      recipients: recipients.trim(),
      schedule,
    };
  }

  async function handleSave() {
    setError(null);
    if (!canSave) {
      setError("Add at least one recipient.");
      return;
    }
    if (isCustom && !customPrompt.trim()) {
      setError("Add a custom prompt or pick a template.");
      return;
    }
    try {
      await onSave(buildPayload());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create alert");
    }
  }

  async function handleTest() {
    if (!onSendTest) return;
    setError(null);
    try {
      await onSendTest(buildPayload());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send test");
    }
  }

  // Convert UI schedule → DB shape on save (caller invokes onSave).
  // Exported via `uiToDb` from schedule.ts; AlertsPanelV2 does the conversion
  // before hitting the API.
  void uiToDb;

  const previewToggle =
    mode === "form" ? (
      <Btn
        variant="outline"
        size="md"
        icon={<I.Eye size={13} />}
        onClick={() => setMode("preview")}
      >
        Preview
      </Btn>
    ) : (
      <Btn
        variant="outline"
        size="md"
        icon={<I.ChevronL size={13} />}
        onClick={() => setMode("form")}
      >
        Back to form
      </Btn>
    );

  return (
    <PageShell
      width="contained"
      onBack={onCancel}
      backLabel="All alerts"
      kicker="New alert"
      title={
        mode === "preview" ? "Preview" : "What should we email you?"
      }
      subtitle={
        mode === "preview"
          ? "This is what subscribers will see in their inbox."
          : "Write it in plain English. Or pick a template."
      }
      actions={
        <>
          {previewToggle}
          {onSendTest && (
            <Btn
              variant="ghost"
              size="md"
              disabled={!canSave || testing}
              onClick={handleTest}
            >
              {testing ? "Sending…" : "Send test"}
            </Btn>
          )}
          <Btn
            variant="primary"
            size="md"
            icon={<I.Check size={13} />}
            disabled={!canSave}
            onClick={handleSave}
          >
            {saving ? "Creating…" : "Create alert"}
          </Btn>
        </>
      }
    >
      {error && (
        <div
          style={{
            padding: "10px 14px",
            background: "var(--v2-neg-bg)",
            border: "1px solid var(--v2-neg)",
            borderRadius: 10,
            color: "var(--v2-neg)",
            fontSize: 13,
            marginBottom: 16,
          }}
        >
          {error}
        </div>
      )}

      {mode === "preview" ? (
        /* PREVIEW MODE — full-width stage with the email centered */
        <div
          style={{
            flex: 1,
            marginLeft: "calc(-1 * var(--v2-page-pad-x))",
            marginRight: "calc(-1 * var(--v2-page-pad-x))",
            marginBottom: "calc(-1 * var(--v2-page-pad-y))",
            background: "var(--v2-surface-2)",
            padding: "40px 32px 64px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            fontFamily: "var(--v2-font-sans)",
          }}
        >
          <div style={{ width: "100%", maxWidth: 720 }}>
            {showPlaceholder ? (
              <EmailPreviewPlaceholder width={640} />
            ) : (
              <EmailPreview {...previewProps} width={640} />
            )}
          </div>
        </div>
      ) : (
        /* FORM MODE — single column, centered */
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            fontFamily: "var(--v2-font-sans)",
          }}
        >
          {/* Name field — inline minimal */}
          <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={autoName(alertType)}
          style={{
            marginTop: 24,
            width: "100%",
            padding: "10px 0",
            background: "transparent",
            border: "none",
            borderBottom: "1px solid var(--v2-line)",
            outline: "none",
            fontSize: 15,
            fontWeight: 500,
            color: "var(--v2-ink)",
            fontFamily: "var(--v2-font-sans)",
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderBottomColor = "var(--v2-ink)";
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderBottomColor = "var(--v2-line)";
          }}
        />
        <div
          className="kicker"
          style={{ marginTop: 4, fontSize: 9, color: "var(--v2-ink-subtle)" }}
        >
          Name (optional)
        </div>

        {/* Prompt input */}
        {isCustom && (
          <div
            style={{
              marginTop: 24,
              border: "1px solid var(--v2-line-strong)",
              borderRadius: 14,
              background: "var(--v2-surface)",
              padding: 16,
              transition: "border-color 140ms var(--v2-ease)",
            }}
          >
            <textarea
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
              placeholder="e.g. Top 5 landing pages by conversion, with a note on any where bounce rate rose more than 10%."
              className="no-focus-ring"
              style={{
                width: "100%",
                minHeight: 100,
                border: "none",
                outline: "none",
                background: "transparent",
                resize: "vertical",
                color: "var(--v2-ink)",
                fontFamily: "var(--v2-font-sans)",
                fontSize: 15,
                lineHeight: 1.55,
              }}
            />
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                paddingTop: 12,
                borderTop: "1px solid var(--v2-line)",
                marginTop: 8,
              }}
            >
              <I.Sparkle
                size={13}
                style={{ color: "var(--v2-ink-muted)" }}
              />
              <span
                style={{
                  fontSize: 11.5,
                  color: "var(--v2-ink-muted)",
                }}
              >
                Meaning picks the sources & chart types.
              </span>
            </div>
          </div>
        )}

        {/* Templates */}
        <div style={{ marginTop: 16 }}>
          <div className="kicker" style={{ marginBottom: 10 }}>
            {isCustom ? "Or start from a template" : "Template"}
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {TEMPLATES.map((t) => (
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

          {/* Delivery — schedule + recipients pills */}
          <div style={{ marginTop: 32 }}>
            <div className="kicker" style={{ marginBottom: 12 }}>
              Delivery
            </div>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 8,
              }}
            >
              <SchedulePill value={schedule} onChange={setSchedule} />
              <RecipientsPill value={recipients} onChange={setRecipients} />
            </div>
          </div>
        </div>
      )}
    </PageShell>
  );
}

function autoName(alertType: string): string {
  switch (alertType) {
    case "weekly_snapshot":
      return "Weekly snapshot";
    case "traffic_report":
      return "Traffic report";
    case "top_pages":
      return "Top pages";
    default:
      return "Custom alert";
  }
}

