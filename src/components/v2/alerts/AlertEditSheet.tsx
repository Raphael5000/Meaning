"use client";

import * as React from "react";
import { Loader2, Send, Trash2 } from "lucide-react";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EmailTagInput } from "@/components/ui/email-tag-input";

import {
  DAY_ORDER,
  TIME_SLOTS,
  dayLong,
  formatTime,
  type DayKey,
  type Frequency,
  type UiSchedule,
} from "./schedule";
import { ALERT_TYPES, type AlertSummary } from "./types";

const FREQUENCY_OPTIONS: { value: Frequency; label: string }[] = [
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "biweekly", label: "Every 2 weeks" },
  { value: "monthly", label: "Every 4 weeks" },
];

export interface AlertSavePayload {
  name: string;
  alertType: string;
  customPrompt: string | null;
  recipients: string;
  schedule: UiSchedule;
  enabled?: boolean;
}

interface AlertEditSheetProps {
  open: boolean;
  /** Pass an existing alert for edit mode; omit for create mode. */
  alert?: AlertSummary | null;
  /** Initial schedule (computed from alert in edit mode, default for create). */
  initialSchedule: UiSchedule;
  saving?: boolean;
  testing?: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (payload: AlertSavePayload) => Promise<void> | void;
  onSendTest?: () => Promise<void> | void;
  onDelete?: () => Promise<void> | void;
}

/**
 * Sheet drawer for creating or editing an alert. The drawer holds the
 * whole form — no preview pane (sending a test is the way to see what
 * the email looks like).
 *
 * Footer actions:
 *   create mode: [Cancel] [Create alert]
 *   edit mode:   [Delete] [Send test] [Save changes]
 */
