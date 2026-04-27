"use client";

import * as React from "react";
import { AlertsIndex, type AlertSummary } from "./AlertsIndex";
import { AlertCreate } from "./AlertCreate";
import { AlertDetail } from "./AlertDetail";
import { uiToDb, type UiSchedule } from "./schedule";

interface AlertsPanelV2Props {
  onClose: () => void;
  orgId: string | null;
}

type View =
  | { kind: "index" }
  | { kind: "create" }
  | { kind: "detail"; id: string };

interface SavePayload {
  name: string;
  alertType: string;
  customPrompt: string | null;
  recipients: string;
  schedule: UiSchedule;
  enabled?: boolean;
}

export default function AlertsPanelV2({ onClose, orgId }: AlertsPanelV2Props) {
  const [alerts, setAlerts] = React.useState<AlertSummary[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [view, setView] = React.useState<View>({ kind: "index" });
  const [saving, setSaving] = React.useState(false);
  const [testing, setTesting] = React.useState(false);
  const [toast, setToast] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/alerts");
      if (!res.ok) throw new Error("Failed to load alerts");
      const data = (await res.json()) as AlertSummary[];
      setAlerts(Array.isArray(data) ? data : []);
    } catch {
      setAlerts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    load();
  }, [load, orgId]);

  // Auto-clear toast
  React.useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  function showToast(msg: string) {
    setToast(msg);
  }

  async function createAlert(payload: SavePayload) {
    setSaving(true);
    try {
      const db = uiToDb(payload.schedule);
      const res = await fetch("/api/alerts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: payload.name,
          recipients: payload.recipients,
          alertType: payload.alertType,
          customPrompt: payload.customPrompt,
          sendDays: db.sendDays,
          sendHour: db.sendHour,
          sendMinute: db.sendMinute,
          intervalWeeks: db.intervalWeeks,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(
          (err as { error?: string }).error || "Could not create alert",
        );
      }
      const created = (await res.json()) as AlertSummary;
      setAlerts((prev) => [created, ...prev]);
      setView({ kind: "detail", id: created.id });
      showToast("Alert created — first email will land on schedule.");
    } finally {
      setSaving(false);
    }
  }

  async function updateAlert(id: string, payload: SavePayload) {
    setSaving(true);
    try {
      const db = uiToDb(payload.schedule);
      const res = await fetch(`/api/alerts/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: payload.name,
          recipients: payload.recipients,
          alertType: payload.alertType,
          customPrompt: payload.customPrompt,
          enabled: payload.enabled,
          sendDays: db.sendDays,
          sendHour: db.sendHour,
          sendMinute: db.sendMinute,
          intervalWeeks: db.intervalWeeks,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(
          (err as { error?: string }).error || "Could not save changes",
        );
      }
      const updated = (await res.json()) as AlertSummary;
      setAlerts((prev) => prev.map((a) => (a.id === id ? updated : a)));
      showToast("Saved.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteAlert(id: string) {
    try {
      const res = await fetch(`/api/alerts/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Could not delete alert");
      setAlerts((prev) => prev.filter((a) => a.id !== id));
      if (view.kind === "detail" && view.id === id) {
        setView({ kind: "index" });
      }
      showToast("Alert deleted.");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Could not delete");
    }
  }

  async function toggleAlert(id: string, enabled: boolean) {
    setAlerts((prev) =>
      prev.map((a) => (a.id === id ? { ...a, enabled } : a)),
    );
    try {
      await fetch(`/api/alerts/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled }),
      });
    } catch {
      // Revert on failure
      setAlerts((prev) =>
        prev.map((a) => (a.id === id ? { ...a, enabled: !enabled } : a)),
      );
      showToast("Could not update — try again.");
    }
  }

  async function sendTest(id: string) {
    setTesting(true);
    try {
      const res = await fetch(`/api/alerts/${id}/test-send`, {
        method: "POST",
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(
          (err as { error?: string }).error || "Could not send test",
        );
      }
      showToast("Test email sent.");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Could not send test");
    } finally {
      setTesting(false);
    }
  }

  // Send test BEFORE the alert is saved (from create flow). Posts to a
  // temporary endpoint; falls back to "save then test" if not available.
  async function sendTestUnsaved(payload: SavePayload) {
    setTesting(true);
    try {
      const db = uiToDb(payload.schedule);
      const res = await fetch("/api/alerts/preview-send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: payload.name,
          recipients: payload.recipients,
          alertType: payload.alertType,
          customPrompt: payload.customPrompt,
          sendDays: db.sendDays,
          sendHour: db.sendHour,
          sendMinute: db.sendMinute,
          intervalWeeks: db.intervalWeeks,
        }),
      });
      if (res.ok) {
        showToast("Test email sent.");
        return;
      }
      // Fallback: save then test (user pays the cost of an extra round-trip
      // if /preview-send isn't deployed yet — won't lose work).
      throw new Error("Preview-send endpoint not available");
    } catch {
      showToast(
        "Save the alert first to send a test (preview endpoint not deployed yet).",
      );
    } finally {
      setTesting(false);
    }
  }

  // -- render --

  if (view.kind === "index") {
    return (
      <Frame toast={toast} onClose={onClose}>
        <AlertsIndex
          alerts={alerts}
          loading={loading}
          onCreate={() => setView({ kind: "create" })}
          onOpen={(id) => setView({ kind: "detail", id })}
          onDelete={deleteAlert}
          onToggle={toggleAlert}
        />
      </Frame>
    );
  }

  if (view.kind === "create") {
    return (
      <Frame toast={toast} onClose={onClose}>
        <AlertCreate
          onCancel={() => setView({ kind: "index" })}
          onSave={createAlert}
          onSendTest={sendTestUnsaved}
          saving={saving}
          testing={testing}
        />
      </Frame>
    );
  }

  // detail
  const alert = alerts.find((a) => a.id === view.id);
  if (!alert) {
    // Alert disappeared (deleted or 404). Fall back to index.
    return (
      <Frame toast={toast} onClose={onClose}>
        <AlertsIndex
          alerts={alerts}
          loading={loading}
          onCreate={() => setView({ kind: "create" })}
          onOpen={(id) => setView({ kind: "detail", id })}
          onDelete={deleteAlert}
          onToggle={toggleAlert}
        />
      </Frame>
    );
  }
  return (
    <Frame toast={toast} onClose={onClose}>
      <AlertDetail
        alert={alert}
        onBack={() => setView({ kind: "index" })}
        onSave={(p) => updateAlert(alert.id, p)}
        onSendTest={() => sendTest(alert.id)}
        onDelete={() => deleteAlert(alert.id)}
        saving={saving}
        testing={testing}
      />
    </Frame>
  );
}

/** Sidebar-less frame — the v2 Sidebar is provided by ChatV2 around us. */
function Frame({
  children,
  toast,
}: {
  children: React.ReactNode;
  toast: string | null;
  onClose: () => void;
}) {
  return (
    <div
      style={{
        position: "relative",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        background: "var(--v2-bg)",
        overflow: "hidden",
      }}
    >
      {children}
      {toast && (
        <div
          role="status"
          style={{
            position: "absolute",
            bottom: 24,
            left: "50%",
            transform: "translateX(-50%)",
            padding: "10px 16px",
            background: "var(--v2-ink)",
            color: "var(--v2-ink-inverse)",
            borderRadius: 999,
            fontSize: 12.5,
            fontFamily: "var(--v2-font-sans)",
            boxShadow: "var(--v2-shadow-pop)",
            zIndex: 50,
          }}
        >
          {toast}
        </div>
      )}
    </div>
  );
}
