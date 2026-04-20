"use client";

import { useState, useEffect } from "react";
import {
  ArrowLeft,
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmailTagInput } from "@/components/ui/email-tag-input";
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
  { key: "weekly_snapshot", label: "Weekly Snapshot", description: "Traffic summary compared to last week, top pages, traffic sources, and recommendations." },
  { key: "traffic_report", label: "Traffic Report", description: "Detailed traffic breakdown by source, medium, and channel with trends." },
  { key: "top_pages", label: "Top Pages", description: "Best-performing pages ranked by views with engagement metrics." },
  { key: "custom", label: "Custom Report", description: "Write your own prompt to get a personalised report with the data you care about." },
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

function formatScheduleShort(sendDays: string[], sendHour: number, sendMinute: number, intervalWeeks: number): string {
  const h = sendHour % 12 || 12;
  const m = sendMinute.toString().padStart(2, "0");
  const period = sendHour >= 12 ? "PM" : "AM";
  const time = `${h}:${m} ${period} GMT+2`;

  if (sendDays.length === 7) return intervalWeeks === 1 ? `Daily at ${time}` : `Every ${intervalWeeks}w, daily at ${time}`;

  const dayShorts = sendDays.map((d) => DAYS_OF_WEEK.find((dw) => dw.key === d)?.short || d);

  if (sendDays.length === 1) {
    const dayName = sendDays[0].charAt(0).toUpperCase() + sendDays[0].slice(1);
    return intervalWeeks === 1 ? `${dayName} at ${time}` : `Every ${intervalWeeks}w on ${dayName} at ${time}`;
  }

  const dayList = dayShorts.join(", ");
  return intervalWeeks === 1 ? `${dayList} at ${time}` : `Every ${intervalWeeks}w on ${dayList} at ${time}`;
}