export function AlertEditSheet({
  open,
  alert,
  initialSchedule,
  saving = false,
  testing = false,
  onOpenChange,
  onSave,
  onSendTest,
  onDelete,
}: AlertEditSheetProps) {
  const isEdit = !!alert;

  const [name, setName] = React.useState(alert?.name ?? "");
  const [alertType, setAlertType] = React.useState(
    alert?.alertType ?? "weekly_snapshot",
  );
  const [customPrompt, setCustomPrompt] = React.useState(
    alert?.customPrompt ?? "",
  );
  const [recipients, setRecipients] = React.useState(alert?.recipients ?? "");
  const [schedule, setSchedule] = React.useState<UiSchedule>(initialSchedule);
  const [enabled, setEnabled] = React.useState(alert?.enabled ?? true);
  const [error, setError] = React.useState<string | null>(null);

  // Reset form whenever the sheet opens for a different alert (or moves
  // between create and edit modes).
  React.useEffect(() => {
    if (!open) return;
    setName(alert?.name ?? "");
    setAlertType(alert?.alertType ?? "weekly_snapshot");
    setCustomPrompt(alert?.customPrompt ?? "");
    setRecipients(alert?.recipients ?? "");
    setSchedule(initialSchedule);
    setEnabled(alert?.enabled ?? true);
    setError(null);
  }, [open, alert, initialSchedule]);

  const isCustom = alertType === "custom";
  const recipientList = recipients
    .split(",")
    .map((r) => r.trim())
    .filter(Boolean);
  const canSave =
    !saving &&
    recipientList.length > 0 &&
    (!isCustom || customPrompt.trim().length > 0);

  function buildPayload(): AlertSavePayload {
    return {
      name: name.trim() || autoName(alertType),
      alertType,
      customPrompt: isCustom ? customPrompt.trim() || null : null,
      recipients: recipients.trim(),
      schedule,
      enabled: isEdit ? enabled : undefined,
    };
  }

  async function handleSave() {
    setError(null);
    if (!recipientList.length) {
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
      setError(err instanceof Error ? err.message : "Could not save");
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="meaning-v2 flex w-[480px] flex-col gap-0 bg-card p-0 sm:max-w-[480px]"
        onOpenAutoFocus={(e) => {
          // Don't auto-focus the close button; let the user start typing
          // in the name field.
          e.preventDefault();
        }}
      >
        <SheetHeader className="space-y-1 px-6 pt-6 pb-4 text-left">
          <SheetTitle className="text-[16px] font-semibold tracking-[-0.01em]">
            {isEdit ? "Edit alert" : "New alert"}
          </SheetTitle>
          <SheetDescription className="text-[12.5px] text-muted-foreground">
            {isEdit
              ? "Update what's reported, who it's sent to, or when it goes out."
              : "Pick a template or describe what you want, then choose when it lands."}
          </SheetDescription>
        </SheetHeader>

        <Separator />

        {error && (
          <div className="mx-6 mt-4 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-[12.5px] text-destructive">
            {error}
          </div>
        )}

        <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5">
          <Field
            label="Name"
            hint="Optional — auto-named based on the template if blank."
          >
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={autoName(alertType)}
              autoFocus={!isEdit}
            />
          </Field>

          <Field label="Type">
            <Select value={alertType} onValueChange={setAlertType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ALERT_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          {isCustom && (
            <Field
              label="Prompt"
              hint="What should be in the email? Plain English."
            >
              <Textarea
                value={customPrompt}
                onChange={(e) => setCustomPrompt(e.target.value)}
                placeholder="e.g. Top 5 landing pages by conversion, plus any where bounce rate rose more than 10% week-over-week."
                rows={4}
              />
            </Field>
          )}

          <Field label="Schedule">
            <ScheduleControls value={schedule} onChange={setSchedule} />
          </Field>

          <Field label="Recipients">
            <EmailTagInput
              value={recipients}
              onChange={setRecipients}
              placeholder="teammate@hivory.io"
            />
          </Field>

          {isEdit && (
            <>
              <Separator />
              <Field label="Status">
                <div className="flex items-center gap-2">
                  <Switch checked={enabled} onCheckedChange={setEnabled} />
                  <span className="text-[12.5px] text-muted-foreground">
                    {enabled ? "Active — will send on schedule" : "Paused"}
                  </span>
                </div>
              </Field>
            </>
          )}
        </div>

        <Separator />

        <SheetFooter className="flex-row items-center justify-between gap-2 px-6 py-4 sm:space-x-0">
          <div className="flex items-center gap-1.5">
            {isEdit && onDelete && (
              <Button
                variant="ghost"
                size="sm"
                className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                onClick={() => {
                  if (
                    window.confirm(
                      `Delete "${alert?.name || "this alert"}"? This can’t be undone.`,
                    )
                  ) {
                    void onDelete();
                  }
                }}
                disabled={saving}
              >
                <Trash2 className="size-3.5" />
                Delete
              </Button>
            )}
          </div>
          <div className="flex items-center gap-2">
            {isEdit && onSendTest && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => void onSendTest()}
                disabled={testing}
              >
                {testing ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Send className="size-3.5" />
                )}
                Send test
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onOpenChange(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button size="sm" onClick={handleSave} disabled={!canSave}>
              {saving
                ? isEdit
                  ? "Saving…"
                  : "Creating…"
                : isEdit
                  ? "Save changes"
                  : "Create alert"}
            </Button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

/* ---------------------------------------------------------------------- */

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-[12.5px]">{label}</Label>
      {children}
      {hint && <p className="text-[11.5px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

function ScheduleControls({
  value,
  onChange,
}: {
  value: UiSchedule;
  onChange: (v: UiSchedule) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-2">
      <Select
        value={value.frequency}
        onValueChange={(v) => onChange({ ...value, frequency: v as Frequency })}
      >
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {FREQUENCY_OPTIONS.map((f) => (
            <SelectItem key={f.value} value={f.value}>
              {f.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {value.frequency !== "daily" ? (
        <Select
          value={value.day}
          onValueChange={(v) => onChange({ ...value, day: v as DayKey })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {DAY_ORDER.map((d) => (
              <SelectItem key={d} value={d}>
                {dayLong(d)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : (
        <div /> /* spacer to keep the grid balanced */
      )}

      <Select
        value={String(value.hour)}
        onValueChange={(v) => onChange({ ...value, hour: parseInt(v, 10) })}
      >
        <SelectTrigger className="col-span-2">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {TIME_SLOTS.map((h) => (
            <SelectItem key={h} value={String(h)}>
              At {formatTime(h)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
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
