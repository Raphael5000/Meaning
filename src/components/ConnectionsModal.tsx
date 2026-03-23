"use client";

import { useState, useEffect, useCallback } from "react";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

interface DataSourceInfo {
  id: string;
  type: string;
  propertyId: string;
  bigqueryDataset: string | null;
  adsCustomerId: string | null;
  status: string;
}

interface LinkedInOrg {
  id: string;
  name: string;
  vanityName: string | null;
}

interface ConnectionStatus {
  hasGoogleAccount: boolean;
  googleEmail: string | null;
  hasAdsScope: boolean;
  hasLinkedInAccount: boolean;
  dataSources: DataSourceInfo[];
}

/* ── Brand logo style ── */

const logoStyle: React.CSSProperties = {
  border: "1px solid var(--border-color)",
  borderRadius: "8px",
};

/* ── Status badges ── */

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { bg: string; color: string; label: string }> = {
    ACTIVE: { bg: "rgba(16, 163, 127, 0.15)", color: "var(--accent)", label: "Active" },
    BACKFILLING: { bg: "rgba(59, 130, 246, 0.15)", color: "#3b82f6", label: "Syncing" },
    PENDING: { bg: "rgba(245, 158, 11, 0.15)", color: "#f59e0b", label: "Pending" },
    ERROR: { bg: "rgba(239, 68, 68, 0.1)", color: "var(--error)", label: "Error" },
  };
  const c = config[status] || { bg: "var(--bg-tertiary)", color: "var(--text-muted)", label: status };

  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium"
      style={{ background: c.bg, color: c.color }}
    >
      {status === "BACKFILLING" && (
        <span
          className="h-1.5 w-1.5 animate-spin rounded-full border border-current"
          style={{ borderTopColor: "transparent" }}
        />
      )}
      {status === "ACTIVE" && (
        <span className="h-1.5 w-1.5 rounded-full" style={{ background: c.color }} />
      )}
      {c.label}
    </span>
  );
}

function ConnectedBadge() {
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium"
      style={{ background: "rgba(16, 163, 127, 0.15)", color: "var(--accent)" }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: "var(--accent)" }} />
      Connected
    </span>
  );
}

function NotConnectedBadge() {
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium"
      style={{ background: "var(--bg-tertiary)", color: "var(--text-muted)" }}
    >
      Not connected
    </span>
  );
}

function ComingSoonBadge() {
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium"
      style={{ background: "var(--bg-tertiary)", color: "var(--text-muted)" }}
    >
      Coming soon
    </span>
  );
}

/* ── Section wrapper ── */

function ConnectionCard({
  children,
  dimmed = false,
}: {
  children: React.ReactNode;
  dimmed?: boolean;
}) {
  return (
    <div
      className={`relative overflow-hidden rounded-xl p-4${dimmed ? " opacity-60" : ""}`}
      style={{ background: "var(--card-bg)", border: "1px solid var(--border-color)" }}
    >
      <div className="card-noise" aria-hidden />
      <div className="relative z-10">{children}</div>
    </div>
  );
}

/* ── Main component ── */

