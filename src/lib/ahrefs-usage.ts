/**
 * Ahrefs API unit accounting and budget enforcement.
 *
 * ── How Ahrefs bills API v3 ────────────────────────────────────────────────
 *
 *     cost(request) = max(50, rows_returned × units_per_row)
 *
 * Every request carries a **50-unit minimum**, and row-priced endpoints add a
 * per-row charge on top once they return enough rows to clear that floor. The
 * per-row prices below were measured against the free `ahrefs.com` probe target
 * using the exact `select` lists in ahrefs-transfer.ts — a request whose target
 * is `ahrefs.com` or `wordcount.com` costs nothing, so the price list can be
 * re-verified at any time without spending quota.
 *
 * The 50-unit floor is what actually drives our bill: nine requests per domain
 * per sync run is ~450 units before a single row is returned.
 */

const AHREFS_API_BASE = "https://api.ahrefs.com/v3";

export const AHREFS_MIN_UNITS_PER_REQUEST = 50;

/** Measured units-per-row for the exact `select` lists used by ahrefs-transfer. */
export const AHREFS_UNITS_PER_ROW: Record<string, number> = {
  "/site-explorer/metrics": 44,
  "/site-explorer/domain-rating": 2,
  "/site-explorer/backlinks-stats": 12,
  "/site-explorer/organic-keywords": 39,
  "/site-explorer/top-pages": 25,
  "/site-explorer/refdomains": 17,
  "/site-audit/projects": 0,
  "/site-audit/issues": 0,
  "/management/projects": 0,
};

/** Estimated cost of a single request that returned `rows` rows. */
export function estimateUnits(path: string, rows: number): number {
  const perRow = AHREFS_UNITS_PER_ROW[path] ?? 0;
  return Math.max(AHREFS_MIN_UNITS_PER_REQUEST, Math.round(rows * perRow));
}

/**
 * Accumulates the estimated unit spend of a sync run so it can be logged and
 * compared against the monthly cap.
 */
export class UnitMeter {
  private total = 0;
  private calls: Array<{ path: string; rows: number; units: number }> = [];

  record(path: string, rows: number): number {
    const units = estimateUnits(path, rows);
    this.total += units;
    this.calls.push({ path, rows, units });
    return units;
  }

  get units(): number {
    return this.total;
  }

  get requests(): number {
    return this.calls.length;
  }

  summary(): string {
    if (this.calls.length === 0) return "0 units (0 requests)";
    const parts = this.calls.map((c) => `${c.path}=${c.units}u/${c.rows}r`);
    return `${this.total} units across ${this.calls.length} requests [${parts.join(", ")}]`;
  }
}

// ---------------------------------------------------------------------------
// Live quota (free endpoint — costs 0 units)
// ---------------------------------------------------------------------------

export interface AhrefsQuota {
  used: number;
  limit: number;
  remaining: number;
  /** Percent of the monthly workspace cap consumed, 0-100. */
  pct: number;
  resetDate: string | null;
}

/** Alert (email) once the workspace crosses this percentage of its cap. */
export const AHREFS_ALERT_PCT = Number(process.env.AHREFS_ALERT_PCT ?? 70);

/** Refuse to start new syncs once the workspace crosses this percentage. */
export const AHREFS_STOP_PCT = Number(process.env.AHREFS_STOP_PCT ?? 95);

let _quotaCache: { at: number; quota: AhrefsQuota | null } | null = null;
const QUOTA_TTL_MS = 5 * 60 * 1000;

/**
 * Read the workspace's current unit usage.
 *
 * `/subscription-info/limits-and-usage` is explicitly free — it consumes no
 * units — so this is safe to call before every sync. Cached for 5 minutes so a
 * batch of domains issues one request, not one per domain.
 */
export async function getAhrefsQuota(
  apiKey: string,
  { force = false }: { force?: boolean } = {},
): Promise<AhrefsQuota | null> {
  if (!force && _quotaCache && Date.now() - _quotaCache.at < QUOTA_TTL_MS) {
    return _quotaCache.quota;
  }

  let quota: AhrefsQuota | null = null;
  try {
    const res = await fetch(
      `${AHREFS_API_BASE}/subscription-info/limits-and-usage`,
      { headers: { Authorization: `Bearer ${apiKey}` } },
    );
    if (res.ok) {
      const data = (await res.json()) as {
        limits_and_usage?: {
          units_limit_workspace?: number | null;
          units_usage_workspace?: number | null;
          usage_reset_date?: string | null;
        };
      };
      const l = data.limits_and_usage;
      const limit = Number(l?.units_limit_workspace ?? 0);
      const used = Number(l?.units_usage_workspace ?? 0);
      if (limit > 0) {
        quota = {
          used,
          limit,
          remaining: Math.max(0, limit - used),
          pct: (used / limit) * 100,
          resetDate: l?.usage_reset_date ?? null,
        };
      }
    } else {
      console.warn(`[ahrefs-usage] Quota check failed: ${res.status}`);
    }
  } catch (err) {
    console.warn("[ahrefs-usage] Quota check error:", (err as Error).message);
  }

  _quotaCache = { at: Date.now(), quota };
  return quota;
}

/** Invalidate the cached quota — call after a run that spent a lot of units. */
export function invalidateQuotaCache(): void {
  _quotaCache = null;
}

// ---------------------------------------------------------------------------
// Threshold alerting
// ---------------------------------------------------------------------------

/** Remembers the last UTC day we alerted on, so we email at most once a day. */
let _lastAlertDay: string | null = null;

/**
 * Send an admin alert if the workspace has crossed AHREFS_ALERT_PCT.
 * Fires at most once per UTC day so a 2×/day cron doesn't spam.
 */
export async function maybeAlertOnQuota(quota: AhrefsQuota | null): Promise<void> {
  if (!quota || quota.pct < AHREFS_ALERT_PCT) return;

  const today = new Date().toISOString().slice(0, 10);
  if (_lastAlertDay === today) return;
  _lastAlertDay = today;

  try {
    const { sendAhrefsQuotaEmail } = await import("@/lib/resend");
    await sendAhrefsQuotaEmail({
      used: quota.used,
      limit: quota.limit,
      pct: quota.pct,
      resetDate: quota.resetDate,
      blocked: quota.pct >= AHREFS_STOP_PCT,
    });
  } catch (err) {
    console.error("[ahrefs-usage] Failed to send quota alert:", err);
  }
}
