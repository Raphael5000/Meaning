"use client";

import { useState, useEffect, useCallback } from "react";
import { Loader2, ArrowLeft, Check, AlertCircle, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

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

interface MailchimpAudience {
  id: string;
  name: string;
  memberCount: number;
  campaignCount: number;
}

interface AdsCustomer {
  id: string;
  name: string;
}

interface ConnectionStatus {
  hasGoogleAccount: boolean;
  googleEmail: string | null;
  hasAdsScope: boolean;
  hasLinkedInAccount: boolean;
  hasMailchimpAccount: boolean;
  dataSources: DataSourceInfo[];
}

interface ConnectionsPanelProps {
  onClose: () => void;
  orgId?: string | null;
  orgName?: string;
}

// ---------------------------------------------------------------------------
// Source definitions
// ---------------------------------------------------------------------------

interface SourceDef {
  type: string;
  label: string;
  description: string;
  icon: string | null; // null = use fallback
  iconBg?: string;
  iconColor?: string;
  iconLetter?: string;
}

const SOURCES: SourceDef[] = [
  { type: "GA4_BIGQUERY", label: "Google Analytics", description: "Website traffic, sessions, and user behavior", icon: "/Google Analytics.svg" },
  { type: "GOOGLE_ADS", label: "Google Ads", description: "Campaign performance, keywords, and ad spend", icon: "/Google Ads.svg" },
  { type: "LINKEDIN", label: "LinkedIn", description: "Company page analytics and follower growth", icon: "/Linkedin.svg" },
  { type: "MAILCHIMP", label: "Mailchimp", description: "Email campaigns, open rates, and audience growth", icon: null, iconBg: "#ffe01b", iconColor: "#241c15", iconLetter: "M" },
  { type: "META", label: "Meta", description: "Facebook & Instagram campaigns and insights", icon: "/Meta.svg" },
];

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function StatusDot({ status }: { status: string }) {
  const colors: Record<string, string> = {
    ACTIVE: "var(--accent)",
    BACKFILLING: "#3b82f6",
    PENDING: "#f59e0b",
    ERROR: "var(--error, #ef4444)",
  };
  const color = colors[status] ?? "var(--text-muted)";
  return (
    <span className="relative flex h-2 w-2">
      {status === "BACKFILLING" && (
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-75" style={{ background: color }} />
      )}
      <span className="relative inline-flex h-2 w-2 rounded-full" style={{ background: color }} />
    </span>
  );
}

function StatusLabel({ status }: { status: string }) {
  const labels: Record<string, string> = {
    ACTIVE: "Connected",
    BACKFILLING: "Syncing",
    PENDING: "Pending",
    ERROR: "Error",
  };
  const colors: Record<string, string> = {
    ACTIVE: "var(--accent)",
    BACKFILLING: "#3b82f6",
    PENDING: "#f59e0b",
    ERROR: "var(--error, #ef4444)",
  };
  return (
    <span className="text-[11px] font-medium" style={{ color: colors[status] ?? "var(--text-muted)" }}>
      {labels[status] ?? status}
    </span>
  );
}

function SourceIcon({ source }: { source: SourceDef }) {
  if (source.icon) {
    return <img src={source.icon} alt="" className="h-8 w-8 rounded-lg border border-border" />;
  }
  return (
    <span
      className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-sm font-bold"
      style={{ background: source.iconBg, color: source.iconColor }}
    >
      {source.iconLetter}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function ConnectionsPanel({ onClose, orgId, orgName }: ConnectionsPanelProps) {
  const [status, setStatus] = useState<ConnectionStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Google Ads
  const [adsCustomers, setAdsCustomers] = useState<AdsCustomer[]>([]);
  const [loadingAds, setLoadingAds] = useState(false);
  const [enablingAds, setEnablingAds] = useState<Record<string, boolean>>({});

  // LinkedIn
  const [linkedInOrgs, setLinkedInOrgs] = useState<LinkedInOrg[]>([]);
  const [loadingLinkedIn, setLoadingLinkedIn] = useState(false);
  const [enablingLinkedIn, setEnablingLinkedIn] = useState<Record<string, boolean>>({});

  // Mailchimp
  const [mailchimpAudiences, setMailchimpAudiences] = useState<MailchimpAudience[]>([]);
  const [loadingMailchimp, setLoadingMailchimp] = useState(false);
  const [enablingMailchimp, setEnablingMailchimp] = useState<Record<string, boolean>>({});

  // ── Fetch connection status ──
  const fetchStatus = useCallback((silent = false) => {
    if (!silent) setLoading(true);
    const url = orgId
      ? `/api/user/connections?orgId=${orgId}`
      : "/api/user/connections";
    fetch(url)
      .then((r) => r.json())
      .then((data) => setStatus(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [orgId]);

  useEffect(() => { fetchStatus(); }, [fetchStatus]);

  // Poll while anything is syncing
  useEffect(() => {
    if (!status) return;
    const syncing = status.dataSources.some((ds) => ds.status === "BACKFILLING" || ds.status === "PENDING");
    if (!syncing) return;
    const interval = setInterval(() => fetchStatus(true), 10000);
    return () => clearInterval(interval);
  }, [status, fetchStatus]);

  // ── Load sub-accounts when expanding ──
  useEffect(() => {
    if (expanded === "GOOGLE_ADS" && status?.hasAdsScope && adsCustomers.length === 0) {
      setLoadingAds(true);
      fetch("/api/ads/accessible-customers")
        .then((r) => r.json())
        .then((data) => setAdsCustomers(data.customers || (data.customerIds || []).map((id: string) => ({ id, name: `Account ${id}` }))))
        .catch(() => {})
        .finally(() => setLoadingAds(false));
    }
  }, [expanded, status?.hasAdsScope, adsCustomers.length]);

  useEffect(() => {
    if (expanded === "LINKEDIN" && status?.hasLinkedInAccount && linkedInOrgs.length === 0) {
      setLoadingLinkedIn(true);
      fetch("/api/linkedin/accessible-organizations")
        .then((r) => r.json())
        .then((data) => setLinkedInOrgs(data.organizations || []))
        .catch(() => {})
        .finally(() => setLoadingLinkedIn(false));
    }
  }, [expanded, status?.hasLinkedInAccount, linkedInOrgs.length]);

  useEffect(() => {
    if (expanded === "MAILCHIMP" && status?.hasMailchimpAccount && mailchimpAudiences.length === 0) {
      setLoadingMailchimp(true);
      fetch("/api/mailchimp/accessible-audiences")
        .then((r) => r.json())
        .then((data) => setMailchimpAudiences(data.audiences || []))
        .catch(() => {})
        .finally(() => setLoadingMailchimp(false));
    }
  }, [expanded, status?.hasMailchimpAccount, mailchimpAudiences.length]);

  // ── Helpers ──
  function getSourceStatus(type: string): string | null {
    const ds = status?.dataSources.find((d) => d.type === type);
    return ds?.status ?? null;
  }

  function getSourceDataSources(type: string): DataSourceInfo[] {
    return status?.dataSources.filter((d) => d.type === type) ?? [];
  }

  function isAuthenticated(type: string): boolean {
    switch (type) {
      case "GA4_BIGQUERY": return !!status?.hasGoogleAccount;
      case "GOOGLE_ADS": return !!status?.hasAdsScope;
      case "LINKEDIN": return !!status?.hasLinkedInAccount;
      case "MAILCHIMP": return !!status?.hasMailchimpAccount;
      default: return false;
    }
  }

  function getConnectUrl(type: string): string {
    switch (type) {
      case "GA4_BIGQUERY": return "/api/auth/connect-google";
      case "GOOGLE_ADS": return "/api/auth/connect-google-ads";
      case "LINKEDIN": return "/api/auth/connect-linkedin";
      case "MAILCHIMP": return "/api/auth/connect-mailchimp";
      default: return "#";
    }
  }

  async function handleEnable(type: string, id: string) {
    const setEnabling = type === "GOOGLE_ADS" ? setEnablingAds : type === "LINKEDIN" ? setEnablingLinkedIn : setEnablingMailchimp;
    setEnabling((prev) => ({ ...prev, [id]: true }));
    setMessage(null);

    const endpoints: Record<string, { url: string; body: Record<string, string | undefined> }> = {
      GOOGLE_ADS: { url: "/api/ads/enable-export", body: { customerId: id, orgId: orgId ?? undefined } },
      LINKEDIN: { url: "/api/linkedin/enable-export", body: { orgId: id, organizationOrgId: orgId ?? undefined } },
      MAILCHIMP: { url: "/api/mailchimp/enable-export", body: { listId: id, orgId: orgId ?? undefined } },
    };

    const endpoint = endpoints[type];
    if (!endpoint) return;

    try {
      const res = await fetch(endpoint.url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(endpoint.body),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage({ type: "error", text: data.message || data.error || "Failed to enable" });
        return;
      }
      setMessage({ type: "success", text: `${SOURCES.find((s) => s.type === type)?.label} connected and syncing.` });
      fetchStatus();
    } catch {
      setMessage({ type: "error", text: "Something went wrong." });
    } finally {
      setEnabling((prev) => ({ ...prev, [id]: false }));
    }
  }

  // ── Render ──
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
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="h-8 w-8 shrink-0"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h2 className="text-sm font-semibold text-foreground">Data Sources</h2>
          <p className="text-xs text-muted-foreground">
            {orgName ? `Connected to ${orgName}` : "Manage your data connections"}
          </p>
        </div>
      </div>

      {/* Message */}
      {message && (
        <div
          className="mx-6 mt-4 flex items-center gap-2 rounded-lg px-3 py-2 text-xs"
          style={{
            background: message.type === "success" ? "rgba(16, 163, 127, 0.08)" : "rgba(239, 68, 68, 0.08)",
            color: message.type === "success" ? "var(--accent)" : "var(--error, #ef4444)",
          }}
        >
          {message.type === "success" ? <Check className="h-3.5 w-3.5 shrink-0" /> : <AlertCircle className="h-3.5 w-3.5 shrink-0" />}
          {message.text}
        </div>
      )}

      {/* Source list */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        <div className="mx-auto max-w-2xl space-y-2">
          {SOURCES.map((source) => {
            const sourceStatus = getSourceStatus(source.type);
            const authed = isAuthenticated(source.type);
            const isComingSoon = source.type === "META";
            const isExpanded = expanded === source.type;
            const dataSources = getSourceDataSources(source.type);

            return (
              <div
                key={source.type}
                className={`rounded-xl border transition-colors ${isComingSoon ? "opacity-50" : ""}`}
                style={{ borderColor: isExpanded ? "var(--accent)" : "var(--border-color)", background: "var(--card-bg, var(--bg-secondary, transparent))" }}
              >
                {/* Row */}
                <button
                  type="button"
                  disabled={isComingSoon}
                  onClick={() => setExpanded(isExpanded ? null : source.type)}
                  className="flex w-full cursor-pointer items-center gap-3 px-4 py-3 text-left disabled:cursor-default"
                >
                  <SourceIcon source={source} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-foreground">{source.label}</span>
                      {isComingSoon && (
                        <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
                          Coming soon
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">{source.description}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {dataSources.map((ds) => (
                      <div key={ds.id} className="flex items-center gap-1.5">
                        <StatusDot status={ds.status} />
                        <StatusLabel status={ds.status} />
                      </div>
                    ))}
                    {!sourceStatus && !isComingSoon && (
                      <span className="text-[11px] text-muted-foreground">Not connected</span>
                    )}
                  </div>
                </button>

                {/* Expanded detail */}
                {isExpanded && !isComingSoon && (
                  <div className="border-t px-4 py-3" style={{ borderColor: "var(--border-color)" }}>
                    {!authed ? (
                      /* Step 1: OAuth connect */
                      <div className="flex items-center justify-between">
                        <p className="text-xs text-muted-foreground">
                          Connect your {source.label} account to get started.
                        </p>
                        <Button
                          size="sm"
                          className="h-8 text-xs"
                          style={{ background: "var(--accent)", color: "white" }}
                          onClick={() => { window.location.href = getConnectUrl(source.type); }}
                        >
                          <ExternalLink className="mr-1.5 h-3 w-3" />
                          Connect
                        </Button>
                      </div>
                    ) : source.type === "GA4_BIGQUERY" ? (
                      /* GA4 — already managed via property selector */
                      <p className="text-xs text-muted-foreground">
                        Managed automatically via your GA4 property selection.
                        {status?.googleEmail && (
                          <span className="ml-1 text-foreground">{status.googleEmail}</span>
                        )}
                      </p>
                    ) : (
                      /* Step 2: Account/audience selection */
                      <div>
                        {renderAccountList(source.type)}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );

  // ── Account list renderers ──
  function renderAccountList(type: string) {
    const isLoading = type === "GOOGLE_ADS" ? loadingAds : type === "LINKEDIN" ? loadingLinkedIn : loadingMailchimp;

    if (isLoading) {
      return (
        <div className="flex items-center gap-2 py-1">
          <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
          <span className="text-xs text-muted-foreground">Loading accounts...</span>
        </div>
      );
    }

    switch (type) {
      case "GOOGLE_ADS":
        return renderAdsAccounts();
      case "LINKEDIN":
        return renderLinkedInOrgs();
      case "MAILCHIMP":
        return renderMailchimpAudiences();
      default:
        return null;
    }
  }

  function renderAdsAccounts() {
    const dataSources = getSourceDataSources("GOOGLE_ADS");
    const connectedIds = new Set(dataSources.map((d) => d.adsCustomerId).filter(Boolean));

    if (adsCustomers.length === 0) {
      return <p className="text-xs text-muted-foreground">No accounts found. Check your Google Ads access.</p>;
    }

    return (
      <div className="space-y-1.5">
        {adsCustomers.map((c) => {
          const ds = dataSources.find((d) => d.adsCustomerId === c.id);
          const connected = connectedIds.has(c.id);
          return (
            <div key={c.id} className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
              <div>
                <p className="text-xs font-medium text-foreground">{c.name}</p>
                <p className="text-[10px] text-muted-foreground">{c.id.replace(/(\d{3})(\d{3})(\d{4})/, "$1-$2-$3")}</p>
              </div>
              {ds ? (
                <div className="flex items-center gap-1.5">
                  <StatusDot status={ds.status} />
                  <StatusLabel status={ds.status} />
                </div>
              ) : !connected ? (
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 text-xs"
                  style={{ color: "var(--accent)" }}
                  disabled={enablingAds[c.id]}
                  onClick={() => handleEnable("GOOGLE_ADS", c.id)}
                >
                  {enablingAds[c.id] ? <Loader2 className="h-3 w-3 animate-spin" /> : "Enable"}
                </Button>
              ) : null}
            </div>
          );
        })}
      </div>
    );
  }

  function renderLinkedInOrgs() {
    const dataSources = getSourceDataSources("LINKEDIN");
    const connectedIds = new Set(dataSources.map((d) => d.propertyId));

    if (linkedInOrgs.length === 0) {
      return <p className="text-xs text-muted-foreground">No organizations found. Make sure you are an admin on the LinkedIn page.</p>;
    }

    return (
      <div className="space-y-1.5">
        {linkedInOrgs.map((org) => {
          const ds = dataSources.find((d) => d.propertyId === org.id);
          const connected = connectedIds.has(org.id);
          return (
            <div key={org.id} className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
              <div>
                <p className="text-xs font-medium text-foreground">{org.name}</p>
                {org.vanityName && (
                  <p className="text-[10px] text-muted-foreground">linkedin.com/company/{org.vanityName}</p>
                )}
              </div>
              {ds ? (
                <div className="flex items-center gap-1.5">
                  <StatusDot status={ds.status} />
                  <StatusLabel status={ds.status} />
                </div>
              ) : !connected ? (
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 text-xs"
                  style={{ color: "var(--accent)" }}
                  disabled={enablingLinkedIn[org.id]}
                  onClick={() => handleEnable("LINKEDIN", org.id)}
                >
                  {enablingLinkedIn[org.id] ? <Loader2 className="h-3 w-3 animate-spin" /> : "Enable"}
                </Button>
              ) : null}
            </div>
          );
        })}
      </div>
    );
  }

  function renderMailchimpAudiences() {
    const dataSources = getSourceDataSources("MAILCHIMP");
    const connectedIds = new Set(dataSources.map((d) => d.propertyId));

    if (mailchimpAudiences.length === 0) {
      return <p className="text-xs text-muted-foreground">No audiences found in your Mailchimp account.</p>;
    }

    return (
      <div className="space-y-1.5">
        {mailchimpAudiences.map((aud) => {
          const ds = dataSources.find((d) => d.propertyId === aud.id);
          const connected = connectedIds.has(aud.id);
          return (
            <div key={aud.id} className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
              <div>
                <p className="text-xs font-medium text-foreground">{aud.name}</p>
                <p className="text-[10px] text-muted-foreground">
                  {aud.memberCount.toLocaleString()} subscribers
                </p>
              </div>
              {ds ? (
                <div className="flex items-center gap-1.5">
                  <StatusDot status={ds.status} />
                  <StatusLabel status={ds.status} />
                </div>
              ) : !connected ? (
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 text-xs"
                  style={{ color: "var(--accent)" }}
                  disabled={enablingMailchimp[aud.id]}
                  onClick={() => handleEnable("MAILCHIMP", aud.id)}
                >
                  {enablingMailchimp[aud.id] ? <Loader2 className="h-3 w-3 animate-spin" /> : "Enable"}
                </Button>
              ) : null}
            </div>
          );
        })}
      </div>
    );
  }
}