interface EmailAlert {
  id: string;
  name: string | null;
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

interface AlertsPanelProps {
  onClose: () => void;
  orgId: string | null;
}

export default function AlertsPanel({ onClose, orgId }: AlertsPanelProps) {
  const [alerts, setAlerts] = useState<EmailAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sendingTestId, setSendingTestId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [testSuccess, setTestSuccess] = useState<string | null>(null);
  const [liveMessage, setLiveMessage] = useState<string | null>(null);

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [recipients, setRecipients] = useState("");
  const [alertType, setAlertType] = useState("weekly_snapshot");
  const [customPrompt, setCustomPrompt] = useState("");
  const [sendDays, setSendDays] = useState<string[]>(["monday"]);
  const [sendHour, setSendHour] = useState(9);
  const [sendMinute, setSendMinute] = useState(0);
  const [intervalWeeks, setIntervalWeeks] = useState(1);

  useEffect(() => {
    setLoading(true);
    resetForm();
    fetch("/api/alerts")
      .then((r) => (r.ok ? r.json() : Promise.reject("Failed to load alerts")))
      .then((data) => setAlerts(data))
      .catch((err) => setError(typeof err === "string" ? err : "Failed to load data"))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId]);

  function resetForm() {
    setShowForm(false);
    setEditingId(null);
    setName("");
    setRecipients("");
    setAlertType("weekly_snapshot");
    setCustomPrompt("");
    setSendDays(["monday"]);
    setSendHour(9);
    setSendMinute(0);
    setIntervalWeeks(1);
    setError(null);
  }

  function startEditing(alert: EmailAlert) {
    setEditingId(alert.id);
    setName(alert.name || "");
    setRecipients(alert.recipients);
    setAlertType(alert.alertType || "weekly_snapshot");
    setCustomPrompt(alert.customPrompt || "");
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
      name: name.trim() || null,
      recipients,
      alertType,
      customPrompt: alertType === "custom" ? customPrompt : null,
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
      const url = live ? `/api/alerts/${alert.id}/test-send?live=true` : `/api/alerts/${alert.id}/test-send`;
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
        if (prev.length === 1) return prev;
        return prev.filter((d) => d !== day);
      }
      return [...prev, day];
    });
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin" style={{ color: "var(--accent)" }} />
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-border px-6 py-4">
        <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8 shrink-0">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h2 className="text-sm font-semibold text-foreground">Email Alerts</h2>
          <p className="text-xs text-muted-foreground">{alerts.length} alert{alerts.length !== 1 ? "s" : ""} configured</p>
        </div>
      </div>

      {/* Messages */}
      {error && (
        <div className="mx-6 mt-4 rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive">{error}</div>
      )}
      {liveMessage && (
        <div className="mx-6 mt-4 rounded-lg px-3 py-2 text-xs" style={{ background: "rgba(16, 163, 127, 0.08)", color: "var(--accent)" }}>{liveMessage}</div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        <div className="mx-auto max-w-2xl space-y-3">

          {/* Alert list */}
          {alerts.length > 0 && !showForm && alerts.map((alert) => (
            <div
              key={alert.id}
              className="rounded-xl border border-border p-4"
              style={{ background: "var(--card-bg, var(--bg-secondary, transparent))", opacity: alert.enabled ? 1 : 0.6 }}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-medium text-foreground">
                    {alert.name || ALERT_TYPE_MAP[alert.alertType] || "Weekly Snapshot"}
                  </p>
                  {alert.name && (
                    <p className="mt-0.5 truncate text-[10px] text-muted-foreground">
                      {ALERT_TYPE_MAP[alert.alertType] || "Weekly Snapshot"}
                    </p>
                  )}
                  <p className="mt-0.5 truncate text-[10px] text-muted-foreground">{alert.recipients}</p>
                  <p className="mt-0.5 text-[10px] text-muted-foreground">
                    {formatScheduleShort(alert.sendDays || ["monday"], alert.sendHour ?? 9, alert.sendMinute ?? 0, alert.intervalWeeks ?? 1)}
                    {alert.lastSentAt ? ` · Last sent ${new Date(alert.lastSentAt).toLocaleDateString()}` : ""}
                  </p>
                  {alert.alertType === "custom" && alert.customPrompt && (
                    <p className="mt-1 line-clamp-2 text-[10px] text-muted-foreground italic">&ldquo;{alert.customPrompt}&rdquo;</p>
                  )}
                </div>
                <TooltipProvider delayDuration={300}>
                  <div className="flex shrink-0 items-center gap-0.5">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleToggle(alert)} style={{ color: alert.enabled ? "var(--accent)" : undefined }}>
                          {alert.enabled ? <Bell className="h-3.5 w-3.5" /> : <BellOff className="h-3.5 w-3.5" />}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>{alert.enabled ? "Disable" : "Enable"}</TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleTestSend(alert)} disabled={sendingTestId === alert.id} style={{ color: testSuccess === alert.id ? "var(--accent)" : undefined }}>
                          {sendingTestId === alert.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : testSuccess === alert.id ? <Check className="h-3.5 w-3.5" /> : <Send className="h-3.5 w-3.5" />}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>{sendingTestId === alert.id ? "Sending..." : testSuccess === alert.id ? "Sent!" : "Send sample test"}</TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleTestSend(alert, true)} disabled={sendingTestId === alert.id}>
                          <Play className="h-3.5 w-3.5" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Send live test (~1 min)</TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => startEditing(alert)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Edit</TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDelete(alert.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Delete</TooltipContent>
                    </Tooltip>
                  </div>
                </TooltipProvider>
              </div>
            </div>
          ))}

          {/* Empty state */}
          {alerts.length === 0 && !showForm && (
            <p className="py-8 text-center text-xs text-muted-foreground">
              No alerts yet. Create one to receive performance summaries by email.
            </p>
          )}

          {/* Form */}
          {showForm ? (
            <div className="rounded-xl border border-border p-4 space-y-4" style={{ background: "var(--card-bg, var(--bg-secondary, transparent))" }}>
              <div className="space-y-1.5">
                <Label className="text-xs">Name</Label>
                <Input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Monday Morning Traffic Report"
                  className="h-8 text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Report type</Label>
                <div className="space-y-1.5">
                  {ALERT_TYPES.map((t) => (
                    <button
                      key={t.key}
                      type="button"
                      onClick={() => setAlertType(t.key)}
                      className="flex w-full cursor-pointer items-start gap-2.5 rounded-lg border p-2.5 text-left transition-colors"
                      style={{
                        borderColor: alertType === t.key ? "var(--accent)" : "var(--border-color)",
                        background: alertType === t.key ? "rgba(16, 163, 127, 0.05)" : "transparent",
                      }}
                    >
                      <div
                        className="mt-0.5 flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full border-2"
                        style={{
                          borderColor: alertType === t.key ? "var(--accent)" : "var(--border-color)",
                          background: alertType === t.key ? "var(--accent)" : "transparent",
                        }}
                      >
                        {alertType === t.key && <div className="h-1.5 w-1.5 rounded-full" style={{ background: "#fff" }} />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium text-foreground">{t.label}</p>
                        <p className="mt-0.5 text-[10px] leading-relaxed text-muted-foreground">{t.description}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {alertType === "custom" && (
                <div className="space-y-1.5">
                  <Label className="text-xs">Your prompt</Label>
                  <textarea
                    value={customPrompt}
                    onChange={(e) => setCustomPrompt(e.target.value)}
                    placeholder='e.g. "Show me my top 5 landing pages by conversion rate..."'
                    rows={3}
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-ring"
                  />
                </div>
              )}

              <div className="space-y-1.5">
                <Label className="text-xs">Days</Label>
                <div className="flex flex-wrap gap-1">
                  {DAYS_OF_WEEK.map((d) => (
                    <Button
                      key={d.key}
                      type="button"
                      variant={sendDays.includes(d.key) ? "default" : "outline"}
                      size="sm"
                      onClick={() => toggleDay(d.key)}
                      className="h-7 min-w-[2.5rem] text-xs"
                    >
                      {d.short}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Time (GMT+2)</Label>
                <div className="flex items-center gap-2">
                  <Select value={String(sendHour)} onValueChange={(v) => setSendHour(Number(v))}>
                    <SelectTrigger className="h-8 w-24 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 24 }, (_, i) => {
                        const h = i % 12 || 12;
                        const period = i >= 12 ? "PM" : "AM";
                        return <SelectItem key={i} value={String(i)}>{h}:00 {period}</SelectItem>;
                      })}
                    </SelectContent>
                  </Select>
                  <span className="text-xs text-muted-foreground">:</span>
                  <Select value={String(sendMinute)} onValueChange={(v) => setSendMinute(Number(v))}>
                    <SelectTrigger className="h-8 w-16 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">00</SelectItem>
                      <SelectItem value="30">30</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Repeat</Label>
                <Select value={String(intervalWeeks)} onValueChange={(v) => setIntervalWeeks(Number(v))}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {INTERVAL_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={String(opt.value)}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Recipient emails</Label>
                <EmailTagInput
                  value={recipients}
                  onChange={setRecipients}
                  placeholder="teammate@company.com"
                />
              </div>

              <div className="flex gap-2 pt-1">
                <Button
                  size="sm"
                  onClick={handleSave}
                  disabled={saving || !recipients.trim() || (alertType === "custom" && !customPrompt.trim())}
                  className="text-xs"
                  style={{ background: "var(--accent)", color: "white" }}
                >
                  {saving ? "Saving..." : editingId ? "Update alert" : "Create alert"}
                </Button>
                <Button size="sm" variant="ghost" onClick={resetForm} className="text-xs">Cancel</Button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => { resetForm(); setShowForm(true); }}
              className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-border py-3 text-xs text-muted-foreground transition-colors hover:border-foreground hover:text-foreground"
            >
              <Plus className="h-3.5 w-3.5" />
              Add alert
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
