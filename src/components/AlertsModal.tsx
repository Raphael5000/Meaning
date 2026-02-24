"use client";

import { useState, useEffect } from "react";
import {
  Bell,
  BellOff,
  Check,
  Loader2,
  Pencil,
  Play,
  Plus,
  Send,
  Trash2,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const ALERT_TYPES = [
  {
    key: "weekly_snapshot",
    label: "Weekly Snapshot",
    description:
      "Traffic summary compared to last week, top pages, traffic sources, and recommendations.",
  },
  {
    key: "traffic_report",
    label: "Traffic Report",
    description:
      "Detailed traffic breakdown by source, medium, and channel with trends.",
  },
  {
    key: "top_pages",
    label: "Top Pages",
    description:
      "Best-performing pages ranked by views with engagement metrics.",
  },
  {
    key: "custom",
    label: "Custom Report",
    description:
      "Write your own prompt to get a personalised report with the data you care about.",
  },
] as const;

const ALERT_TYPE_MAP: Record<string, string> = Object.fromEntries(
  ALERT_TYPES.map((t) => [t.key, t.label])
);

const DAYS_OF_WEEK = [
  { key: "monday", short: "Mon" },
  { key: "tuesday", short: "Tue" },
  { key: "wednesday", short: "Wed" },
  { key: "thursday", short: "Thu" },
  { key: "friday", short: "Fri" },
  { key: "saturday", short: "Sat" },
  { key: "sunday", short: "Sun" },
] as const;

const INTERVAL_OPTIONS = [
  { value: 1, label: "Every week" },
  { value: 2, label: "Every 2 weeks" },
  { value: 4, label: "Every 4 weeks" },
] as const;

function formatScheduleShort(
  sendDays: string[],
  sendHour: number,
  sendMinute: number,
  intervalWeeks: number
): string {
  const h = sendHour % 12 || 12;
  const m = sendMinute.toString().padStart(2, "0");
  const period = sendHour >= 12 ? "PM" : "AM";
  const time = `${h}:${m} ${period} UTC`;

  if (sendDays.length === 7) {
    return intervalWeeks === 1 ? `Daily at ${time}` : `Every ${intervalWeeks}w, daily at ${time}`;
  }

  const dayShorts = sendDays.map((d) => {
    const found = DAYS_OF_WEEK.find((dw) => dw.key === d);
    return found ? found.short : d;
  });

  if (sendDays.length === 1) {
    const dayName = sendDays[0].charAt(0).toUpperCase() + sendDays[0].slice(1);
    if (intervalWeeks === 1) return `${dayName} at ${time}`;
    return `Every ${intervalWeeks}w on ${dayName} at ${time}`;
  }

  const dayList = dayShorts.join(", ");
  if (intervalWeeks === 1) return `${dayList} at ${time}`;
  return `Every ${intervalWeeks}w on ${dayList} at ${time}`;
}

interface EmailAlert {
  id: string;
  recipients: string;
  alertType: string;
  customPrompt: string | null;
  propertyId: string | null;
  propertyName: string | null;
  enabled: boolean;
  lastSentAt: string | null;
  createdAt: string;
  sendDays: string[];
  sendHour: number;
  sendMinute: number;
  intervalWeeks: number;
}

interface Property {
  propertyId: string;
  displayName: string;
  account: string;
}

interface AlertsModalProps {
  open: boolean;
  onClose: () => void;
}

export default function AlertsModal({ open, onClose }: AlertsModalProps) {
  const [alerts, setAlerts] = useState<EmailAlert[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sendingTestId, setSendingTestId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [testSuccess, setTestSuccess] = useState<string | null>(null);
  const [liveMessage, setLiveMessage] = useState<string | null>(null);

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [recipients, setRecipients] = useState("");
  const [alertType, setAlertType] = useState("weekly_snapshot");
  const [customPrompt, setCustomPrompt] = useState("");
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(null);
  const [selectedPropertyName, setSelectedPropertyName] = useState("");
  const [sendDays, setSendDays] = useState<string[]>(["monday"]);
  const [sendHour, setSendHour] = useState(9);
  const [sendMinute, setSendMinute] = useState(0);
  const [intervalWeeks, setIntervalWeeks] = useState(1);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setError(null);

    Promise.all([
      fetch("/api/alerts").then((r) => (r.ok ? r.json() : Promise.reject("Failed to load alerts"))),
      fetch("/api/analytics/properties").then((r) =>
        r.ok ? r.json() : Promise.reject("Failed to load properties")
      ),
    ])
      .then(([alertsData, propsData]) => {
        setAlerts(alertsData);
        setProperties(propsData.properties || []);
      })
      .catch((err) => {
        setError(typeof err === "string" ? err : "Failed to load data");
      })
      .finally(() => setLoading(false));
  }, [open]);

  function resetForm() {
    setShowForm(false);
    setEditingId(null);
    setRecipients("");
    setAlertType("weekly_snapshot");
    setCustomPrompt("");
    setSelectedPropertyId(null);
    setSelectedPropertyName("");
    setSendDays(["monday"]);
    setSendHour(9);
    setSendMinute(0);
    setIntervalWeeks(1);
    setError(null);
  }

  function startEditing(alert: EmailAlert) {
    setEditingId(alert.id);
    setRecipients(alert.recipients);
    setAlertType(alert.alertType || "weekly_snapshot");
    setCustomPrompt(alert.customPrompt || "");
    setSelectedPropertyId(alert.propertyId);
    setSelectedPropertyName(alert.propertyName || "");
    setSendDays(alert.sendDays || ["monday"]);
    setSendHour(alert.sendHour ?? 9);
    setSendMinute(alert.sendMinute ?? 0);
    setIntervalWeeks(alert.intervalWeeks ?? 1);
    setShowForm(true);
    setError(null);
  }

  async function handleSave() {
    setError(null);
    setSaving(true);

    const payload = {
      recipients,
      alertType,
      customPrompt: alertType === "custom" ? customPrompt : null,
      propertyId: selectedPropertyId,
      propertyName: selectedPropertyName || null,
      sendDays,
      sendHour,
      sendMinute,
      intervalWeeks,
    };

    try {
      if (editingId) {
        const res = await fetch(`/api/alerts/${editingId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const text = await res.text();
          let msg = "Failed to update alert";
          try { msg = JSON.parse(text).error || msg; } catch {}
          throw new Error(msg);
        }
        const updated = await res.json();
        setAlerts((prev) => prev.map((a) => (a.id === editingId ? updated : a)));
      } else {
        const res = await fetch("/api/alerts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const text = await res.text();
          let msg = "Failed to create alert";
          try { msg = JSON.parse(text).error || msg; } catch {}
          throw new Error(msg);
        }
        const created = await res.json();
        setAlerts((prev) => [created, ...prev]);
      }
      resetForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  async function handleToggle(alert: EmailAlert) {
    try {
      const res = await fetch(`/api/alerts/${alert.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: !alert.enabled }),
      });
      if (!res.ok) throw new Error();
      const updated = await res.json();
      setAlerts((prev) => prev.map((a) => (a.id === alert.id ? updated : a)));
    } catch {
      setError("Failed to toggle alert");
    }
  }

  async function handleDelete(id: string) {
    try {
      const res = await fetch(`/api/alerts/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      setAlerts((prev) => prev.filter((a) => a.id !== id));
      if (editingId === id) resetForm();
    } catch {
      setError("Failed to delete alert");
    }
  }

  async function handleTestSend(alert: EmailAlert, live = false) {
    setSendingTestId(alert.id);
    setError(null);
    setTestSuccess(null);
    setLiveMessage(null);

    try {
      const url = live
        ? `/api/alerts/${alert.id}/test-send?live=true`
        : `/api/alerts/${alert.id}/test-send`;
      const res = await fetch(url, { method: "POST" });
      if (!res.ok) {
        const text = await res.text();
        let msg = "Failed to send test email";
        try { msg = JSON.parse(text).error || msg; } catch {}
        throw new Error(msg);
      }
      const data = await res.json();
      setTestSuccess(alert.id);
      if (live && data.message) {
        setLiveMessage(data.message);
        setTimeout(() => setLiveMessage(null), 10000);
      }
      setTimeout(() => setTestSuccess(null), live ? 5000 : 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send test email");
    } finally {
      setSendingTestId(null);
    }
  }

  function toggleDay(day: string) {
    setSendDays((prev) => {
      if (prev.includes(day)) {
        // Don't allow removing the last day
        if (prev.length === 1) return prev;
        return prev.filter((d) => d !== day);
      }
      return [...prev, day];
    });
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) onClose(); }}>
      <DialogContent className="flex max-h-[80vh] flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle>Email Alerts</DialogTitle>
          <DialogDescription className="sr-only">
            Manage your email alert subscriptions
          </DialogDescription>
        </DialogHeader>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              {/* Error message */}
              {error && (
                <div className="mb-4 rounded-lg bg-muted px-3 py-2 text-sm text-destructive">
                  {error}
                </div>
              )}

              {/* Live test status */}
              {liveMessage && (
                <div className="mb-4 rounded-lg bg-muted px-3 py-2 text-sm text-primary">
                  {liveMessage}
                </div>
              )}

              {/* Existing alerts list */}
              {alerts.length > 0 && !showForm && (
                <div className="mb-4 space-y-3">
                  {alerts.map((alert) => (
                    <div
                      key={alert.id}
                      className="rounded-lg border border-border p-3"
                      style={{ opacity: alert.enabled ? 1 : 0.6 }}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-foreground">
                            {alert.propertyName || "All properties"}
                          </p>
                          <p className="mt-0.5 truncate text-xs text-muted-foreground">
                            {alert.recipients}
                          </p>
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            {ALERT_TYPE_MAP[alert.alertType] || "Weekly Snapshot"}
                            {" · "}
                            {formatScheduleShort(
                              alert.sendDays || ["monday"],
                              alert.sendHour ?? 9,
                              alert.sendMinute ?? 0,
                              alert.intervalWeeks ?? 1
                            )}
                            {alert.lastSentAt
                              ? ` · Last sent ${new Date(alert.lastSentAt).toLocaleDateString()}`
                              : " · Not sent yet"}
                          </p>
                          {alert.alertType === "custom" && alert.customPrompt && (
                            <p className="mt-1 line-clamp-2 text-xs text-muted-foreground italic">
                              &ldquo;{alert.customPrompt}&rdquo;
                            </p>
                          )}
                        </div>
                        <TooltipProvider delayDuration={300}>
                          <div className="flex shrink-0 items-center gap-1">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleToggle(alert)}
                                  style={{ color: alert.enabled ? "var(--accent)" : undefined }}
                                >
                                  {alert.enabled ? (
                                    <Bell className="h-4 w-4" />
                                  ) : (
                                    <BellOff className="h-4 w-4" />
                                  )}
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                {alert.enabled ? "Disable" : "Enable"}
                              </TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleTestSend(alert)}
                                  disabled={sendingTestId === alert.id}
                                  style={{
                                    color:
                                      testSuccess === alert.id
                                        ? "var(--accent)"
                                        : undefined,
                                  }}
                                >
                                  {sendingTestId === alert.id ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : testSuccess === alert.id ? (
                                    <Check className="h-4 w-4" />
                                  ) : (
                                    <Send className="h-4 w-4" />
                                  )}
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                {sendingTestId === alert.id
                                  ? "Sending..."
                                  : testSuccess === alert.id
                                    ? "Sent!"
                                    : "Send sample test"}
                              </TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleTestSend(alert, true)}
                                  disabled={sendingTestId === alert.id}
                                >
                                  <Play className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                Send live test (real data, ~1 min)
                              </TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => startEditing(alert)}
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Edit</TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleDelete(alert.id)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Delete</TooltipContent>
                            </Tooltip>
                          </div>
                        </TooltipProvider>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Form */}
              {showForm ? (
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <Label>Property</Label>
                    <Select
                      value={selectedPropertyId || "__all__"}
                      onValueChange={(value) => {
                        if (value === "__all__") {
                          setSelectedPropertyId(null);
                          setSelectedPropertyName("");
                        } else {
                          const prop = properties.find(
                            (p) => p.propertyId === value
                          );
                          setSelectedPropertyId(value);
                          setSelectedPropertyName(prop?.displayName || "");
                        }
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="All properties" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__all__">All properties</SelectItem>
                        {properties.map((p) => (
                          <SelectItem key={p.propertyId} value={p.propertyId}>
                            {p.displayName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label>Report type</Label>
                    <div className="space-y-2">
                      {ALERT_TYPES.map((t) => (
                        <button
                          key={t.key}
                          type="button"
                          onClick={() => setAlertType(t.key)}
                          className="flex w-full cursor-pointer items-start gap-3 rounded-lg border p-3 text-left transition-colors"
                          style={{
                            borderColor:
                              alertType === t.key
                                ? "var(--accent)"
                                : "var(--border-color)",
                            background:
                              alertType === t.key
                                ? "var(--bg-tertiary)"
                                : "var(--bg-secondary)",
                          }}
                        >
                          <div
                            className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2"
                            style={{
                              borderColor:
                                alertType === t.key
                                  ? "var(--accent)"
                                  : "var(--border-color)",
                              background:
                                alertType === t.key
                                  ? "var(--accent)"
                                  : "transparent",
                            }}
                          >
                            {alertType === t.key && (
                              <div
                                className="h-1.5 w-1.5 rounded-full"
                                style={{ background: "#fff" }}
                              />
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-foreground">
                              {t.label}
                            </p>
                            <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                              {t.description}
                            </p>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Custom prompt textarea */}
                  {alertType === "custom" && (
                    <div className="space-y-1.5">
                      <Label>Your prompt</Label>
                      <textarea
                        value={customPrompt}
                        onChange={(e) => setCustomPrompt(e.target.value)}
                        placeholder='e.g. "Show me my top 5 landing pages by conversion rate this week vs last week, and highlight any pages where bounce rate increased by more than 10%"'
                        rows={4}
                        className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-ring"
                      />
                      <p className="text-xs text-muted-foreground">
                        Describe what you want in your report in plain English. The AI will fetch the relevant data and format it nicely in the email.
                      </p>
                    </div>
                  )}

                  {/* Schedule: Days */}
                  <div className="space-y-1.5">
                    <Label>Days</Label>
                    <div className="flex flex-wrap gap-1.5">
                      {DAYS_OF_WEEK.map((d) => (
                        <Button
                          key={d.key}
                          type="button"
                          variant={sendDays.includes(d.key) ? "default" : "outline"}
                          size="sm"
                          onClick={() => toggleDay(d.key)}
                          className="min-w-[3rem]"
                        >
                          {d.short}
                        </Button>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Select the days you want to receive this alert
                    </p>
                  </div>

                  {/* Schedule: Time */}
                  <div className="space-y-1.5">
                    <Label>Time (UTC)</Label>
                    <div className="flex items-center gap-2">
                      <Select
                        value={String(sendHour)}
                        onValueChange={(v) => setSendHour(Number(v))}
                      >
                        <SelectTrigger className="w-24">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Array.from({ length: 24 }, (_, i) => {
                            const h = i % 12 || 12;
                            const period = i >= 12 ? "PM" : "AM";
                            return (
                              <SelectItem key={i} value={String(i)}>
                                {h}:00 {period}
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                      <span className="text-sm text-muted-foreground">:</span>
                      <Select
                        value={String(sendMinute)}
                        onValueChange={(v) => setSendMinute(Number(v))}
                      >
                        <SelectTrigger className="w-20">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="0">00</SelectItem>
                          <SelectItem value="30">30</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Schedule: Interval */}
                  <div className="space-y-1.5">
                    <Label>Repeat</Label>
                    <Select
                      value={String(intervalWeeks)}
                      onValueChange={(v) => setIntervalWeeks(Number(v))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {INTERVAL_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={String(opt.value)}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label>Recipient emails</Label>
                    <Input
                      type="text"
                      value={recipients}
                      onChange={(e) => setRecipients(e.target.value)}
                      placeholder="email@example.com, another@example.com"
                    />
                    <p className="text-xs text-muted-foreground">
                      Separate multiple emails with commas
                    </p>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <Button
                      onClick={handleSave}
                      disabled={saving || !recipients.trim() || (alertType === "custom" && !customPrompt.trim())}
                    >
                      {saving
                        ? "Saving..."
                        : editingId
                          ? "Update alert"
                          : "Create alert"}
                    </Button>
                    <Button variant="outline" onClick={resetForm}>
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <Button
                  variant="outline"
                  className="w-full border-dashed"
                  onClick={() => {
                    resetForm();
                    setShowForm(true);
                  }}
                >
                  <Plus className="h-4 w-4" />
                  Add alert
                </Button>
              )}

              {/* Empty state */}
              {alerts.length === 0 && !showForm && (
                <p className="mt-2 text-center text-sm text-muted-foreground">
                  No alerts yet. Create one to receive performance summaries by email.
                </p>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
