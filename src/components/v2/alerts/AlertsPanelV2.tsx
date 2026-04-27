"use client";

import * as React from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";

import { Page, PageBody, PageHeader } from "../layout";
import { Button } from "@/components/ui/button";
import { AlertsList } from "./AlertsList";
import { AlertEditSheet, type AlertSavePayload } from "./AlertEditSheet";
import { dbToUi, uiToDb, type UiSchedule } from "./schedule";
import type { AlertSummary } from "./types";

interface AlertsPanelV2Props {
  /** Provided by ChatV2 for symmetry with other panels; currently unused
   *  because the AppShell sidebar handles navigation. */
  onClose?: () => void;
  orgId: string | null;
}

const DEFAULT_SCHEDULE: UiSchedule = {
  frequency: "weekly",
  day: "monday",
  hour: 9,
};

/**
 * Alerts panel — list view + create/edit Sheet drawer.
 *
 * Replaces the old multi-route panel (index / create / detail) with a
 * single Table + Sheet pattern. Sending a test (existing API) is the
 * way to preview what the email looks like.
 */
export default function AlertsPanelV2({ orgId }: AlertsPanelV2Props) {
  const [alerts, setAlerts] = React.useState<AlertSummary[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [testing, setTesting] = React.useState(false);

  // Sheet state — null = closed, "create" = new, "<id>" = edit existing.
  const [editingId, setEditingId] = React.useState<string | "create" | null>(
    null,
  );

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/alerts");
      if (!res.ok) throw new Error("Failed to load alerts");
      const data = (await res.json()) as AlertSummary[];
      setAlerts(Array.isArray(data) ? data : []);
    } catch {
      setAlerts([]);
      toast.error("Could not load alerts.");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    load();
  }, [load, orgId]);

  // Keyboard: N → new alert.
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const editing =
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.isContentEditable;
      if (editing || editingId !== null) return;
      if (e.key === "n" || e.key === "N") {
        if (e.metaKey || e.ctrlKey || e.altKey) return;
        e.preventDefault();
        setEditingId("create");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [editingId]);

  const editingAlert =
    editingId && editingId !== "create"
      ? alerts.find((a) => a.id === editingId) ?? null
      : null;

  const initialSchedule = editingAlert
    ? dbToUi({
        sendDays: editingAlert.sendDays,
        sendHour: editingAlert.sendHour,
        sendMinute: editingAlert.sendMinute,
        intervalWeeks: editingAlert.intervalWeeks,
      })
    : DEFAULT_SCHEDULE;

  /* -------------------------------- API -------------------------------- */

  async function createAlert(payload: AlertSavePayload) {
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
        const err = (await res.json().catch(() => ({}))) as {
          error?: string;
        };
        throw new Error(err.error || "Could not create alert");
      }
      const created = (await res.json()) as AlertSummary;
      setAlerts((prev) => [created, ...prev]);
      setEditingId(null);
      toast.success("Alert created — first email will land on schedule.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not create");
      throw err;
    } finally {
      setSaving(false);
    }
  }

  async function updateAlert(id: string, payload: AlertSavePayload) {
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
        const err = (await res.json().catch(() => ({}))) as {
          error?: string;
        };
        throw new Error(err.error || "Could not save changes");
      }
      const updated = (await res.json()) as AlertSummary;
      setAlerts((prev) => prev.map((a) => (a.id === id ? updated : a)));
      setEditingId(null);
      toast.success("Saved.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save");
      throw err;
    } finally {
      setSaving(false);
    }
  }

  async function deleteAlert(id: string) {
    try {
      const res = await fetch(`/api/alerts/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Could not delete alert");
      setAlerts((prev) => prev.filter((a) => a.id !== id));
      if (editingId === id) setEditingId(null);
      toast.success("Alert deleted.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not delete");
    }
  }

  async function toggleAlert(id: string, enabled: boolean) {
    setAlerts((prev) =>
      prev.map((a) => (a.id === id ? { ...a, enabled } : a)),
    );
    try {
      const res = await fetch(`/api/alerts/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled }),
      });
      if (!res.ok) throw new Error("Could not update");
    } catch {
      // Revert on failure
      setAlerts((prev) =>
        prev.map((a) => (a.id === id ? { ...a, enabled: !enabled } : a)),
      );
      toast.error("Could not update — try again.");
    }
  }

  async function sendTestSaved(id: string) {
    setTesting(true);
    try {
      const res = await fetch(`/api/alerts/${id}/test-send`, {
        method: "POST",
      });
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as {
          error?: string;
        };
        throw new Error(err.error || "Could not send test");
      }
      toast.success("Test email sent.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not send test");
    } finally {
      setTesting(false);
    }
  }

  /* -------------------------------- render ----------------------------- */

  return (
    <Page className="meaning-v2">
      <PageHeader
        breadcrumb={["Alerts"]}
        actions={
          <Button size="sm" onClick={() => setEditingId("create")}>
            <Plus className="size-3.5" />
            Create alert
          </Button>
        }
      />

      <PageBody contained="default" padding="default">
        <header className="mb-6">
          <h1 className="text-[24px] font-semibold tracking-[-0.02em] text-foreground">
            Alerts
          </h1>
          <p className="mt-1.5 text-[13px] text-muted-foreground">
            Reports in your inbox on the schedule you choose. Press{" "}
            <kbd className="kbd-key">N</kbd> to create a new one.
          </p>
        </header>

        <AlertsList
          alerts={alerts}
          loading={loading}
          onOpen={(id) => setEditingId(id)}
          onToggle={toggleAlert}
          onDelete={deleteAlert}
        />
      </PageBody>

      <AlertEditSheet
        open={editingId !== null}
        alert={editingAlert}
        initialSchedule={initialSchedule}
        saving={saving}
        testing={testing}
        onOpenChange={(open) => {
          if (!open) setEditingId(null);
        }}
        onSave={async (payload) => {
          if (editingId === "create") {
            await createAlert(payload);
          } else if (editingId) {
            await updateAlert(editingId, payload);
          }
        }}
        onSendTest={
          editingAlert ? () => sendTestSaved(editingAlert.id) : undefined
        }
        onDelete={
          editingAlert ? () => deleteAlert(editingAlert.id) : undefined
        }
      />

    </Page>
  );
}
