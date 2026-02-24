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

/* ── Brand logos (inline SVG for portability) ── */

function GoogleAnalyticsLogo({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M38 7H10a3 3 0 0 0-3 3v28a3 3 0 0 0 3 3h28a3 3 0 0 0 3-3V10a3 3 0 0 0-3-3Z" fill="#F57C00" />
      <path d="M33.5 38a4.5 4.5 0 1 0 0-9 4.5 4.5 0 0 0 0 9Z" fill="#FFF8E1" />
      <path d="M33.5 17V38" stroke="#FFF8E1" strokeWidth="5" strokeLinecap="round" />
      <path d="M24 24.5V38" stroke="#FFF8E1" strokeWidth="5" strokeLinecap="round" />
      <path d="M14.5 31.5V38" stroke="#FFF8E1" strokeWidth="5" strokeLinecap="round" />
    </svg>
  );
}

function MetaLogo({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="meta-grad" x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse">
          <stop stopColor="#0081FB" />
          <stop offset="1" stopColor="#0064E0" />
        </linearGradient>
      </defs>
      <rect width="48" height="48" rx="10" fill="url(#meta-grad)" />
      <path d="M15.5 31c0 1.1.2 1.9.7 2.4.4.5 1 .8 1.7.8 1 0 2-.7 3.1-2.2l2.4-3.4c1.4-2 2.8-3.4 4.1-4.2 1.3-.8 2.6-1.2 4-1.2 2 0 3.6.8 4.8 2.3 1.2 1.5 1.8 3.5 1.8 6 0 2.6-.6 4.6-1.9 6.1-1.3 1.5-3 2.2-5.1 2.2v-3.4c1.2 0 2.1-.4 2.8-1.3.7-.9 1-2 1-3.5 0-1.3-.3-2.4-.9-3.2-.6-.8-1.4-1.2-2.4-1.2-1 0-2 .7-3.1 2.1l-2.4 3.4c-1.4 2-2.8 3.5-4.1 4.3-1.3.8-2.7 1.2-4 1.2-1.9 0-3.3-.7-4.4-2.1-1-1.4-1.6-3.3-1.6-5.8 0-2.6.6-4.7 1.9-6.3 1.3-1.6 3-2.4 5.2-2.4v3.4c-1.3 0-2.3.5-3 1.4-.7.9-1 2.2-1 3.5Z" fill="white" />
    </svg>
  );
}

function GoogleAdsLogo({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
      <path d="M7.2 28.8 20.4 7.2c1.5-2.4 4.6-3.2 7-1.7 2.4 1.5 3.2 4.6 1.7 7L15.9 34.1c-1.5 2.4-4.6 3.2-7 1.7-2.4-1.5-3.2-4.6-1.7-7Z" fill="#FBBC04" />
      <path d="M28.8 7.2 42 28.8c1.5 2.4.7 5.5-1.7 7-2.4 1.5-5.5.7-7-1.7L20.1 12.5c-1.5-2.4-.7-5.5 1.7-7 2.4-1.5 5.5-.7 7 1.7Z" fill="#4285F4" />
      <circle cx="11.4" cy="37.2" r="5.4" fill="#34A853" />
    </svg>
  );
}

function LinkedInLogo({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
      <rect width="48" height="48" rx="10" fill="#0A66C2" />
      <path d="M15.5 19.5h-4v14h4v-14Zm-2-6.5a2.3 2.3 0 1 0 0 4.6 2.3 2.3 0 0 0 0-4.6ZM34 33.5h-4v-6.8c0-1.6-.6-2.7-2-2.7-1.1 0-1.7.7-2 1.4-.1.3-.1.6-.1 1v7.1h-4s.1-11.5 0-12.7h4v1.8c.5-.8 1.5-2 3.6-2 2.6 0 4.5 1.7 4.5 5.4v7.5Z" fill="white" />
    </svg>
  );
}

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
                  <GoogleAnalyticsLogo className="h-10 w-10 shrink-0 rounded-lg" />
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
                  <MetaLogo className="h-10 w-10 shrink-0 rounded-lg" />
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
                  <GoogleAdsLogo className="h-10 w-10 shrink-0 rounded-lg" />
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
                  <LinkedInLogo className="h-10 w-10 shrink-0 rounded-lg" />
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
