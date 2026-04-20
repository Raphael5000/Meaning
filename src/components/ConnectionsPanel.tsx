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

interface GscSite {
  siteUrl: string;
  permissionLevel: string;
}

interface MicrosoftAdsAccount {
  accountId: string;
  accountName: string;
  customerId: string;
  accountNumber: string;
}

interface ConnectionStatus {
  hasGoogleAccount: boolean;
  googleEmail: string | null;
  hasAdsScope: boolean;
  hasGscScope: boolean;
  hasLinkedInAccount: boolean;
  hasMailchimpAccount: boolean;
  hasMicrosoftAdsAccount: boolean;
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
  { type: "MAILCHIMP", label: "Mailchimp", description: "Email campaigns, open rates, and audience growth", icon: "/Mailchimp.svg" },
  { type: "SEARCH_CONSOLE", label: "Search Console", description: "Search queries, impressions, clicks, and rankings", icon: "/Search Console.svg" },
  { type: "MICROSOFT_ADS", label: "Microsoft Ads", description: "Bing campaign performance, keywords, and ad spend", icon: "/Microsoft Ads.svg" },
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
    return <img src={source.icon} alt="" className="h-8 w-8 rounded-md border border-border" />;
  }
  return (
    <span
      className="flex h-8 w-8 items-center justify-center rounded-md border border-border text-sm font-bold"
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

  // GA4 properties
  const [ga4Properties, setGa4Properties] = useState<Array<{ propertyId: string; displayName: string; account: string; bigquery?: { status: string | null } | null }>>([]);
  const [loadingGa4, setLoadingGa4] = useState(false);
  const [enablingGa4, setEnablingGa4] = useState<Record<string, boolean>>({});

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

  // Search Console
  const [gscSites, setGscSites] = useState<GscSite[]>([]);
  const [loadingGsc, setLoadingGsc] = useState(false);
  const [enablingGsc, setEnablingGsc] = useState<Record<string, boolean>>({});

  // Microsoft Ads
  const [msAdsAccounts, setMsAdsAccounts] = useState<MicrosoftAdsAccount[]>([]);
  const [loadingMsAds, setLoadingMsAds] = useState(false);
  const [enablingMsAds, setEnablingMsAds] = useState<Record<string, boolean>>({});

  // Display currency
  const [displayCurrency, setDisplayCurrency] = useState("USD");
  const [savingCurrency, setSavingCurrency] = useState(false);

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

  // Fetch org display currency
  useEffect(() => {
    if (!orgId) return;
    fetch(`/api/organizations/${orgId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.organization?.displayCurrency) {
          setDisplayCurrency(data.organization.displayCurrency);
        }
      })
      .catch(() => {});
  }, [orgId]);

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
    if (expanded === "GA4_BIGQUERY" && status?.hasGoogleAccount && ga4Properties.length === 0) {
      setLoadingGa4(true);
      fetch("/api/analytics/properties")
        .then((r) => r.json())
        .then((data) => setGa4Properties(data.properties || []))
        .catch(() => {})
        .finally(() => setLoadingGa4(false));
    }
  }, [expanded, status?.hasGoogleAccount, ga4Properties.length]);

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

  useEffect(() => {
    if (expanded === "SEARCH_CONSOLE" && status?.hasGscScope && gscSites.length === 0) {
      setLoadingGsc(true);
      fetch("/api/gsc/accessible-sites")
        .then((r) => r.json())
        .then((data) => setGscSites(data.sites || []))
        .catch(() => {})
        .finally(() => setLoadingGsc(false));
    }
  }, [expanded, status?.hasGscScope, gscSites.length]);

  useEffect(() => {
    if (expanded === "MICROSOFT_ADS" && status?.hasMicrosoftAdsAccount && msAdsAccounts.length === 0) {
      setLoadingMsAds(true);
      fetch("/api/microsoft-ads/accessible-accounts")
        .then((r) => r.json())
        .then((data) => setMsAdsAccounts(data.accounts || []))
        .catch(() => {})
        .finally(() => setLoadingMsAds(false));
    }
  }, [expanded, status?.hasMicrosoftAdsAccount, msAdsAccounts.length]);

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
      case "SEARCH_CONSOLE": return !!status?.hasGscScope;
      case "LINKEDIN": return !!status?.hasLinkedInAccount;
      case "MAILCHIMP": return !!status?.hasMailchimpAccount;
      case "MICROSOFT_ADS": return !!status?.hasMicrosoftAdsAccount;
      default: return false;
    }
  }

  function getConnectUrl(type: string): string {
    switch (type) {
      case "GA4_BIGQUERY": return "/api/auth/connect-google";
      case "GOOGLE_ADS": return "/api/auth/connect-google-ads";
      case "SEARCH_CONSOLE": return "/api/auth/connect-google-gsc";
      case "LINKEDIN": return "/api/auth/connect-linkedin";
      case "MAILCHIMP": return "/api/auth/connect-mailchimp";
      case "MICROSOFT_ADS": return "/api/auth/connect-microsoft-ads";
      default: return "#";
    }
  }

  async function handleEnable(type: string, id: string) {
    const setEnabling = type === "GA4_BIGQUERY" ? setEnablingGa4 : type === "GOOGLE_ADS" ? setEnablingAds : type === "SEARCH_CONSOLE" ? setEnablingGsc : type === "LINKEDIN" ? setEnablingLinkedIn : type === "MICROSOFT_ADS" ? setEnablingMsAds : setEnablingMailchimp;
    setEnabling((prev) => ({ ...prev, [id]: true }));
    setMessage(null);

    const endpoints: Record<string, { url: string; body: Record<string, string | undefined> }> = {
      GA4_BIGQUERY: { url: "/api/analytics/enable-bigquery-export", body: { propertyId: id, orgId: orgId ?? undefined } },
      GOOGLE_ADS: { url: "/api/ads/enable-export", body: { customerId: id, orgId: orgId ?? undefined } },
      SEARCH_CONSOLE: { url: "/api/gsc/enable-export", body: { siteUrl: id, orgId: orgId ?? undefined } },
      LINKEDIN: { url: "/api/linkedin/enable-export", body: { orgId: id, organizationOrgId: orgId ?? undefined } },
      MAILCHIMP: { url: "/api/mailchimp/enable-export", body: { listId: id, orgId: orgId ?? undefined } },
      MICROSOFT_ADS: { url: "/api/microsoft-ads/enable-export", body: { accountId: id, orgId: orgId ?? undefined } },
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
      fetchStatus(true);
    } catch {
      setMessage({ type: "error", text: "Something went wrong." });
    } finally {
      setEnabling((prev) => ({ ...prev, [id]: false }));
    }
  }

  const [disconnecting, setDisconnecting] = useState<Record<string, boolean>>({});

  async function handleDisconnect(dataSourceId: string, label: string) {
    setDisconnecting((prev) => ({ ...prev, [dataSourceId]: true }));
    setMessage(null);
    try {
      const res = await fetch("/api/user/connections/disconnect", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dataSourceId }),
      });
      if (!res.ok) {
        const data = await res.json();
        setMessage({ type: "error", text: data.error || "Failed to disconnect" });
        return;
      }
      setMessage({ type: "success", text: `${label} disconnected. Historical data has been preserved.` });
      fetchStatus(true);
    } catch {
      setMessage({ type: "error", text: "Something went wrong." });
    } finally {
      setDisconnecting((prev) => ({ ...prev, [dataSourceId]: false }));
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
          {/* Display currency selector */}
          {orgId && (
            <div className="mb-4 rounded-xl border px-4 py-3" style={{ borderColor: "var(--border-color)", background: "var(--card-bg, var(--bg-secondary, transparent))" }}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-foreground">Display Currency</p>
                  <p className="text-xs text-muted-foreground">All monetary values will be converted to this currency</p>
                </div>
                <div className="flex items-center gap-2">
                  <select
                    value={displayCurrency}
                    onChange={async (e) => {
                      const newCurrency = e.target.value;
                      setDisplayCurrency(newCurrency);
                      setSavingCurrency(true);
                      try {
                        await fetch(`/api/organizations/${orgId}`, {
                          method: "PUT",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ displayCurrency: newCurrency }),
                        });
                        setMessage({ type: "success", text: `Display currency set to ${newCurrency}` });
                      } catch {
                        setMessage({ type: "error", text: "Failed to update currency" });
                      } finally {
                        setSavingCurrency(false);
                      }
                    }}
                    disabled={savingCurrency}
                    className="h-8 rounded-md border border-border bg-transparent px-2 text-xs text-foreground focus:outline-none focus:ring-1"
                    style={{ minWidth: 80 }}
                  >
                    {[
                      "USD", "EUR", "GBP", "ZAR", "AUD", "CAD", "JPY", "CHF", "INR", "BRL",
                      "NZD", "SEK", "NOK", "DKK", "PLN", "MXN", "SGD", "HKD", "KRW", "TRY",
                      "ILS", "AED", "SAR", "NGN", "KES", "GHS", "EGP", "PHP", "THB", "MYR",
                      "IDR", "CNY",
                    ].map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                  {savingCurrency && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
                </div>
              </div>
            </div>
          )}
          {[...SOURCES].sort((a, b) => {
            const aConnected = getSourceDataSources(a.type).length > 0 ? 0 : 1;
            const bConnected = getSourceDataSources(b.type).length > 0 ? 0 : 1;
            return aConnected - bConnected;
          }).map((source) => {
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
    const isLoading = type === "GA4_BIGQUERY" ? loadingGa4 : type === "GOOGLE_ADS" ? loadingAds : type === "SEARCH_CONSOLE" ? loadingGsc : type === "LINKEDIN" ? loadingLinkedIn : type === "MICROSOFT_ADS" ? loadingMsAds : loadingMailchimp;

    if (isLoading) {
      return (
        <div className="flex items-center gap-2 py-1">
          <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
          <span className="text-xs text-muted-foreground">Loading accounts...</span>
        </div>
      );
    }

    switch (type) {
      case "GA4_BIGQUERY":
        return renderGa4Properties();
      case "GOOGLE_ADS":
        return renderAdsAccounts();
      case "SEARCH_CONSOLE":
        return renderGscSites();
      case "LINKEDIN":
        return renderLinkedInOrgs();
      case "MAILCHIMP":
        return renderMailchimpAudiences();
      case "MICROSOFT_ADS":
        return renderMsAdsAccounts();
      default:
        return null;
    }
  }

  function renderGa4Properties() {
    const dataSources = getSourceDataSources("GA4_BIGQUERY");
    const connectedIds = new Set(dataSources.map((d) => d.propertyId));
    const hasConnected = dataSources.length > 0;

    if (ga4Properties.length === 0) {
      return <p className="text-xs text-muted-foreground">No GA4 properties found. Make sure your Google account has access to a GA4 property.</p>;
    }

    const sorted = [...ga4Properties].sort((a, b) => {
      const aConnected = connectedIds.has(a.propertyId) ? 0 : 1;
      const bConnected = connectedIds.has(b.propertyId) ? 0 : 1;
      return aConnected - bConnected;
    });

    return (
      <div className="space-y-1.5">
        {sorted.map((prop) => {
          const ds = dataSources.find((d) => d.propertyId === prop.propertyId);
          const connected = connectedIds.has(prop.propertyId);
          return (
            <div key={prop.propertyId} className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
              <div>
                <p className="text-xs font-medium text-foreground">{prop.displayName}</p>
                <p className="text-[10px] text-muted-foreground">{prop.account} &middot; {prop.propertyId}</p>
              </div>
              {ds ? (
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5">
                    <StatusDot status={ds.status} />
                    <StatusLabel status={ds.status} />
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 text-[10px] px-2"
                    style={{ color: "var(--text-muted)" }}
                    disabled={disconnecting[ds.id]}
                    onClick={() => handleDisconnect(ds.id, prop.displayName)}
                  >
                    {disconnecting[ds.id] ? <Loader2 className="h-3 w-3 animate-spin" /> : "Disconnect"}
                  </Button>
                </div>
              ) : !connected ? (
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 text-xs"
                  style={{ color: hasConnected ? "var(--text-muted)" : "var(--accent)" }}
                  disabled={enablingGa4[prop.propertyId] || hasConnected}
                  onClick={() => handleEnable("GA4_BIGQUERY", prop.propertyId)}
                >
                  {enablingGa4[prop.propertyId] ? <Loader2 className="h-3 w-3 animate-spin" /> : "Enable"}
                </Button>
              ) : null}
            </div>
          );
        })}
      </div>
    );
  }

  function renderAdsAccounts() {
    const dataSources = getSourceDataSources("GOOGLE_ADS");
    const connectedIds = new Set(dataSources.map((d) => d.adsCustomerId).filter(Boolean));
    const hasConnected = dataSources.length > 0;

    if (adsCustomers.length === 0) {
      return <p className="text-xs text-muted-foreground">No accounts found. Check your Google Ads access.</p>;
    }

    const sorted = [...adsCustomers].sort((a, b) => {
      const aConnected = connectedIds.has(a.id) ? 0 : 1;
      const bConnected = connectedIds.has(b.id) ? 0 : 1;
      return aConnected - bConnected;
    });

    return (
      <div className="space-y-1.5">
        {sorted.map((c) => {
          const ds = dataSources.find((d) => d.adsCustomerId === c.id);
          const connected = connectedIds.has(c.id);
          return (
            <div key={c.id} className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
              <div>
                <p className="text-xs font-medium text-foreground">{c.name}</p>
                <p className="text-[10px] text-muted-foreground">{c.id.replace(/(\d{3})(\d{3})(\d{4})/, "$1-$2-$3")}</p>
              </div>
              {ds ? (
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5">
                    <StatusDot status={ds.status} />
                    <StatusLabel status={ds.status} />
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 text-[10px] px-2"
                    style={{ color: "var(--text-muted)" }}
                    disabled={disconnecting[ds.id]}
                    onClick={() => handleDisconnect(ds.id, c.name)}
                  >
                    {disconnecting[ds.id] ? <Loader2 className="h-3 w-3 animate-spin" /> : "Disconnect"}
                  </Button>
                </div>
              ) : !connected ? (
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 text-xs"
                  style={{ color: hasConnected ? "var(--text-muted)" : "var(--accent)" }}
                  disabled={enablingAds[c.id] || hasConnected}
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

  function renderGscSites() {
    const dataSources = getSourceDataSources("SEARCH_CONSOLE");
    const connectedIds = new Set(dataSources.map((d) => d.propertyId));
    const hasConnected = dataSources.length > 0;

    if (gscSites.length === 0) {
      return <p className="text-xs text-muted-foreground">No verified sites found. Make sure your Google account has owner or full user access to a Search Console property.</p>;
    }

    const sorted = [...gscSites].sort((a, b) => {
      const aConnected = connectedIds.has(a.siteUrl) ? 0 : 1;
      const bConnected = connectedIds.has(b.siteUrl) ? 0 : 1;
      return aConnected - bConnected;
    });

    return (
      <div className="space-y-1.5">
        {sorted.map((site) => {
          const ds = dataSources.find((d) => d.propertyId === site.siteUrl);
          const connected = connectedIds.has(site.siteUrl);
          return (
            <div key={site.siteUrl} className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
              <div>
                <p className="text-xs font-medium text-foreground">{site.siteUrl}</p>
                <p className="text-[10px] text-muted-foreground">{site.permissionLevel === "siteOwner" ? "Owner" : "Full user"}</p>
              </div>
              {ds ? (
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5">
                    <StatusDot status={ds.status} />
                    <StatusLabel status={ds.status} />
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 text-[10px] px-2"
                    style={{ color: "var(--text-muted)" }}
                    disabled={disconnecting[ds.id]}
                    onClick={() => handleDisconnect(ds.id, site.siteUrl)}
                  >
                    {disconnecting[ds.id] ? <Loader2 className="h-3 w-3 animate-spin" /> : "Disconnect"}
                  </Button>
                </div>
              ) : !connected ? (
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 text-xs"
                  style={{ color: hasConnected ? "var(--text-muted)" : "var(--accent)" }}
                  disabled={enablingGsc[site.siteUrl] || hasConnected}
                  onClick={() => handleEnable("SEARCH_CONSOLE", site.siteUrl)}
                >
                  {enablingGsc[site.siteUrl] ? <Loader2 className="h-3 w-3 animate-spin" /> : "Enable"}
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
    const hasConnected = dataSources.length > 0;

    if (linkedInOrgs.length === 0) {
      return <p className="text-xs text-muted-foreground">No organizations found. Make sure you are an admin on the LinkedIn page.</p>;
    }

    const sorted = [...linkedInOrgs].sort((a, b) => {
      const aConnected = connectedIds.has(a.id) ? 0 : 1;
      const bConnected = connectedIds.has(b.id) ? 0 : 1;
      return aConnected - bConnected;
    });

    return (
      <div className="space-y-1.5">
        {sorted.map((org) => {
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
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5">
                    <StatusDot status={ds.status} />
                    <StatusLabel status={ds.status} />
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 text-[10px] px-2"
                    style={{ color: "var(--text-muted)" }}
                    disabled={disconnecting[ds.id]}
                    onClick={() => handleDisconnect(ds.id, org.name)}
                  >
                    {disconnecting[ds.id] ? <Loader2 className="h-3 w-3 animate-spin" /> : "Disconnect"}
                  </Button>
                </div>
              ) : !connected ? (
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 text-xs"
                  style={{ color: hasConnected ? "var(--text-muted)" : "var(--accent)" }}
                  disabled={enablingLinkedIn[org.id] || hasConnected}
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

  function renderMsAdsAccounts() {
    const dataSources = getSourceDataSources("MICROSOFT_ADS");
    const connectedIds = new Set(dataSources.map((d) => d.propertyId));
    const hasConnected = dataSources.length > 0;

    if (msAdsAccounts.length === 0) {
      return <p className="text-xs text-muted-foreground">No accounts found. Check your Microsoft Ads access.</p>;
    }

    const sorted = [...msAdsAccounts].sort((a, b) => {
      const aConnected = connectedIds.has(a.accountId) ? 0 : 1;
      const bConnected = connectedIds.has(b.accountId) ? 0 : 1;
      return aConnected - bConnected;
    });

    return (
      <div className="space-y-1.5">
        {sorted.map((acc) => {
          const ds = dataSources.find((d) => d.propertyId === acc.accountId);
          const connected = connectedIds.has(acc.accountId);
          return (
            <div key={acc.accountId} className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
              <div>
                <p className="text-xs font-medium text-foreground">{acc.accountName}</p>
                <p className="text-[10px] text-muted-foreground">{acc.accountNumber || acc.accountId}</p>
              </div>
              {ds ? (
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5">
                    <StatusDot status={ds.status} />
                    <StatusLabel status={ds.status} />
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 text-[10px] px-2"
                    style={{ color: "var(--text-muted)" }}
                    disabled={disconnecting[ds.id]}
                    onClick={() => handleDisconnect(ds.id, acc.accountName)}
                  >
                    {disconnecting[ds.id] ? <Loader2 className="h-3 w-3 animate-spin" /> : "Disconnect"}
                  </Button>
                </div>
              ) : !connected ? (
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 text-xs"
                  style={{ color: hasConnected ? "var(--text-muted)" : "var(--accent)" }}
                  disabled={enablingMsAds[acc.accountId] || hasConnected}
                  onClick={() => handleEnable("MICROSOFT_ADS", acc.accountId)}
                >
                  {enablingMsAds[acc.accountId] ? <Loader2 className="h-3 w-3 animate-spin" /> : "Enable"}
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
    const hasConnected = dataSources.length > 0;

    if (mailchimpAudiences.length === 0) {
      return <p className="text-xs text-muted-foreground">No audiences found in your Mailchimp account.</p>;
    }

    const sorted = [...mailchimpAudiences].sort((a, b) => {
      const aConnected = connectedIds.has(a.id) ? 0 : 1;
      const bConnected = connectedIds.has(b.id) ? 0 : 1;
      return aConnected - bConnected;
    });

    return (
      <div className="space-y-1.5">
        {sorted.map((aud) => {
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
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5">
                    <StatusDot status={ds.status} />
                    <StatusLabel status={ds.status} />
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 text-[10px] px-2"
                    style={{ color: "var(--text-muted)" }}
                    disabled={disconnecting[ds.id]}
                    onClick={() => handleDisconnect(ds.id, aud.name)}
                  >
                    {disconnecting[ds.id] ? <Loader2 className="h-3 w-3 animate-spin" /> : "Disconnect"}
                  </Button>
                </div>
              ) : !connected ? (
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 text-xs"
                  style={{ color: hasConnected ? "var(--text-muted)" : "var(--accent)" }}
                  disabled={enablingMailchimp[aud.id] || hasConnected}
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