export default function ConnectionsModal({
  open,
  onClose,
  propertyId,
  propertyName,
}: {
  open: boolean;
  onClose: () => void;
  propertyId?: string | null;
  propertyName?: string;
}) {
  const [status, setStatus] = useState<ConnectionStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [disconnecting, setDisconnecting] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Google Ads state
  const [adsCustomers, setAdsCustomers] = useState<Array<{ id: string; name: string }>>([]);
  const [loadingAdsAccounts, setLoadingAdsAccounts] = useState(false);
  const [enablingAds, setEnablingAds] = useState<Record<string, boolean>>({});
  const [adsErrors, setAdsErrors] = useState<Record<string, string>>({});
  const [manualCid, setManualCid] = useState("");

  // LinkedIn state
  const [linkedInOrgs, setLinkedInOrgs] = useState<LinkedInOrg[]>([]);
  const [loadingLinkedInOrgs, setLoadingLinkedInOrgs] = useState(false);
  const [enablingLinkedIn, setEnablingLinkedIn] = useState<Record<string, boolean>>({});
  const [linkedInErrors, setLinkedInErrors] = useState<Record<string, string>>({});
  const [linkedInLoadError, setLinkedInLoadError] = useState<string | null>(null);

  const fetchStatus = useCallback((isPolling = false) => {
    if (!isPolling) {
      setLoading(true);
      setMessage(null);
    }
    const url = propertyId
      ? `/api/user/connections?propertyId=${propertyId}`
      : "/api/user/connections";
    fetch(url)
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) {
          console.error("[ConnectionsModal] API error:", res.status, data);
          throw new Error(data.detail || data.error || "API error");
        }
        console.log("[ConnectionsModal] status data:", data);
        setStatus(data);
      })
      .catch((err) => {
        console.error("[ConnectionsModal] fetch error:", err);
        setMessage({ type: "error", text: `Failed to load connections: ${err.message}` });
        // Still set a default status so UI renders (with error banner above)
        if (!status) {
          setStatus({ hasGoogleAccount: false, googleEmail: null, hasAdsScope: false, hasLinkedInAccount: false, dataSources: [] });
        }
      })
      .finally(() => setLoading(false));
  }, [propertyId]);

  useEffect(() => {
    if (!open) return;
    fetchStatus();
  }, [open, fetchStatus]);

  // Load Ads customer accounts when scope is available
  const [adsLoadError, setAdsLoadError] = useState<string | null>(null);

  const loadAdsAccounts = useCallback(async () => {
    setLoadingAdsAccounts(true);
    setAdsLoadError(null);
    try {
      const res = await fetch("/api/ads/accessible-customers");
      const data = await res.json();
      console.log("[ConnectionsModal] ads accounts response:", res.status, data);
      if (!res.ok) {
        if (data.needsReconnect) {
          // Scope was lost or never granted — need to re-OAuth
          setStatus((prev) => prev ? { ...prev, hasAdsScope: false } : prev);
        } else {
          setAdsLoadError(data.detail || data.message || data.error || "Failed to load Ads accounts");
        }
        return;
      }
      setAdsCustomers(data.customers || (data.customerIds || []).map((id: string) => ({ id, name: `Account ${id}` })));
    } catch (err) {
      console.error("[ConnectionsModal] ads accounts error:", err);
      setAdsLoadError("Failed to load Ads accounts");
    } finally {
      setLoadingAdsAccounts(false);
    }
  }, []);

  useEffect(() => {
    if (!open || !status?.hasAdsScope) return;
    loadAdsAccounts();
  }, [open, status?.hasAdsScope, loadAdsAccounts]);

  // Poll while any Ads DataSource is PENDING or BACKFILLING (waiting for data)
  useEffect(() => {
    if (!status) return;
    const waiting = status.dataSources.filter(
      (ds) => ds.type === "GOOGLE_ADS" && (ds.status === "BACKFILLING" || ds.status === "PENDING")
    );
    if (waiting.length === 0) return;
    const interval = setInterval(() => fetchStatus(true), 15000);
    return () => clearInterval(interval);
  }, [status, fetchStatus]);

  // Load LinkedIn organizations when account is connected
  const loadLinkedInOrgs = useCallback(async () => {
    setLoadingLinkedInOrgs(true);
    setLinkedInLoadError(null);
    try {
      const res = await fetch("/api/linkedin/accessible-organizations");
      const data = await res.json();
      if (!res.ok) {
        if (data.needsReconnect) {
          setStatus((prev) => prev ? { ...prev, hasLinkedInAccount: false } : prev);
        } else {
          setLinkedInLoadError(data.detail || data.error || "Failed to load organizations");
        }
        return;
      }
      setLinkedInOrgs(data.organizations || []);
    } catch (err) {
      console.error("[ConnectionsModal] linkedin orgs error:", err);
      setLinkedInLoadError("Failed to load organizations");
    } finally {
      setLoadingLinkedInOrgs(false);
    }
  }, []);

  useEffect(() => {
    if (!open || !status?.hasLinkedInAccount) return;
    loadLinkedInOrgs();
  }, [open, status?.hasLinkedInAccount, loadLinkedInOrgs]);

  // Poll while any LinkedIn DataSource is PENDING or BACKFILLING
  useEffect(() => {
    if (!status) return;
    const waiting = status.dataSources.filter(
      (ds) => ds.type === "LINKEDIN" && (ds.status === "BACKFILLING" || ds.status === "PENDING")
    );
    if (waiting.length === 0) return;
    const interval = setInterval(() => fetchStatus(true), 15000);
    return () => clearInterval(interval);
  }, [status, fetchStatus]);

  function handleConnectLinkedIn() {
    window.location.href = "/api/auth/connect-linkedin";
  }

  async function handleEnableLinkedIn(orgId: string) {
    setEnablingLinkedIn((prev) => ({ ...prev, [orgId]: true }));
    setLinkedInErrors((prev) => ({ ...prev, [orgId]: "" }));
    try {
      const res = await fetch("/api/linkedin/enable-export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orgId, ga4PropertyId: propertyId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setLinkedInErrors((prev) => ({ ...prev, [orgId]: data.message || data.error || "Failed." }));
        return;
      }
      if (data.dataSource?.status === "ACTIVE") {
        setMessage({ type: "success", text: "LinkedIn connected! Data is ready." });
      } else {
        setMessage({ type: "success", text: "LinkedIn page linked. Syncing data now..." });
      }
      fetchStatus();
    } catch (err) {
      console.error("[ConnectionsModal] enable-linkedin error:", err);
      setLinkedInErrors((prev) => ({
        ...prev,
        [orgId]: err instanceof Error ? err.message : "Something went wrong.",
      }));
    } finally {
      setEnablingLinkedIn((prev) => ({ ...prev, [orgId]: false }));
    }
  }

  async function handleDisconnectGoogle() {
    if (!confirm("Disconnect Google Analytics? You will need to reconnect to use analytics features.")) return;
    setDisconnecting(true);
    setMessage(null);
    try {
      const res = await fetch("/api/user/connections/google", { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to disconnect");
      }
      setStatus((prev) => prev ? { ...prev, hasGoogleAccount: false, googleEmail: null, hasAdsScope: false } : prev);
      setMessage({ type: "success", text: "Google Analytics disconnected." });
    } catch (err) {
      setMessage({ type: "error", text: err instanceof Error ? err.message : "Failed to disconnect" });
    } finally {
      setDisconnecting(false);
    }
  }

  function handleReconnectGoogle() {
    window.location.href = "/api/auth/connect-google";
  }

  function handleConnectAds() {
    window.location.href = "/api/auth/connect-google-ads";
  }

  async function handleEnableAds(customerId: string) {
    setEnablingAds((prev) => ({ ...prev, [customerId]: true }));
    setAdsErrors((prev) => ({ ...prev, [customerId]: "" }));
    try {
      const res = await fetch("/api/ads/enable-export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customerId, ga4PropertyId: propertyId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setAdsErrors((prev) => ({ ...prev, [customerId]: data.message || data.error || "Failed." }));
        return;
      }

      if (data.dataSource?.status === "ACTIVE") {
        setMessage({ type: "success", text: "Google Ads connected! Data is ready." });
      } else {
        setMessage({ type: "success", text: "Google Ads account linked. Data will appear once the BigQuery transfer is running." });
      }
      fetchStatus();
    } catch (err) {
      console.error("[ConnectionsModal] enable-export error:", err);
      setAdsErrors((prev) => ({
        ...prev,
        [customerId]: err instanceof Error ? err.message : "Something went wrong.",
      }));
    } finally {
      setEnablingAds((prev) => ({ ...prev, [customerId]: false }));
    }
  }

  // Derived state
  const bqDataSource = status?.dataSources.find(
    (ds) => ds.type === "GA4_BIGQUERY" && ds.propertyId === propertyId
  );
  const adsDataSources = status?.dataSources.filter((ds) => ds.type === "GOOGLE_ADS") ?? [];
  const connectedAdsCids = new Set(adsDataSources.map((ds) => ds.adsCustomerId).filter(Boolean));
  const linkedInDataSources = status?.dataSources.filter((ds) => ds.type === "LINKEDIN") ?? [];
  const connectedLinkedInOrgIds = new Set(linkedInDataSources.map((ds) => ds.propertyId));

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        className="max-h-[85vh] overflow-y-auto sm:max-w-lg"
        style={{ background: "var(--bg-primary)", border: "1px solid var(--border-color)" }}
      >
        <DialogHeader>
          <DialogTitle style={{ color: "var(--text-primary)" }}>Connections</DialogTitle>
          <DialogDescription style={{ color: "var(--text-muted)" }}>
            {propertyName
              ? `Manage data sources for ${propertyName}`
              : "Manage your connected accounts and data sources."}
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
            {/* ─── Google Analytics ─── */}
            <ConnectionCard>
              <div className="flex items-start gap-3">
                <img src="/Google Analytics.svg" alt="Google Analytics" className="h-10 w-10 shrink-0" style={logoStyle} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                      Google Analytics
                    </h3>
                    {status?.hasGoogleAccount ? <ConnectedBadge /> : <NotConnectedBadge />}
                  </div>
                  <p className="mt-0.5 text-xs" style={{ color: "var(--text-muted)" }}>
                    View and analyze your website traffic and user behavior.
                  </p>
                  {status?.hasGoogleAccount && status.googleEmail && (
                    <p className="mt-1.5 text-xs" style={{ color: "var(--text-secondary)" }}>
                      {status.googleEmail}
                    </p>
                  )}

                  {/* BigQuery export status for current property */}
                  {propertyId && status?.hasGoogleAccount && (
                    <div className="mt-2 flex items-center gap-2">
                      <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                        BigQuery export:
                      </span>
                      {bqDataSource ? (
                        <StatusBadge status={bqDataSource.status} />
                      ) : (
                        <span className="text-xs" style={{ color: "var(--text-muted)" }}>Not enabled</span>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-3 flex gap-2">
                {status?.hasGoogleAccount ? (
                  <button
                    onClick={handleDisconnectGoogle}
                    disabled={disconnecting}
                    className="cursor-pointer rounded-lg px-3 py-1.5 text-xs font-medium transition-colors hover:bg-[var(--bg-hover)]"
                    style={{ border: "1px solid var(--border-color)", color: "var(--text-secondary)" }}
                  >
                    {disconnecting ? "Disconnecting..." : "Disconnect"}
                  </button>
                ) : (
                  <button
                    onClick={handleReconnectGoogle}
                    className="btn-primary-gradient px-4 py-1.5 text-xs"
                  >
                    Connect
                  </button>
                )}
              </div>
            </ConnectionCard>

            {/* ─── Google Ads ─── */}
            <ConnectionCard>
              <div className="flex items-start gap-3">
                <img src="/Google Ads.svg" alt="Google Ads" className="h-10 w-10 shrink-0" style={logoStyle} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                      Google Ads
                    </h3>
                    {adsDataSources.some((ds) => ds.status === "ACTIVE") ? (
                      <ConnectedBadge />
                    ) : adsDataSources.some((ds) => ds.status === "BACKFILLING") ? (
                      <StatusBadge status="BACKFILLING" />
                    ) : status?.hasAdsScope ? (
                      <NotConnectedBadge />
                    ) : null}
                  </div>
                  <p className="mt-0.5 text-xs" style={{ color: "var(--text-muted)" }}>
                    Campaign attribution, keyword-level ROI, and ad spend analysis.
                  </p>
                </div>
              </div>

              <div className="mt-3">
                {!status?.hasAdsScope ? (
                  /* Step 1: Connect Ads OAuth scope */
                  <button
                    onClick={handleConnectAds}
                    className="btn-primary-gradient px-4 py-1.5 text-xs"
                  >
                    Connect Google Ads
                  </button>
                ) : loadingAdsAccounts ? (
                  <div className="flex items-center gap-2 py-1">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" style={{ color: "var(--accent)" }} />
                    <span className="text-xs" style={{ color: "var(--text-muted)" }}>Loading accounts...</span>
                  </div>
                ) : adsLoadError || adsCustomers.length === 0 ? (
                  <div>
                    {adsLoadError && (
                      <p className="text-xs mb-2" style={{ color: "var(--error)" }}>
                        {adsLoadError}
                      </p>
                    )}
                    <p className="text-xs mb-2" style={{ color: "var(--text-muted)" }}>
                      Enter your Google Ads customer ID to connect manually.
                      Find it at the top of Google Ads (e.g. 123-456-7890).
                    </p>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={manualCid}
                        onChange={(e) => setManualCid(e.target.value)}
                        placeholder="123-456-7890"
                        className="flex-1 rounded-lg px-3 py-1.5 text-xs outline-none"
                        style={{
                          background: "var(--bg-primary)",
                          border: "1px solid var(--border-color)",
                          color: "var(--text-primary)",
                        }}
                      />
                      <button
                        onClick={() => {
                          const cleaned = manualCid.replace(/-/g, "").trim();
                          if (cleaned.length >= 7) {
                            setAdsCustomers((prev) =>
                              prev.some((c) => c.id === cleaned) ? prev : [...prev, { id: cleaned, name: `Account ${cleaned}` }]
                            );
                            setAdsLoadError(null);
                            setManualCid("");
                          }
                        }}
                        disabled={manualCid.replace(/-/g, "").trim().length < 7}
                        className="rounded-lg px-3 py-1.5 text-xs font-medium transition-opacity"
                        style={{
                          background: "var(--accent)",
                          color: "white",
                          opacity: manualCid.replace(/-/g, "").trim().length < 7 ? 0.5 : 1,
                        }}
                      >
                        Add
                      </button>
                    </div>
                    {adsLoadError && (
                      <div className="mt-2 flex gap-3">
                        <button
                          onClick={loadAdsAccounts}
                          className="text-xs font-medium"
                          style={{ color: "var(--accent)" }}
                        >
                          Retry auto-detect
                        </button>
                        <button
                          onClick={handleConnectAds}
                          className="text-xs font-medium"
                          style={{ color: "var(--text-secondary)" }}
                        >
                          Reconnect
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  /* Step 2: List Ads accounts with enable/status */
                  <div className="flex flex-col gap-2">
                    {adsCustomers.map((customer) => {
                      const cid = customer.id;
                      const ds = adsDataSources.find((d) => d.adsCustomerId === cid);
                      const isConnected = connectedAdsCids.has(cid);

                      return (
                        <div
                          key={cid}
                          className="flex items-center justify-between rounded-lg px-3 py-2"
                          style={{ background: "var(--bg-primary)", border: "1px solid var(--border-color)" }}
                        >
                          <div>
                            <p className="text-xs font-medium" style={{ color: "var(--text-primary)" }}>
                              {customer.name}
                            </p>
                            <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>
                              {cid.replace(/(\d{3})(\d{3})(\d{4})/, "$1-$2-$3")}
                            </p>
                            {ds && <StatusBadge status={ds.status} />}
                          </div>
                          {!isConnected && (
                            <button
                              onClick={() => handleEnableAds(cid)}
                              disabled={enablingAds[cid]}
                              className="text-xs font-medium transition-opacity"
                              style={{
                                color: "var(--accent)",
                                opacity: enablingAds[cid] ? 0.5 : 1,
                              }}
                            >
                              {enablingAds[cid] ? "Enabling..." : "Enable"}
                            </button>
                          )}
                          {adsErrors[cid] && (
                            <p className="mt-1 text-xs" style={{ color: "var(--error)" }}>
                              {adsErrors[cid]}
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </ConnectionCard>

            {/* ─── Meta — coming soon ─── */}
            <ConnectionCard dimmed>
              <div className="flex items-start gap-3">
                <img src="/Meta.svg" alt="Meta" className="h-10 w-10 shrink-0" style={logoStyle} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Meta</h3>
                    <ComingSoonBadge />
                  </div>
                  <p className="mt-0.5 text-xs" style={{ color: "var(--text-muted)" }}>
                    Connect Facebook & Instagram ad campaigns and insights.
                  </p>
                </div>
              </div>
            </ConnectionCard>

            {/* ─── LinkedIn ─── */}
            <ConnectionCard>
              <div className="flex items-start gap-3">
                <img src="/Linkedin.svg" alt="LinkedIn" className="h-10 w-10 shrink-0" style={logoStyle} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>LinkedIn</h3>
                    {linkedInDataSources.some((ds) => ds.status === "ACTIVE") ? (
                      <ConnectedBadge />
                    ) : linkedInDataSources.some((ds) => ds.status === "BACKFILLING") ? (
                      <StatusBadge status="BACKFILLING" />
                    ) : status?.hasLinkedInAccount ? (
                      <NotConnectedBadge />
                    ) : null}
                  </div>
                  <p className="mt-0.5 text-xs" style={{ color: "var(--text-muted)" }}>
                    Track company page analytics — posts, followers, and engagement.
                  </p>
                </div>
              </div>

              <div className="mt-3">
                {!status?.hasLinkedInAccount ? (
                  <button
                    onClick={handleConnectLinkedIn}
                    className="btn-primary-gradient px-4 py-1.5 text-xs"
                  >
                    Connect LinkedIn
                  </button>
                ) : loadingLinkedInOrgs ? (
                  <div className="flex items-center gap-2 py-1">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" style={{ color: "var(--accent)" }} />
                    <span className="text-xs" style={{ color: "var(--text-muted)" }}>Loading organizations...</span>
                  </div>
                ) : linkedInLoadError || linkedInOrgs.length === 0 ? (
                  <div>
                    {linkedInLoadError && (
                      <p className="text-xs mb-2" style={{ color: "var(--error)" }}>
                        {linkedInLoadError}
                      </p>
                    )}
                    <p className="text-xs mb-2" style={{ color: "var(--text-muted)" }}>
                      No organizations found. Make sure you are an admin on the LinkedIn company page.
                    </p>
                    <div className="flex gap-3">
                      <button
                        onClick={loadLinkedInOrgs}
                        className="text-xs font-medium"
                        style={{ color: "var(--accent)" }}
                      >
                        Retry
                      </button>
                      <button
                        onClick={handleConnectLinkedIn}
                        className="text-xs font-medium"
                        style={{ color: "var(--text-secondary)" }}
                      >
                        Reconnect
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    {linkedInOrgs.map((org) => {
                      const ds = linkedInDataSources.find((d) => d.propertyId === org.id);
                      const isConnected = connectedLinkedInOrgIds.has(org.id);

                      return (
                        <div
                          key={org.id}
                          className="flex items-center justify-between rounded-lg px-3 py-2"
                          style={{ background: "var(--bg-primary)", border: "1px solid var(--border-color)" }}
                        >
                          <div>
                            <p className="text-xs font-medium" style={{ color: "var(--text-primary)" }}>
                              {org.name}
                            </p>
                            {org.vanityName && (
                              <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                                linkedin.com/company/{org.vanityName}
                              </p>
                            )}
                            {ds && <StatusBadge status={ds.status} />}
                          </div>
                          {!isConnected && (
                            <button
                              onClick={() => handleEnableLinkedIn(org.id)}
                              disabled={enablingLinkedIn[org.id]}
                              className="text-xs font-medium transition-opacity"
                              style={{
                                color: "var(--accent)",
                                opacity: enablingLinkedIn[org.id] ? 0.5 : 1,
                              }}
                            >
                              {enablingLinkedIn[org.id] ? "Enabling..." : "Enable"}
                            </button>
                          )}
                          {linkedInErrors[org.id] && (
                            <p className="mt-1 text-xs" style={{ color: "var(--error)" }}>
                              {linkedInErrors[org.id]}
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </ConnectionCard>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
