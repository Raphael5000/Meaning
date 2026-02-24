"use client";

import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

interface ConnectionStatus {
  hasGoogleAccount: boolean;
  googleEmail: string | null;
}

/* ── Brand logo style ── */

const logoStyle: React.CSSProperties = {
  border: "1px solid var(--border-color)",
  borderRadius: "8px",
};

/* ── Status badges ── */

function ConnectedBadge() {
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium"
      style={{
        background: "rgba(16, 163, 127, 0.15)",
        color: "var(--accent)",
      }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: "var(--accent)" }} />
      Connected
    </span>
  );
}

function ComingSoonBadge() {
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium"
      style={{
        background: "var(--bg-tertiary)",
        color: "var(--text-muted)",
      }}
    >
      Coming soon
    </span>
  );
}

/* ── Main component ── */

export default function ConnectionsModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [status, setStatus] = useState<ConnectionStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [disconnecting, setDisconnecting] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setMessage(null);
    fetch("/api/user/connections")
      .then((res) => res.json())
      .then((data) => setStatus(data))
      .catch(() => setStatus({ hasGoogleAccount: false, googleEmail: null }))
      .finally(() => setLoading(false));
  }, [open]);

  async function handleDisconnect() {
    if (!confirm("Disconnect Google Analytics? You will need to reconnect to use analytics features.")) return;
    setDisconnecting(true);
    setMessage(null);
    try {
      const res = await fetch("/api/user/connections/google", { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to disconnect");
      }
      setStatus({ hasGoogleAccount: false, googleEmail: null });
      setMessage({ type: "success", text: "Google Analytics disconnected." });
    } catch (err) {
      setMessage({ type: "error", text: err instanceof Error ? err.message : "Failed to disconnect" });
    } finally {
      setDisconnecting(false);
    }
  }

  function handleReconnect() {
    window.location.href = "/api/auth/connect-google";
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        className="max-h-[85vh] overflow-y-auto sm:max-w-lg"
        style={{
          background: "var(--bg-primary)",
          border: "1px solid var(--border-color)",
        }}
      >
        <DialogHeader>
          <DialogTitle style={{ color: "var(--text-primary)" }}>Connections</DialogTitle>
          <DialogDescription style={{ color: "var(--text-muted)" }}>
            Manage your connected accounts and data sources.
          </DialogDescription>
        </DialogHeader>

        {/* Status message */}
        {message && (
          <div
            className="rounded-lg px-4 py-3 text-sm"
            style={{
              background: message.type === "success" ? "rgba(16, 163, 127, 0.1)" : "rgba(239, 68, 68, 0.1)",
              border: message.type === "success" ? "1px solid rgba(16, 163, 127, 0.3)" : "1px solid rgba(239, 68, 68, 0.2)",
              color: message.type === "success" ? "var(--accent)" : "var(--error)",
            }}
          >
            {message.text}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin" style={{ color: "var(--accent)" }} />
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {/* Google Analytics — active connection */}
            <div
              className="relative overflow-hidden rounded-xl p-4"
              style={{
                background: "var(--card-bg)",
                border: "1px solid var(--border-color)",
              }}
            >
              <div className="card-noise" aria-hidden />
              <div className="relative z-10">
                <div className="flex items-start gap-3">
                  <img src="/Google Analytics.svg" alt="Google Analytics" className="h-10 w-10 shrink-0" style={logoStyle} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                        Google Analytics
                      </h3>
                      {status?.hasGoogleAccount ? <ConnectedBadge /> : (
                        <span
                          className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium"
                          style={{ background: "var(--bg-tertiary)", color: "var(--text-muted)" }}
                        >
                          Not connected
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-xs" style={{ color: "var(--text-muted)" }}>
                      View and analyze your website traffic and user behavior.
                    </p>
                    {status?.hasGoogleAccount && status.googleEmail && (
                      <p className="mt-1.5 text-xs" style={{ color: "var(--text-secondary)" }}>
                        {status.googleEmail}
                      </p>
                    )}
                  </div>
                </div>

                <div className="mt-3 flex gap-2">
                  {status?.hasGoogleAccount ? (
                    <button
                      onClick={handleDisconnect}
                      disabled={disconnecting}
                      className="cursor-pointer rounded-lg px-3 py-1.5 text-xs font-medium transition-colors hover:bg-[var(--bg-hover)]"
                      style={{
                        border: "1px solid var(--border-color)",
                        color: "var(--text-secondary)",
                      }}
                    >
                      {disconnecting ? "Disconnecting..." : "Disconnect"}
                    </button>
                  ) : (
                    <button
                      onClick={handleReconnect}
                      className="btn-primary-gradient px-4 py-1.5 text-xs"
                    >
                      Connect
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Meta — coming soon */}
            <div
              className="relative overflow-hidden rounded-xl p-4 opacity-75"
              style={{
                background: "var(--card-bg)",
                border: "1px solid var(--border-color)",
              }}
            >
              <div className="card-noise" aria-hidden />
              <div className="relative z-10">
                <div className="flex items-start gap-3">
                  <img src="/Meta.svg" alt="Meta" className="h-10 w-10 shrink-0" style={logoStyle} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                        Meta
                      </h3>
                      <ComingSoonBadge />
                    </div>
                    <p className="mt-0.5 text-xs" style={{ color: "var(--text-muted)" }}>
                      Connect Facebook & Instagram ad campaigns and insights.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Google Ads — coming soon */}
            <div
              className="relative overflow-hidden rounded-xl p-4 opacity-75"
              style={{
                background: "var(--card-bg)",
                border: "1px solid var(--border-color)",
              }}
            >
              <div className="card-noise" aria-hidden />
              <div className="relative z-10">
                <div className="flex items-start gap-3">
                  <img src="/Google Ads.svg" alt="Google Ads" className="h-10 w-10 shrink-0" style={logoStyle} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                        Google Ads
                      </h3>
                      <ComingSoonBadge />
                    </div>
                    <p className="mt-0.5 text-xs" style={{ color: "var(--text-muted)" }}>
                      Monitor your Google Ads campaigns and performance metrics.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* LinkedIn — coming soon */}
            <div
              className="relative overflow-hidden rounded-xl p-4 opacity-75"
              style={{
                background: "var(--card-bg)",
                border: "1px solid var(--border-color)",
              }}
            >
              <div className="card-noise" aria-hidden />
              <div className="relative z-10">
                <div className="flex items-start gap-3">
                  <img src="/Linkedin.svg" alt="LinkedIn" className="h-10 w-10 shrink-0" style={logoStyle} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                        LinkedIn
                      </h3>
                      <ComingSoonBadge />
                    </div>
                    <p className="mt-0.5 text-xs" style={{ color: "var(--text-muted)" }}>
                      Track LinkedIn page analytics and ad performance.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
