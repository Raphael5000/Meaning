"use client";

import * as React from "react";
import { I } from "../icons";
import { Button } from "../ui/button";

/* =============================================================================
   TYPES — mirror the shapes returned by /api/user/connections and the per-source
   /accessible-* endpoints so we preserve the v1 data contracts exactly.
   ========================================================================== */

interface DataSourceInfo {
  id: string;
  type: string;
  propertyId: string;
  bigqueryDataset: string | null;
  adsCustomerId: string | null;
  status: string;
  lastSyncedAt: string | null;
  lastSyncError: string | null;
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

interface Ga4Property {
  propertyId: string;
  displayName: string;
  account: string;
  bigquery?: { status: string | null } | null;
}
interface AdsCustomer {
  id: string;
  name: string;
}
interface GscSite {
  siteUrl: string;
  permissionLevel: string;
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
interface MicrosoftAdsAccount {
  accountId: string;
  accountName: string;
  customerId: string;
  accountNumber: string;
}

type SourceType =
  | "GA4_BIGQUERY"
  | "GOOGLE_ADS"
  | "SEARCH_CONSOLE"
  | "LINKEDIN"
  | "MAILCHIMP"
  | "MICROSOFT_ADS"
  | "META";

interface SourceDef {
  type: SourceType;
  label: string;
  icon: string;
  comingSoon?: boolean;
}

const SOURCES: SourceDef[] = [
  { type: "GA4_BIGQUERY", label: "Google Analytics", icon: "/Google Analytics.svg" },
  { type: "GOOGLE_ADS", label: "Google Ads", icon: "/Google Ads.svg" },
  { type: "SEARCH_CONSOLE", label: "Search Console", icon: "/Search Console.svg" },
  { type: "LINKEDIN", label: "LinkedIn", icon: "/Linkedin.svg" },
  { type: "MAILCHIMP", label: "Mailchimp", icon: "/Mailchimp.svg" },
  { type: "MICROSOFT_ADS", label: "Microsoft Ads", icon: "/Microsoft Ads.svg" },
  { type: "META", label: "Meta", icon: "/Meta.svg", comingSoon: true },
];

/* =============================================================================
   PUBLIC ENTRY
   ========================================================================== */

interface ConnectionsV2Props {
  onClose: () => void;
  orgId?: string | null;
  orgName?: string;
  /** If set, opens directly in detail view for this source (e.g. right after
   * an OAuth redirect so the user sees the account picker, not the list). */
  initialSourceType?: SourceType | null;
}

type View =
  | { kind: "list" }
  | { kind: "detail"; sourceType: SourceType };

export default function ConnectionsV2({
  onClose,
  orgId,
  initialSourceType,
}: ConnectionsV2Props) {
  const [status, setStatus] = React.useState<ConnectionStatus | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [view, setView] = React.useState<View>(
    initialSourceType
      ? { kind: "detail", sourceType: initialSourceType }
      : { kind: "list" }
  );
  const [message, setMessage] = React.useState<
    { kind: "success" | "error"; text: string } | null
  >(null);
  const [syncingAll, setSyncingAll] = React.useState(false);
  // Map of `${sourceType}:${id}` → human-readable account name.  Populated by
  // calling the same /accessible-* endpoints the detail-view picker uses; the
  // table then shows the real name instead of the raw propertyId/accountId.
  const [nameMap, setNameMap] = React.useState<Map<string, string>>(new Map());

  const fetchStatus = React.useCallback(
    (silent = false) => {
      if (!silent) setLoading(true);
      const url = orgId
        ? `/api/user/connections?orgId=${orgId}`
        : "/api/user/connections";
      fetch(url)
        .then((r) => r.json())
        .then((data) => setStatus(data))
        .catch(() => {})
        .finally(() => setLoading(false));
    },
    [orgId]
  );

  React.useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  // Poll every 10s while any source is backfilling/pending
  React.useEffect(() => {
    if (!status) return;
    const syncing = status.dataSources.some(
      (ds) => ds.status === "BACKFILLING" || ds.status === "PENDING"
    );
    if (!syncing) return;
    const interval = setInterval(() => fetchStatus(true), 10000);
    return () => clearInterval(interval);
  }, [status, fetchStatus]);

  // Fetch account names from /accessible-* endpoints for every source type
  // that is either authed (so we can show names in the list *and* in the detail
  // picker) or has a connected DataSource. We key a flat map by
  // `${type}:${id}` so row rendering is a single O(1) lookup.
  React.useEffect(() => {
    if (!status) return;
    const typesWithDataSources = new Set(status.dataSources.map((ds) => ds.type));
    const authedTypes: SourceType[] = [];
    if (status.hasGoogleAccount) authedTypes.push("GA4_BIGQUERY");
    if (status.hasAdsScope) authedTypes.push("GOOGLE_ADS");
    if (status.hasGscScope) authedTypes.push("SEARCH_CONSOLE");
    if (status.hasLinkedInAccount) authedTypes.push("LINKEDIN");
    if (status.hasMailchimpAccount) authedTypes.push("MAILCHIMP");
    if (status.hasMicrosoftAdsAccount) authedTypes.push("MICROSOFT_ADS");
    const toFetch = new Set<SourceType>([
      ...authedTypes,
      ...Array.from(typesWithDataSources).map((t) => t as SourceType),
    ]);
    if (toFetch.size === 0) return;
    let cancelled = false;
    (async () => {
      const entries: Array<[string, string]> = [];
      await Promise.all(
        Array.from(toFetch).map(async (type) => {
          try {
            const items = await fetchAccessibleAccounts(type);
            for (const item of items) {
              entries.push([`${type}:${item.id}`, item.label]);
            }
          } catch {
            /* ignore – fall back to raw IDs */
          }
        })
      );
      if (!cancelled && entries.length > 0) {
        setNameMap((prev) => {
          const next = new Map(prev);
          for (const [k, v] of entries) next.set(k, v);
          return next;
        });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [status]);

  async function handleSyncAll() {
    setSyncingAll(true);
    setMessage(null);
    try {
      const res = await fetch("/api/resync-all", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orgId }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setMessage({
          kind: "error",
          text: data.error || "Failed to trigger sync",
        });
        return;
      }
      setMessage({ kind: "success", text: "Sync triggered for all sources." });
      fetchStatus(true);
    } catch {
      setMessage({ kind: "error", text: "Something went wrong." });
    } finally {
      setSyncingAll(false);
    }
  }

  if (view.kind === "detail") {
    return (
      <V2Shell>
        <ConnectionsDetail
          status={status}
          orgId={orgId ?? null}
          sourceType={view.sourceType}
          nameMap={nameMap}
          onBack={() => setView({ kind: "list" })}
          onRefresh={() => fetchStatus(true)}
          onMessage={setMessage}
        />
        <MessageToast message={message} onDismiss={() => setMessage(null)} />
      </V2Shell>
    );
  }

  return (
    <V2Shell>
      <ConnectionsList
        status={status}
        loading={loading}
        nameMap={nameMap}
        syncingAll={syncingAll}
        onSyncAll={handleSyncAll}
        onOpenDetail={(t) => setView({ kind: "detail", sourceType: t })}
        onClose={onClose}
      />
      <MessageToast message={message} onDismiss={() => setMessage(null)} />
    </V2Shell>
  );
}

/* =============================================================================
   SHELL — scroll container for the v2 Connections surface.  The outer
   .meaning-v2 class already lives on the ChatV2 root; we just need a column
   that scrolls.
   ========================================================================== */

function V2Shell({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="flex h-full min-h-0 flex-col overflow-y-auto bg-v2-bg"
      style={{ scrollbarGutter: "stable" }}
    >
      <div className="mx-auto w-full max-w-[820px] px-6 py-10 md:py-12">
        {children}
      </div>
    </div>
  );
}

/* =============================================================================
   LIST VIEW
   ========================================================================== */

interface ConnectionsListProps {
  status: ConnectionStatus | null;
  loading: boolean;
  nameMap: Map<string, string>;
  syncingAll: boolean;
  onSyncAll: () => void;
  onOpenDetail: (sourceType: SourceType) => void;
  onClose: () => void;
}

function ConnectionsList({
  status,
  loading,
  nameMap,
  syncingAll,
  onSyncAll,
  onOpenDetail,
  onClose,
}: ConnectionsListProps) {
  const rows = React.useMemo(
    () => buildRows(status, SOURCES, nameMap),
    [status, nameMap]
  );
  const connected = rows.filter((r) => r.uiStatus !== "DISCONNECTED");
  const available = rows.filter((r) => r.uiStatus === "DISCONNECTED");

  // Single gate: render tables only after first status load completes. This
  // prevents the "all sources flash as Not connected" race while the API call
  // is in flight (the user would otherwise see their connected sources briefly
  // appear as disconnected before populating).
  const ready = !loading && !!status;

  return (
    <>
      <header className="mb-6 flex items-end justify-between gap-4">
        <div>
          <button
            type="button"
            onClick={onClose}
            className="mb-3 inline-flex items-center gap-1 text-[12px] text-v2-ink-muted transition-colors hover:text-v2-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-v2-ink focus-visible:ring-offset-2 focus-visible:ring-offset-v2-bg rounded"
          >
            <I.ChevronL size={12} /> Back to chat
          </button>
          <h1
            className="text-[24px] font-medium tracking-[-0.02em] text-v2-ink"
            style={{ marginBottom: 4 }}
          >
            Connections
          </h1>
          <p className="text-[13px] text-v2-ink-muted">
            {ready
              ? `${connected.length} connected · daily sync`
              : "Loading…"}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={onSyncAll}
          disabled={!ready || syncingAll || connected.length === 0}
        >
          <I.Refresh size={12} className={syncingAll ? "animate-spin" : ""} />
          {syncingAll ? "Syncing…" : "Sync all"}
        </Button>
      </header>

      {!ready ? (
        <SourceTableSkeleton rowCount={SOURCES.length} />
      ) : (
        <>
          {connected.length === 0 ? (
            <ConnectionsEmpty />
          ) : (
            <div className="mb-7">
              <SourceTable
                rows={connected}
                onOpenDetail={onOpenDetail}
                status={status}
              />
            </div>
          )}

          <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-v2-ink-subtle">
            Add source
          </div>
          <SourceTable
            rows={available}
            onOpenDetail={onOpenDetail}
            addSource
            status={status}
          />
        </>
      )}
    </>
  );
}

/** Neutral skeleton — same outer chrome as SourceTable so layout doesn't jump
 * when real rows swap in. Rows show the source label/icon so the user knows
 * which platforms exist; account/status/last-sync cells remain dashes until
 * the real state lands.  We intentionally do NOT show a "Not connected" pill
 * here — that's the panic the user reported. */
function SourceTableSkeleton({ rowCount }: { rowCount: number }) {
  return (
    <div className="overflow-hidden rounded-[10px] border border-v2-line bg-v2-surface">
      <table className="w-full border-collapse" style={{ tableLayout: "fixed" }}>
        <colgroup>
          <col style={{ width: "28%" }} />
          <col />
          <col style={{ width: 128 }} />
          <col style={{ width: 128 }} />
          <col style={{ width: 44 }} />
        </colgroup>
        <thead>
          <tr>
            <Th className="pl-4">Source</Th>
            <Th>Account</Th>
            <Th>Status</Th>
            <Th className="text-right">Last sync</Th>
            <Th className="pr-4" aria-label="Open">
              {" "}
            </Th>
          </tr>
        </thead>
        <tbody>
          {SOURCES.slice(0, rowCount).map((s) => (
            <tr key={s.type} className="border-b border-v2-line last:border-b-0">
              <td className="py-2.5 pl-4 pr-3">
                <div className="flex items-center gap-2.5">
                  <img src={s.icon} alt="" className="h-5 w-5 shrink-0" aria-hidden />
                  <span className="text-[13.5px] font-medium text-v2-ink">
                    {s.label}
                  </span>
                </div>
              </td>
              <td className="px-3 py-2.5">
                <span className="inline-block h-3 w-28 rounded bg-v2-surface-2" />
              </td>
              <td className="px-3 py-2.5">
                <span className="inline-block h-4 w-20 rounded-full bg-v2-surface-2" />
              </td>
              <td className="px-3 py-2.5 text-right">
                <span className="inline-block h-3 w-14 rounded bg-v2-surface-2" />
              </td>
              <td className="pr-4 py-2.5" />
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* =============================================================================
   TABLE
   ========================================================================== */

interface UiRow {
  type: SourceType;
  label: string;
  icon: string;
  uiStatus: "ACTIVE" | "BACKFILLING" | "ERROR" | "DISCONNECTED";
  lastSync: string | null;
  accountSummary: string;
  comingSoon?: boolean;
  /** Raw sources for this type; used to enable detail click. */
  dataSources: DataSourceInfo[];
}

function buildRows(
  status: ConnectionStatus | null,
  sources: SourceDef[],
  nameMap: Map<string, string>
): UiRow[] {
  const dataByType = new Map<string, DataSourceInfo[]>();
  for (const ds of status?.dataSources ?? []) {
    const list = dataByType.get(ds.type) ?? [];
    list.push(ds);
    dataByType.set(ds.type, list);
  }
  return sources.map((s) => {
    const sources = dataByType.get(s.type) ?? [];
    const uiStatus = summariseStatus(sources);
    const lastSync = pickLastSync(sources);
    return {
      type: s.type,
      label: s.label,
      icon: s.icon,
      uiStatus,
      lastSync,
      accountSummary: summariseAccounts(sources, nameMap, s.type),
      comingSoon: s.comingSoon,
      dataSources: sources,
    };
  });
}

function summariseStatus(
  sources: DataSourceInfo[]
): "ACTIVE" | "BACKFILLING" | "ERROR" | "DISCONNECTED" {
  if (sources.length === 0) return "DISCONNECTED";
  if (sources.some((s) => s.status === "ERROR")) return "ERROR";
  if (sources.some((s) => s.status === "BACKFILLING" || s.status === "PENDING"))
    return "BACKFILLING";
  if (sources.every((s) => s.status === "DISCONNECTED")) return "DISCONNECTED";
  return "ACTIVE";
}

function pickLastSync(sources: DataSourceInfo[]): string | null {
  const times = sources
    .map((s) => s.lastSyncedAt)
    .filter((t): t is string => !!t)
    .map((t) => new Date(t).getTime());
  if (times.length === 0) return null;
  return new Date(Math.max(...times)).toISOString();
}

function summariseAccounts(
  sources: DataSourceInfo[],
  nameMap: Map<string, string>,
  type: SourceType
): string {
  if (sources.length === 0) return "—";
  const firstId =
    sources[0].propertyId || sources[0].adsCustomerId || "";
  const firstName =
    (firstId && nameMap.get(`${type}:${firstId}`)) || firstId || "1 account";
  if (sources.length === 1) return firstName;
  return `${firstName} +${sources.length - 1} more`;
}

function formatTimeAgo(iso: string | null): string | null {
  if (!iso) return null;
  const ms = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(ms / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function linkBtnStyle(color: string): React.CSSProperties {
  return {
    background: "transparent",
    border: "none",
    cursor: "pointer",
    padding: 0,
    fontFamily: "var(--v2-font-sans)",
    fontSize: 12,
    fontWeight: 500,
    color,
    letterSpacing: "-0.005em",
    textDecoration: "underline",
    textUnderlineOffset: 3,
    textDecorationColor: "color-mix(in oklab, currentColor 35%, transparent)",
  };
}

function connectUrl(type: SourceType): string {
  switch (type) {
    case "GA4_BIGQUERY":
      return "/api/auth/connect-google";
    case "GOOGLE_ADS":
      return "/api/auth/connect-google-ads";
    case "SEARCH_CONSOLE":
      return "/api/auth/connect-google-gsc";
    case "LINKEDIN":
      return "/api/auth/connect-linkedin";
    case "MAILCHIMP":
      return "/api/auth/connect-mailchimp";
    case "MICROSOFT_ADS":
      return "/api/auth/connect-microsoft-ads";
    default:
      return "#";
  }
}

/* Table + row ------------------------------------------------------------- */

interface SourceTableProps {
  rows: UiRow[];
  onOpenDetail: (type: SourceType) => void;
  addSource?: boolean;
  status: ConnectionStatus | null;
}

function SourceTable({ rows, onOpenDetail, addSource, status }: SourceTableProps) {
  return (
    <div className="overflow-hidden rounded-[10px] border border-v2-line bg-v2-surface">
      <table className="w-full border-collapse" style={{ tableLayout: "fixed" }}>
        <colgroup>
          <col style={{ width: "28%" }} />
          <col />
          <col style={{ width: 128 }} />
          <col style={{ width: 128 }} />
          <col style={{ width: 44 }} />
        </colgroup>
        <thead>
          <tr>
            <Th className="pl-4">Source</Th>
            <Th>Account</Th>
            <Th>Status</Th>
            <Th className="text-right">Last sync</Th>
            <Th className="pr-4" aria-label="Open">
              {" "}
            </Th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <Row
              key={r.type}
              row={r}
              status={status}
              onOpenDetail={onOpenDetail}
              addSource={addSource}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Th({
  children,
  className,
  "aria-label": ariaLabel,
}: {
  children?: React.ReactNode;
  className?: string;
  "aria-label"?: string;
}) {
  return (
    <th
      aria-label={ariaLabel}
      className={`border-b border-v2-line bg-v2-surface-2 px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-[0.08em] text-v2-ink-subtle ${className ?? ""}`}
    >
      {children}
    </th>
  );
}

function Row({
  row,
  status,
  onOpenDetail,
  addSource,
}: {
  row: UiRow;
  status: ConnectionStatus | null;
  onOpenDetail: (type: SourceType) => void;
  addSource?: boolean;
}) {
  const isConnected = row.uiStatus !== "DISCONNECTED";
  const isError = row.uiStatus === "ERROR";
  const isBackfilling = row.uiStatus === "BACKFILLING";
  const ago = formatTimeAgo(row.lastSync);
  // "Authed but no DataSource" — the OAuth account exists (Account row in DB)
  // but the user hasn't picked any accounts yet. We must not just re-OAuth;
  // we need to send them into the account-picker detail view.  This is THE
  // fix for "I connected Microsoft Ads but the list still says Not connected":
  // after the OAuth callback, DataSource doesn't exist yet — only the Account
  // does, so the list row would otherwise show "Connect" forever.
  const needsAccountPick = !isConnected && isAuthedForSource(row.type, status);

  // Last-sync column holds the verb that describes the row's sync state.
  let lastCell: React.ReactNode;
  if (row.comingSoon) {
    lastCell = (
      <span className="text-[11.5px] text-v2-ink-subtle">—</span>
    );
  } else if (isError) {
    lastCell = (
      <a href={connectUrl(row.type)} style={linkBtnStyle("var(--v2-neg)")}>
        Reconnect
      </a>
    );
  } else if (needsAccountPick) {
    lastCell = (
      <button
        type="button"
        onClick={() => onOpenDetail(row.type)}
        style={linkBtnStyle("var(--v2-ink)")}
      >
        Pick accounts
      </button>
    );
  } else if (!isConnected) {
    lastCell = (
      <a href={connectUrl(row.type)} style={linkBtnStyle("var(--v2-ink)")}>
        Connect
      </a>
    );
  } else if (isBackfilling) {
    lastCell = (
      <span className="mono text-[11.5px] text-v2-ink-muted">syncing…</span>
    );
  } else {
    lastCell = (
      <span className="mono text-[11.5px] text-v2-ink-muted">
        {ago ?? "—"}
      </span>
    );
  }

  return (
    <tr
      className="border-b border-v2-line last:border-b-0"
      style={{ opacity: row.comingSoon ? 0.55 : 1 }}
    >
      <td className="py-2.5 pl-4 pr-3">
        <div className="flex items-center gap-2.5">
          <img
            src={row.icon}
            alt=""
            className="h-5 w-5 shrink-0"
            aria-hidden
          />
          <span className="text-[13.5px] font-medium text-v2-ink">
            {row.label}
          </span>
        </div>
      </td>
      <td className="px-3 py-2.5">
        <span className="text-[12.5px] text-v2-ink-muted">
          {row.comingSoon
            ? "Coming soon"
            : needsAccountPick
              ? "Signed in · no accounts enabled"
              : addSource && !isConnected
                ? "—"
                : row.accountSummary}
        </span>
      </td>
      <td className="px-3 py-2.5">
        <StatusPill
          status={needsAccountPick ? "NEEDS_PICK" : row.uiStatus}
        />
      </td>
      <td className="px-3 py-2.5 text-right">{lastCell}</td>
      <td className="pr-4 py-2.5 text-right" style={{ whiteSpace: "nowrap" }}>
        {(isConnected || needsAccountPick) && !row.comingSoon ? (
          <button
            type="button"
            onClick={() => onOpenDetail(row.type)}
            aria-label={`Open ${row.label}`}
            className="inline-flex h-6 w-6 items-center justify-center rounded text-v2-ink-muted transition-colors hover:bg-v2-surface-2 hover:text-v2-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-v2-ink"
          >
            <I.ChevronR size={14} />
          </button>
        ) : null}
      </td>
    </tr>
  );
}

function isAuthedForSource(
  type: SourceType,
  status: ConnectionStatus | null
): boolean {
  if (!status) return false;
  switch (type) {
    case "GA4_BIGQUERY":
      return status.hasGoogleAccount;
    case "GOOGLE_ADS":
      return status.hasAdsScope;
    case "SEARCH_CONSOLE":
      return status.hasGscScope;
    case "LINKEDIN":
      return status.hasLinkedInAccount;
    case "MAILCHIMP":
      return status.hasMailchimpAccount;
    case "MICROSOFT_ADS":
      return status.hasMicrosoftAdsAccount;
    default:
      return false;
  }
}

/* Status pill ----------------------------------------------------------- */

function StatusPill({
  status,
}: {
  status: "ACTIVE" | "BACKFILLING" | "ERROR" | "DISCONNECTED" | "NEEDS_PICK";
}) {
  const cfg = {
    ACTIVE: {
      label: "Connected",
      dot: "var(--v2-pos)",
      ink: "var(--v2-pos)",
      bg: "var(--v2-pos-bg)",
      pulse: false,
    },
    BACKFILLING: {
      label: "Syncing",
      dot: "var(--v2-info)",
      ink: "var(--v2-info)",
      bg: "var(--v2-info-bg)",
      pulse: true,
    },
    ERROR: {
      label: "Error",
      dot: "var(--v2-neg)",
      ink: "var(--v2-neg)",
      bg: "var(--v2-neg-bg)",
      pulse: false,
    },
    DISCONNECTED: {
      label: "Not connected",
      dot: "var(--v2-ink-subtle)",
      ink: "var(--v2-ink-muted)",
      bg: "var(--v2-surface-2)",
      pulse: false,
    },
    NEEDS_PICK: {
      label: "Finish setup",
      dot: "var(--v2-info)",
      ink: "var(--v2-info)",
      bg: "var(--v2-info-bg)",
      pulse: false,
    },
  }[status];

  return (
    <span
      className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2 py-0.5 text-[11px] font-medium"
      style={{
        background: cfg.bg,
        color: cfg.ink,
        borderColor: "color-mix(in oklab, currentColor 16%, transparent)",
      }}
    >
      <span
        className={`inline-block h-1.5 w-1.5 rounded-full ${cfg.pulse ? "animate-pulse" : ""}`}
        style={{ background: cfg.dot }}
      />
      {cfg.label}
    </span>
  );
}

/* =============================================================================
   EMPTY STATE
   ========================================================================== */

function ConnectionsEmpty() {
  return (
    <div className="rounded-[10px] border border-v2-line bg-v2-surface px-6 py-12 text-center">
      <h2 className="mb-2 text-[20px] font-medium tracking-[-0.015em] text-v2-ink">
        Connect a data source
      </h2>
      <p className="mx-auto mb-6 max-w-[420px] text-[13.5px] leading-[1.55] text-v2-ink-muted">
        Meaning answers from the data you connect. Start with Google Analytics —
        most teams finish in under a minute.
      </p>
      <div className="flex justify-center gap-2">
        <Button variant="primary" size="md" asChild>
          <a href="/api/auth/connect-google">Connect Google Analytics</a>
        </Button>
      </div>
    </div>
  );
}

/* =============================================================================
   DETAIL VIEW
   ========================================================================== */

interface ConnectionsDetailProps {
  status: ConnectionStatus | null;
  orgId: string | null;
  sourceType: SourceType;
  nameMap: Map<string, string>;
  onBack: () => void;
  onRefresh: () => void;
  onMessage: (
    msg: { kind: "success" | "error"; text: string } | null
  ) => void;
}

function ConnectionsDetail({
  status,
  orgId,
  sourceType,
  nameMap,
  onBack,
  onRefresh,
  onMessage,
}: ConnectionsDetailProps) {
  const source = SOURCES.find((s) => s.type === sourceType)!;
  // Treat DISCONNECTED sources as logically gone for UI purposes — they exist
  // in the DB only so BigQuery data is preserved and the next enable-export
  // can upsert them back to BACKFILLING.  Hiding them from the Accounts list
  // AND from the "already connected" set in the picker is what unblocks the
  // reconnect flow: otherwise the picker labels them "Connected" with no
  // Enable button, a dead end (the exact MS Ads reconnect bug).
  const allSources =
    status?.dataSources.filter((ds) => ds.type === sourceType) ?? [];
  const activeSources = allSources.filter(
    (ds) => ds.status !== "DISCONNECTED"
  );
  const hasAny = activeSources.length > 0;
  const overallStatus = summariseStatus(activeSources);
  const lastSync = formatTimeAgo(pickLastSync(activeSources));

  // Inline confirmation — no Radix AlertDialog.  Rendering through a portal
  // into document.body meant the dialog escaped the `.meaning-v2` CSS scope
  // (v2 tokens live there only), so users saw either nothing or an invisible
  // dialog and clicks appeared to do nothing.  Inline state is deterministic.
  const [pendingRemoveId, setPendingRemoveId] = React.useState<string | null>(
    null
  );
  const [disconnecting, setDisconnecting] = React.useState<
    Record<string, boolean>
  >({});
  const [showAddAccount, setShowAddAccount] = React.useState(!hasAny);

  const isAuthed = (() => {
    switch (sourceType) {
      case "GA4_BIGQUERY":
        return !!status?.hasGoogleAccount;
      case "GOOGLE_ADS":
        return !!status?.hasAdsScope;
      case "SEARCH_CONSOLE":
        return !!status?.hasGscScope;
      case "LINKEDIN":
        return !!status?.hasLinkedInAccount;
      case "MAILCHIMP":
        return !!status?.hasMailchimpAccount;
      case "MICROSOFT_ADS":
        return !!status?.hasMicrosoftAdsAccount;
      default:
        return false;
    }
  })();

  async function doDisconnect(id: string, label: string) {
    setPendingRemoveId(null);
    setDisconnecting((p) => ({ ...p, [id]: true }));
    onMessage(null);
    try {
      const res = await fetch("/api/user/connections/disconnect", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dataSourceId: id }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        onMessage({
          kind: "error",
          text: data.error || "Failed to disconnect",
        });
        return;
      }
      onMessage({
        kind: "success",
        text: `${label} disconnected. Historical data preserved.`,
      });
      onRefresh();
    } catch {
      onMessage({ kind: "error", text: "Something went wrong." });
    } finally {
      setDisconnecting((p) => ({ ...p, [id]: false }));
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={onBack}
        className="mb-5 inline-flex items-center gap-1 text-[12px] text-v2-ink-muted transition-colors hover:text-v2-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-v2-ink focus-visible:ring-offset-2 focus-visible:ring-offset-v2-bg rounded"
      >
        <I.ChevronL size={12} /> Connections
      </button>

      <div className="mb-8 flex items-center gap-3">
        <img src={source.icon} alt="" className="h-6 w-6" aria-hidden />
        <div className="flex-1 text-[20px] font-medium tracking-[-0.015em] text-v2-ink">
          {source.label}
        </div>
        {hasAny && <StatusPill status={overallStatus} />}
        {lastSync && overallStatus !== "BACKFILLING" && (
          <span className="mono text-[11.5px] text-v2-ink-muted">
            Synced {lastSync}
          </span>
        )}
      </div>

      {/* Connected accounts (excludes soft-disconnected rows) */}
      {hasAny && (
        <>
          <SectionLabel>Accounts</SectionLabel>
          {activeSources.map((ds) => {
            const rawId =
              ds.propertyId || ds.adsCustomerId || ds.id.slice(0, 12);
            const accountLabel =
              (rawId && nameMap.get(`${sourceType}:${rawId}`)) || rawId;
            const isPendingConfirm = pendingRemoveId === ds.id;
            const isBusy = !!disconnecting[ds.id];
            const isErrored = ds.status === "ERROR";
            const isSyncing =
              ds.status === "BACKFILLING" || ds.status === "PENDING";
            return (
              <div
                key={ds.id}
                className="flex items-start justify-between gap-3 border-b border-v2-line py-3.5"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-[13.5px] text-v2-ink">
                      {accountLabel}
                    </span>
                    {isErrored && (
                      <span
                        className="shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
                        style={{
                          background: "var(--v2-neg-bg)",
                          color: "var(--v2-neg)",
                        }}
                      >
                        Error
                      </span>
                    )}
                    {isSyncing && (
                      <span
                        className="shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
                        style={{
                          background: "var(--v2-info-bg)",
                          color: "var(--v2-info)",
                        }}
                      >
                        Syncing…
                      </span>
                    )}
                  </div>
                  {ds.bigqueryDataset && (
                    <div className="mono mt-0.5 truncate text-[11px] text-v2-ink-muted">
                      {ds.bigqueryDataset}
                    </div>
                  )}
                  {isErrored && (
                    <div
                      className="mt-2 rounded-md px-2.5 py-2 text-[11.5px] leading-[1.5]"
                      style={{
                        background: "var(--v2-neg-bg)",
                        color: "var(--v2-neg)",
                      }}
                    >
                      <div className="font-medium">Last sync failed</div>
                      <div className="mt-0.5 break-words">
                        {ds.lastSyncError ||
                          "No error details were saved. Click Retry to re-run sync — the failure reason will be captured."}
                      </div>
                    </div>
                  )}
                </div>
                {isPendingConfirm ? (
                  <div className="flex shrink-0 items-center gap-2">
                    <span className="text-[11.5px] text-v2-ink-muted">
                      Remove this account?
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setPendingRemoveId(null)}
                    >
                      Cancel
                    </Button>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() =>
                        doDisconnect(
                          ds.id,
                          `${source.label} — ${accountLabel}`
                        )
                      }
                      style={{
                        background: "var(--v2-neg)",
                        borderColor: "var(--v2-neg)",
                      }}
                    >
                      Confirm remove
                    </Button>
                  </div>
                ) : (
                  <div className="flex shrink-0 items-center gap-2">
                    {isErrored && (
                      <RetrySyncButton
                        dataSourceId={ds.id}
                        label={accountLabel}
                        onDone={(msg) => {
                          onMessage(msg);
                          onRefresh();
                        }}
                      />
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setPendingRemoveId(ds.id)}
                      disabled={isBusy}
                    >
                      {isBusy ? "Removing…" : "Remove"}
                    </Button>
                  </div>
                )}
              </div>
            );
          })}

          <div className="mt-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAddAccount((s) => !s)}
            >
              <I.Plus size={12} /> {showAddAccount ? "Hide accounts" : "Add account"}
            </Button>
          </div>
        </>
      )}

      {/* Add-account flow: lazy-fetch accessible accounts for this source */}
      {(showAddAccount || !hasAny) && (
        <div className="mt-6">
          <AddAccountSection
            sourceType={sourceType}
            isAuthed={isAuthed}
            orgId={orgId}
            connectedIds={activeSources}
            onEnabled={() => {
              onMessage({
                kind: "success",
                text: `${source.label} connected and syncing.`,
              });
              setShowAddAccount(false);
              onRefresh();
            }}
            onError={(text) => onMessage({ kind: "error", text })}
          />
        </div>
      )}

      {/* Danger zone: disconnect + fully reconnect */}
      <div className="mt-12 flex flex-wrap items-center gap-3 border-t border-v2-line pt-6">
        {hasAny && (
          <DisconnectSourceButton
            sourceLabel={source.label}
            busy={activeSources.some((s) => !!disconnecting[s.id])}
            onConfirm={async () => {
              for (const ds of activeSources) {
                await doDisconnect(ds.id, source.label);
              }
            }}
          />
        )}
        {oauthProviderFor(sourceType) && isAuthed && (
          <ResetOAuthButton
            sourceLabel={source.label}
            sourceType={sourceType}
            onDone={(msg) => {
              onMessage(msg);
              onRefresh();
            }}
          />
        )}
      </div>
    </>
  );
}

/** "Fully reconnect" — deletes the OAuth Account row for the provider and
 * redirects into a fresh OAuth consent flow. This is the escape hatch for
 * the MS Ads "No Microsoft Ads token for user X" sync loop: when the stored
 * refresh_token is missing / revoked / corrupt, nothing short of a clean
 * re-auth fixes it, and previously the user had no way to trigger that in
 * the UI. Works for every provider we support. */
function ResetOAuthButton({
  sourceLabel,
  sourceType,
  onDone,
}: {
  sourceLabel: string;
  sourceType: SourceType;
  onDone: (
    msg: { kind: "success" | "error"; text: string } | null
  ) => void;
}) {
  const [armed, setArmed] = React.useState(false);
  const [busy, setBusy] = React.useState(false);

  async function doReset() {
    const provider = oauthProviderFor(sourceType);
    if (!provider) return;
    setBusy(true);
    onDone(null);
    try {
      const res = await fetch("/api/user/connections/oauth-account", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        onDone({
          kind: "error",
          text: data.error || "Failed to reset connection",
        });
        return;
      }
      // Kick the browser straight into the provider's OAuth flow.  When it
      // comes back, ChatV2's OAuth-redirect handler drops us on this
      // source's detail view.
      window.location.href = connectUrl(sourceType);
    } catch {
      onDone({ kind: "error", text: "Something went wrong." });
    } finally {
      setBusy(false);
    }
  }

  if (!armed) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={() => setArmed(true)}
        disabled={busy}
      >
        <I.Refresh size={12} /> Fully reconnect {sourceLabel}
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-[12.5px] text-v2-ink-muted">
        Sign out of {sourceLabel} and re-authorize? Fixes stuck tokens.
      </span>
      <Button variant="ghost" size="sm" onClick={() => setArmed(false)}>
        Cancel
      </Button>
      <Button variant="primary" size="sm" onClick={doReset} disabled={busy}>
        {busy ? "Resetting…" : "Confirm reconnect"}
      </Button>
    </div>
  );
}

/** Per-account Retry sync.  Calls /api/resync which clears lastSyncError,
 * marks BACKFILLING, and re-runs the sync.  If sync fails again, the new
 * error message gets written — the point of this button is to capture WHY
 * a sync is failing when the initial enable-export catch block swallowed
 * the error message. */
function RetrySyncButton({
  dataSourceId,
  label,
  onDone,
}: {
  dataSourceId: string;
  label: string;
  onDone: (
    msg: { kind: "success" | "error"; text: string } | null
  ) => void;
}) {
  const [busy, setBusy] = React.useState(false);
  return (
    <Button
      variant="outline"
      size="sm"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        onDone(null);
        try {
          const res = await fetch("/api/resync", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ dataSourceId }),
          });
          if (!res.ok) {
            const data = await res.json().catch(() => ({}));
            onDone({
              kind: "error",
              text:
                data.error || data.message || "Retry failed",
            });
            return;
          }
          onDone({ kind: "success", text: `${label}: retry started.` });
        } catch {
          onDone({ kind: "error", text: "Retry failed." });
        } finally {
          setBusy(false);
        }
      }}
    >
      <I.Refresh size={12} className={busy ? "animate-spin" : ""} />
      {busy ? "Retrying…" : "Retry sync"}
    </Button>
  );
}

function oauthProviderFor(type: SourceType): string | null {
  switch (type) {
    case "GA4_BIGQUERY":
    case "GOOGLE_ADS":
    case "SEARCH_CONSOLE":
      return "google";
    case "MICROSOFT_ADS":
      return "microsoft-ads";
    case "LINKEDIN":
      return "linkedin";
    case "MAILCHIMP":
      return "mailchimp";
    default:
      return null;
  }
}

/** Two-click inline confirm for "Disconnect [source]".  No portal / no dialog
 * — we discovered that Radix dialogs render outside the `.meaning-v2` scope
 * and appear invisible, so users kept reporting "the button does nothing." */
function DisconnectSourceButton({
  sourceLabel,
  busy,
  onConfirm,
}: {
  sourceLabel: string;
  busy: boolean;
  onConfirm: () => void | Promise<void>;
}) {
  const [armed, setArmed] = React.useState(false);
  if (!armed) {
    return (
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setArmed(true)}
        disabled={busy}
        style={{ color: "var(--v2-neg)" }}
      >
        Disconnect {sourceLabel}
      </Button>
    );
  }
  return (
    <div className="flex items-center gap-2">
      <span className="text-[12.5px] text-v2-ink-muted">
        Disconnect all {sourceLabel} accounts? Historical data is preserved.
      </span>
      <Button variant="ghost" size="sm" onClick={() => setArmed(false)}>
        Cancel
      </Button>
      <Button
        variant="primary"
        size="sm"
        disabled={busy}
        onClick={async () => {
          setArmed(false);
          await onConfirm();
        }}
        style={{
          background: "var(--v2-neg)",
          borderColor: "var(--v2-neg)",
        }}
      >
        {busy ? "Disconnecting…" : "Confirm disconnect"}
      </Button>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-v2-ink-subtle">
      {children}
    </div>
  );
}

/* =============================================================================
   ADD-ACCOUNT FLOW
   Each source has its own accessible-accounts endpoint + enable-export
   endpoint.  Fetches the list on open, lets the user enable whichever rows
   aren't already connected.
   ========================================================================== */

interface AddAccountSectionProps {
  sourceType: SourceType;
  isAuthed: boolean;
  orgId: string | null;
  connectedIds: DataSourceInfo[];
  onEnabled: () => void;
  onError: (text: string) => void;
}

function AddAccountSection({
  sourceType,
  isAuthed,
  orgId,
  connectedIds,
  onEnabled,
  onError,
}: AddAccountSectionProps) {
  if (sourceType === "META") {
    return (
      <div className="rounded-[10px] border border-v2-line bg-v2-surface px-4 py-8 text-center">
        <div className="text-[13.5px] text-v2-ink-muted">Coming soon</div>
      </div>
    );
  }

  if (!isAuthed) {
    return (
      <div className="rounded-[10px] border border-v2-line bg-v2-surface px-4 py-6 text-center">
        <p className="mb-3 text-[13px] text-v2-ink-muted">
          Sign in to continue adding this source.
        </p>
        <Button variant="primary" size="sm" asChild>
          <a href={connectUrl(sourceType)}>Continue</a>
        </Button>
      </div>
    );
  }

  return (
    <AccountPicker
      sourceType={sourceType}
      orgId={orgId}
      connectedIds={connectedIds}
      onEnabled={onEnabled}
      onError={onError}
    />
  );
}

type PickerItem = { id: string; label: string; sublabel?: string };

function AccountPicker({
  sourceType,
  orgId,
  connectedIds,
  onEnabled,
  onError,
}: {
  sourceType: SourceType;
  orgId: string | null;
  connectedIds: DataSourceInfo[];
  onEnabled: () => void;
  onError: (text: string) => void;
}) {
  const [items, setItems] = React.useState<PickerItem[] | null>(null);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [enabling, setEnabling] = React.useState<Record<string, boolean>>({});

  React.useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError(null);

    async function load() {
      try {
        const list = await fetchAccessibleAccounts(sourceType);
        if (!cancelled) setItems(list);
      } catch (err) {
        if (!cancelled) {
          setItems([]);
          setLoadError(err instanceof Error ? err.message : String(err));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [sourceType]);

  const connectedSet = new Set(
    connectedIds.map((ds) => ds.propertyId || ds.adsCustomerId).filter(Boolean)
  );

  async function enable(item: PickerItem) {
    setEnabling((p) => ({ ...p, [item.id]: true }));
    try {
      const endpoint = enableEndpoint(sourceType, item.id, orgId);
      if (!endpoint) return;
      const res = await fetch(endpoint.url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(endpoint.body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        onError(data.message || data.error || "Failed to enable");
        return;
      }
      onEnabled();
    } catch {
      onError("Something went wrong.");
    } finally {
      setEnabling((p) => ({ ...p, [item.id]: false }));
    }
  }

  if (loading) {
    return (
      <div className="rounded-[10px] border border-v2-line bg-v2-surface px-4 py-6 text-center text-[13px] text-v2-ink-muted">
        Loading accounts…
      </div>
    );
  }

  if (!items || items.length === 0) {
    return (
      <div className="rounded-[10px] border border-v2-line bg-v2-surface px-4 py-6 text-center text-[13px] text-v2-ink-muted">
        {loadError ? (
          <>
            <div className="text-v2-neg">{loadError}</div>
            <div className="mt-2 text-v2-ink-muted">
              Try <span className="font-medium text-v2-ink">Fully reconnect {" "}{sourceType === "MICROSOFT_ADS" ? "Microsoft Ads" : "this source"}</span>
              {" "}below — it clears stuck OAuth state.
            </div>
          </>
        ) : (
          "No accounts accessible with the signed-in identity."
        )}
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-[10px] border border-v2-line bg-v2-surface">
      {items.map((item, i) => {
        const already = connectedSet.has(item.id);
        return (
          <div
            key={item.id}
            className={`flex items-center justify-between px-4 py-3 ${i === items.length - 1 ? "" : "border-b border-v2-line"}`}
          >
            <div className="min-w-0 flex-1 pr-3">
              <div className="truncate text-[13px] text-v2-ink">{item.label}</div>
              {item.sublabel && (
                <div className="mono truncate text-[11px] text-v2-ink-muted">
                  {item.sublabel}
                </div>
              )}
            </div>
            {already ? (
              <span className="text-[11.5px] text-v2-ink-muted">Connected</span>
            ) : (
              <Button
                variant="primary"
                size="sm"
                onClick={() => enable(item)}
                disabled={!!enabling[item.id]}
              >
                {enabling[item.id] ? "Enabling…" : "Enable"}
              </Button>
            )}
          </div>
        );
      })}
    </div>
  );
}

async function fetchAccessibleAccounts(
  sourceType: SourceType
): Promise<PickerItem[]> {
  // Shared fetch helper: surface the API's `error`/`message`/`detail` text so
  // the picker's error UI shows something actionable like "No Microsoft Ads
  // token. Please connect your account first." instead of a generic "No
  // accounts accessible" dead-end.
  async function getJson(url: string): Promise<Record<string, unknown>> {
    const res = await fetch(url);
    const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    if (!res.ok) {
      const msg =
        (typeof data.error === "string" && data.error) ||
        (typeof data.message === "string" && data.message) ||
        (typeof data.detail === "string" && data.detail) ||
        `${res.status} ${res.statusText}`;
      throw new Error(msg);
    }
    return data;
  }

  switch (sourceType) {
    case "GA4_BIGQUERY": {
      const r = await getJson("/api/analytics/properties");
      return ((r.properties ?? []) as Ga4Property[]).map((p) => ({
        id: p.propertyId,
        label: p.displayName,
        sublabel: `${p.account} · ${p.propertyId}`,
      }));
    }
    case "GOOGLE_ADS": {
      const r = await getJson("/api/ads/accessible-customers");
      const raw =
        (r.customers as AdsCustomer[] | undefined) ||
        ((r.customerIds as string[] | undefined) || []).map((id: string) => ({
          id,
          name: `Account ${id}`,
        }));
      return (raw as AdsCustomer[]).map((c) => ({
        id: c.id,
        label: c.name,
        sublabel: c.id,
      }));
    }
    case "SEARCH_CONSOLE": {
      const r = await getJson("/api/gsc/accessible-sites");
      return ((r.sites ?? []) as GscSite[]).map((s) => ({
        id: s.siteUrl,
        label: s.siteUrl,
        sublabel: s.permissionLevel,
      }));
    }
    case "LINKEDIN": {
      const r = await getJson("/api/linkedin/accessible-organizations");
      return ((r.organizations ?? []) as LinkedInOrg[]).map((o) => ({
        id: o.id,
        label: o.name,
        sublabel: o.vanityName ?? o.id,
      }));
    }
    case "MAILCHIMP": {
      const r = await getJson("/api/mailchimp/accessible-audiences");
      return ((r.audiences ?? []) as MailchimpAudience[]).map((a) => ({
        id: a.id,
        label: a.name,
        sublabel: `${a.memberCount.toLocaleString()} members · ${a.campaignCount} campaigns`,
      }));
    }
    case "MICROSOFT_ADS": {
      const r = await getJson("/api/microsoft-ads/accessible-accounts");
      return ((r.accounts ?? []) as MicrosoftAdsAccount[]).map((a) => ({
        id: a.accountId,
        label: a.accountName,
        sublabel: `${a.accountNumber} · customer ${a.customerId}`,
      }));
    }
    default:
      return [];
  }
}

function enableEndpoint(
  sourceType: SourceType,
  id: string,
  orgId: string | null
): { url: string; body: Record<string, string | undefined> } | null {
  const orgVal = orgId ?? undefined;
  switch (sourceType) {
    case "GA4_BIGQUERY":
      return {
        url: "/api/analytics/enable-bigquery-export",
        body: { propertyId: id, orgId: orgVal },
      };
    case "GOOGLE_ADS":
      return {
        url: "/api/ads/enable-export",
        body: { customerId: id, orgId: orgVal },
      };
    case "SEARCH_CONSOLE":
      return {
        url: "/api/gsc/enable-export",
        body: { siteUrl: id, orgId: orgVal },
      };
    case "LINKEDIN":
      return {
        url: "/api/linkedin/enable-export",
        body: { orgId: id, organizationOrgId: orgVal },
      };
    case "MAILCHIMP":
      return {
        url: "/api/mailchimp/enable-export",
        body: { listId: id, orgId: orgVal },
      };
    case "MICROSOFT_ADS":
      return {
        url: "/api/microsoft-ads/enable-export",
        body: { accountId: id, orgId: orgVal },
      };
    default:
      return null;
  }
}

/* =============================================================================
   TOAST
   ========================================================================== */

function MessageToast({
  message,
  onDismiss,
}: {
  message: { kind: "success" | "error"; text: string } | null;
  onDismiss: () => void;
}) {
  React.useEffect(() => {
    if (!message) return;
    const t = setTimeout(onDismiss, 4500);
    return () => clearTimeout(t);
  }, [message, onDismiss]);

  if (!message) return null;

  const tone =
    message.kind === "error"
      ? {
          bg: "var(--v2-neg-bg)",
          border: "var(--v2-neg)",
          ink: "var(--v2-neg)",
        }
      : {
          bg: "var(--v2-pos-bg)",
          border: "var(--v2-pos)",
          ink: "var(--v2-pos)",
        };

  return (
    <div
      className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full border px-4 py-2 text-[12.5px] shadow-md"
      style={{
        background: tone.bg,
        borderColor: "color-mix(in oklab, currentColor 30%, transparent)",
        color: tone.ink,
      }}
      role="status"
    >
      {message.text}
    </div>
  );
}
