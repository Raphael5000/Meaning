"use client";

import { useState, useEffect, useRef } from "react";

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

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [recipients, setRecipients] = useState("");
  const [frequency, setFrequency] = useState("weekly");
  const [alertType, setAlertType] = useState("weekly_snapshot");
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(null);
  const [selectedPropertyName, setSelectedPropertyName] = useState("");

  const backdropRef = useRef<HTMLDivElement>(null);

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
          const data = await res.json();
          throw new Error(data.error || "Failed to update alert");
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
          const data = await res.json();
          throw new Error(data.error || "Failed to create alert");
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

  async function handleTestSend(alert: EmailAlert) {
    setSendingTestId(alert.id);
    setError(null);
    setTestSuccess(null);

    try {
      const res = await fetch(`/api/alerts/${alert.id}/test-send`, {
        method: "POST",
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to send test email");
      }
      setTestSuccess(alert.id);
      setTimeout(() => setTestSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send test email");
    } finally {
      setSendingTestId(null);
    }
  }

  if (!open) return null;

  return (
    <div
      ref={backdropRef}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50"
      onClick={(e) => {
        if (e.target === backdropRef.current) onClose();
      }}
    >
      <div
        className="relative mx-4 flex max-h-[80vh] w-full max-w-lg flex-col overflow-hidden rounded-xl shadow-xl"
        style={{
          background: "var(--bg-primary)",
          border: "1px solid var(--border-color)",
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between border-b px-5 py-4"
          style={{ borderColor: "var(--border-color)" }}
        >
          <h2
            className="text-lg font-semibold"
            style={{ color: "var(--text-primary)" }}
          >
            Email Alerts
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer rounded-lg p-1 transition-colors hover:bg-[var(--bg-hover)]"
            style={{ color: "var(--text-muted)" }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div
                className="h-5 w-5 animate-spin rounded-full border-2 border-current"
                style={{ borderTopColor: "transparent", color: "var(--text-muted)" }}
              />
            </div>
          ) : (
            <>
              {/* Error message */}
              {error && (
                <div
                  className="mb-4 rounded-lg px-3 py-2 text-sm"
                  style={{ color: "var(--error)", background: "var(--bg-tertiary)" }}
                >
                  {error}
                </div>
              )}

              {/* Existing alerts list */}
              {alerts.length > 0 && !showForm && (
                <div className="mb-4 space-y-3">
                  {alerts.map((alert) => (
                    <div
                      key={alert.id}
                      className="rounded-lg border p-3"
                      style={{
                        borderColor: "var(--border-color)",
                        opacity: alert.enabled ? 1 : 0.6,
                      }}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p
                            className="truncate text-sm font-medium"
                            style={{ color: "var(--text-primary)" }}
                          >
                            {alert.propertyName || "All properties"}
                          </p>
                          <p
                            className="mt-0.5 truncate text-xs"
                            style={{ color: "var(--text-muted)" }}
                          >
                            {alert.recipients}
                          </p>
                          <p
                            className="mt-0.5 text-xs"
                            style={{ color: "var(--text-muted)" }}
                          >
                            {ALERT_TYPE_MAP[alert.alertType] || "Weekly Snapshot"}
                            {" · "}
                            {alert.frequency.charAt(0).toUpperCase() + alert.frequency.slice(1)}
                            {alert.lastSentAt
                              ? ` · Last sent ${new Date(alert.lastSentAt).toLocaleDateString()}`
                              : " · Not sent yet"}
                          </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-1">
                          {/* Toggle */}
                          <button
                            type="button"
                            onClick={() => handleToggle(alert)}
                            className="cursor-pointer rounded-lg p-1.5 transition-colors hover:bg-[var(--bg-hover)]"
                            style={{ color: alert.enabled ? "var(--accent)" : "var(--text-muted)" }}
                            title={alert.enabled ? "Disable" : "Enable"}
                          >
                            {alert.enabled ? (
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                              </svg>
                            ) : (
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                                <path d="M18.63 13A17.89 17.89 0 0 1 18 8" />
                                <path d="M6.26 6.26A5.86 5.86 0 0 0 6 8c0 7-3 9-3 9h14" />
                                <path d="M18 8a6 6 0 0 0-9.33-5" />
                                <line x1="1" y1="1" x2="23" y2="23" />
                              </svg>
                            )}
                          </button>
                          {/* Send Test */}
                          <button
                            type="button"
                            onClick={() => handleTestSend(alert)}
                            disabled={sendingTestId === alert.id}
                            className="cursor-pointer rounded-lg p-1.5 transition-colors hover:bg-[var(--bg-hover)] disabled:cursor-not-allowed disabled:opacity-50"
                            style={{
                              color:
                                testSuccess === alert.id
                                  ? "var(--accent)"
                                  : "var(--text-muted)",
                            }}
                            title={
                              sendingTestId === alert.id
                                ? "Sending..."
                                : testSuccess === alert.id
                                  ? "Test sent!"
                                  : "Send test email"
                            }
                          >
                            {sendingTestId === alert.id ? (
                              <div
                                className="h-4 w-4 animate-spin rounded-full border-2 border-current"
                                style={{ borderTopColor: "transparent" }}
                              />
                            ) : testSuccess === alert.id ? (
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <polyline points="20 6 9 17 4 12" />
                              </svg>
                            ) : (
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <line x1="22" y1="2" x2="11" y2="13" />
                                <polygon points="22 2 15 22 11 13 2 9 22 2" />
                              </svg>
                            )}
                          </button>
                          {/* Edit */}
                          <button
                            type="button"
                            onClick={() => startEditing(alert)}
                            className="cursor-pointer rounded-lg p-1.5 transition-colors hover:bg-[var(--bg-hover)]"
                            style={{ color: "var(--text-muted)" }}
                            title="Edit"
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                            </svg>
                          </button>
                          {/* Delete */}
                          <button
                            type="button"
                            onClick={() => handleDelete(alert.id)}
                            className="cursor-pointer rounded-lg p-1.5 transition-colors hover:bg-[var(--bg-hover)]"
                            style={{ color: "var(--text-muted)" }}
                            title="Delete"
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <polyline points="3 6 5 6 21 6" />
                              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Form */}
              {showForm ? (
                <div className="space-y-4">
                  <div>
                    <label
                      className="mb-1.5 block text-sm font-medium"
                      style={{ color: "var(--text-primary)" }}
                    >
                      Property
                    </label>
                    <select
                      value={selectedPropertyId || ""}
                      onChange={(e) => {
                        const prop = properties.find(
                          (p) => p.propertyId === e.target.value
                        );
                        setSelectedPropertyId(e.target.value || null);
                        setSelectedPropertyName(prop?.displayName || "");
                      }}
                      className="w-full cursor-pointer rounded-lg border px-3 py-2 text-sm outline-none"
                      style={{
                        background: "var(--bg-secondary)",
                        borderColor: "var(--border-color)",
                        color: "var(--text-primary)",
                      }}
                    >
                      <option value="">All properties</option>
                      {properties.map((p) => (
                        <option key={p.propertyId} value={p.propertyId}>
                          {p.displayName}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label
                      className="mb-1.5 block text-sm font-medium"
                      style={{ color: "var(--text-primary)" }}
                    >
                      Report type
                    </label>
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
                            <p
                              className="text-sm font-medium"
                              style={{ color: "var(--text-primary)" }}
                            >
                              {t.label}
                            </p>
                            <p
                              className="mt-0.5 text-xs leading-relaxed"
                              style={{ color: "var(--text-muted)" }}
                            >
                              {t.description}
                            </p>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label
                      className="mb-1.5 block text-sm font-medium"
                      style={{ color: "var(--text-primary)" }}
                    >
                      Frequency
                    </label>
                    <div className="flex gap-2">
                      {(["daily", "weekly", "monthly"] as const).map((f) => (
                        <button
                          key={f}
                          type="button"
                          onClick={() => setFrequency(f)}
                          className="cursor-pointer rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors"
                          style={{
                            borderColor:
                              frequency === f
                                ? "var(--accent)"
                                : "var(--border-color)",
                            background:
                              frequency === f
                                ? "var(--accent)"
                                : "var(--bg-secondary)",
                            color: frequency === f ? "#fff" : "var(--text-primary)",
                          }}
                        >
                          {f.charAt(0).toUpperCase() + f.slice(1)}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label
                      className="mb-1.5 block text-sm font-medium"
                      style={{ color: "var(--text-primary)" }}
                    >
                      Recipient emails
                    </label>
                    <input
                      type="text"
                      value={recipients}
                      onChange={(e) => setRecipients(e.target.value)}
                      placeholder="email@example.com, another@example.com"
                      className="w-full rounded-lg border px-3 py-2 text-sm outline-none transition-colors focus:ring-1"
                      style={{
                        background: "var(--bg-secondary)",
                        borderColor: "var(--border-color)",
                        color: "var(--text-primary)",
                      }}
                    />
                    <p
                      className="mt-1 text-xs"
                      style={{ color: "var(--text-muted)" }}
                    >
                      Separate multiple emails with commas
                    </p>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <button
                      type="button"
                      onClick={handleSave}
                      disabled={saving || !recipients.trim()}
                      className="cursor-pointer rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors disabled:cursor-not-allowed disabled:opacity-50"
                      style={{ background: "var(--accent)" }}
                    >
                      {saving
                        ? "Saving..."
                        : editingId
                          ? "Update alert"
                          : "Create alert"}
                    </button>
                    <button
                      type="button"
                      onClick={resetForm}
                      className="cursor-pointer rounded-lg border px-4 py-2 text-sm font-medium transition-colors hover:bg-[var(--bg-hover)]"
                      style={{
                        borderColor: "var(--border-color)",
                        color: "var(--text-primary)",
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    resetForm();
                    setShowForm(true);
                  }}
                  className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed px-4 py-3 text-sm font-medium transition-colors hover:bg-[var(--bg-hover)]"
                  style={{
                    borderColor: "var(--border-color)",
                    color: "var(--text-secondary)",
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                  Add alert
                </button>
              )}

              {/* Empty state */}
              {alerts.length === 0 && !showForm && (
                <p
                  className="mt-2 text-center text-sm"
                  style={{ color: "var(--text-muted)" }}
                >
                  No alerts yet. Create one to receive performance summaries by email.
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
