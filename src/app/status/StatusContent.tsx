"use client";

import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";

interface DayData {
  date: string;
  successRate: number; // 0-1, or -1 for no data
  total: number;
  succeeded: number;
}

interface ConnectorStatus {
  type: string;
  label: string;
  accounts: number;
  currentStatus: string;
  uptime: number;
  days: DayData[];
}

interface StatusData {
  overallStatus: string;
  connectors: ConnectorStatus[];
}

function getBarColor(rate: number): string {
  if (rate === -1) return "rgba(128,128,128,0.15)"; // no data
  if (rate === 1) return "#22c55e"; // all green
  if (rate >= 0.8) return "#a3e635"; // yellow-green
  if (rate >= 0.5) return "#facc15"; // yellow
  if (rate >= 0.2) return "#fb923c"; // orange
  return "#ef4444"; // red
}

function getStatusColor(status: string): string {
  switch (status) {
    case "Operational": return "#22c55e";
    case "Degraded": return "#facc15";
    case "Outage": return "#ef4444";
    default: return "rgba(128,128,128,0.5)";
  }
}

function getBannerStyle(status: string): { bg: string; color: string } {
  if (status === "All Systems Operational") return { bg: "#22c55e", color: "#ffffff" };
  if (status === "Degraded Performance") return { bg: "#facc15", color: "#1a1a1a" };
  return { bg: "#ef4444", color: "#ffffff" };
}

function UptimeBar({ days }: { days: DayData[] }) {
  return (
    <div className="flex gap-[2px]">
      {days.map((day, i) => (
        <div
          key={i}
          className="group relative flex-1"
          style={{ minWidth: 3, height: 32, borderRadius: 2, background: getBarColor(day.successRate) }}
        >
          <div
            className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-2 -translate-x-1/2 whitespace-nowrap rounded-lg px-3 py-2 text-xs opacity-0 shadow-lg transition-opacity group-hover:opacity-100"
            style={{ background: "var(--m-surface, #1a1a1a)", color: "var(--m-text, #fff)", border: "1px solid var(--m-hairline, rgba(255,255,255,0.1))" }}
          >
            <p className="font-medium">{day.date}</p>
            {day.total === 0 ? (
              <p style={{ color: "var(--m-text-muted, #888)" }}>No sync data</p>
            ) : (
              <p>{day.succeeded}/{day.total} accounts synced</p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function ConnectorCard({ connector }: { connector: ConnectorStatus }) {
  return (
    <div
      className="rounded-xl border p-5"
      style={{ borderColor: "var(--m-hairline, rgba(128,128,128,0.15))" }}
    >
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold" style={{ color: "var(--m-text)" }}>
            {connector.label}
          </h3>
          <p className="text-xs" style={{ color: "var(--m-text-muted)" }}>
            {connector.accounts} active account{connector.accounts !== 1 ? "s" : ""}
          </p>
        </div>
        <span
          className="text-xs font-medium"
          style={{ color: getStatusColor(connector.currentStatus) }}
        >
          {connector.currentStatus}
        </span>
      </div>

      <UptimeBar days={connector.days} />

      <div className="mt-2 flex items-center justify-between text-[11px]" style={{ color: "var(--m-text-muted)" }}>
        <span>90 days ago</span>
        <span>{connector.uptime}% uptime</span>
        <span>Today</span>
      </div>
    </div>
  );
}

export function StatusContent() {
  const [data, setData] = useState<StatusData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/status")
      .then((r) => r.json())
      .then((d) => setData(d))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="h-6 w-6 animate-spin" style={{ color: "var(--brand)" }} />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="py-32 text-center">
        <p className="text-sm" style={{ color: "var(--m-text-muted)" }}>Failed to load status data.</p>
      </div>
    );
  }

  const banner = getBannerStyle(data.overallStatus);

  return (
    <div>
      <h1
        className="mb-8 text-2xl font-semibold tracking-tight"
        style={{ color: "var(--m-text)" }}
      >
        System Status
      </h1>

      {/* Overall banner */}
      <div
        className="mb-10 rounded-xl px-6 py-4 text-sm font-semibold"
        style={{ background: banner.bg, color: banner.color }}
      >
        {data.overallStatus}
      </div>

      {data.connectors.length === 0 ? (
        <div className="py-16 text-center">
          <p className="text-sm" style={{ color: "var(--m-text-muted)" }}>
            No active connectors yet. Connect a data source to start tracking status.
          </p>
        </div>
      ) : (
        <>
          <p className="mb-4 text-right text-xs" style={{ color: "var(--m-text-muted)" }}>
            Sync history over the past 90 days
          </p>
          <div className="space-y-4">
            {data.connectors.map((c) => (
              <ConnectorCard key={c.type} connector={c} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
