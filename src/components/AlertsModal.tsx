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
] as const;

const ALERT_TYPE_MAP: Record<string, string> = Object.fromEntries(
  ALERT_TYPES.map((t) => [t.key, t.label])
);

interface EmailAlert {
  id: string;
  recipients: string;
  frequency: string;
  alertType: string;
  propertyId: string | null;
  propertyName: string | null;
  enabled: boolean;
  lastSentAt: string | null;
  createdAt: string;
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
  const [frequency, setFrequency] = useState("weekly");
  const [alertType, setAlertType] = useState("weekly_snapshot");
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(null);
  const [selectedPropertyName, setSelectedPropertyName] = useState("");

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
    setFrequency("weekly");
    setAlertType("weekly_snapshot");
    setSelectedPropertyId(null);
    setSelectedPropertyName("");
    setError(null);
  }

  function startEditing(alert: EmailAlert) {
    setEditingId(alert.id);
    setRecipients(alert.recipients);
    setFrequency(alert.frequency);
    setAlertType(alert.alertType || "weekly_snapshot");
    setSelectedPropertyId(alert.propertyId);
    setSelectedPropertyName(alert.propertyName || "");
    setShowForm(true);
    setError(null);
  }

  async function handleSave() {
    setError(null);
    setSaving(true);

    const payload = {
      recipients,
      frequency,
      alertType,
      propertyId: selectedPropertyId,
      propertyName: selectedPropertyName || null,
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
                            {alert.frequency.charAt(0).toUpperCase() + alert.frequency.slice(1)}
                            {alert.lastSentAt
                              ? ` · Last sent ${new Date(alert.lastSentAt).toLocaleDateString()}`
                              : " · Not sent yet"}
                          </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleToggle(alert)}
                            title={alert.enabled ? "Disable" : "Enable"}
                            style={{ color: alert.enabled ? "var(--accent)" : undefined }}
                          >
                            {alert.enabled ? (
                              <Bell className="h-4 w-4" />
                            ) : (
                              <BellOff className="h-4 w-4" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleTestSend(alert)}
                            disabled={sendingTestId === alert.id}
                            title={
                              sendingTestId === alert.id
                                ? "Sending..."
                                : testSuccess === alert.id
                                  ? "Sent!"
                                  : "Send sample test"
                            }
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
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleTestSend(alert, true)}
                            disabled={sendingTestId === alert.id}
                            title="Send live test (real data, ~1 min)"
                          >
                            <Play className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => startEditing(alert)}
                            title="Edit"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(alert.id)}
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
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

                  <div className="space-y-1.5">
                    <Label>Frequency</Label>
                    <div className="flex gap-2">
                      {(["daily", "weekly", "monthly"] as const).map((f) => (
                        <Button
                          key={f}
                          type="button"
                          variant={frequency === f ? "default" : "outline"}
                          size="sm"
                          onClick={() => setFrequency(f)}
                        >
                          {f.charAt(0).toUpperCase() + f.slice(1)}
                        </Button>
                      ))}
                    </div>
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
                      disabled={saving || !recipients.trim()}
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
