import { BigQuery } from "@google-cloud/bigquery";
import { getValidLinkedInTokenForUser } from "@/lib/linkedin-token";

// ---------------------------------------------------------------------------
// Client singletons
// ---------------------------------------------------------------------------

let _bqClient: BigQuery | null = null;

function getBqClient(): BigQuery {
  if (_bqClient) return _bqClient;

  const raw = process.env.GOOGLE_BIGQUERY_CREDENTIALS;
  if (!raw) throw new Error("GOOGLE_BIGQUERY_CREDENTIALS env var is not set");

  const credentials = JSON.parse(raw);
  _bqClient = new BigQuery({
    projectId: credentials.project_id,
    credentials,
  });
  return _bqClient;
}

function getProjectId(): string {
  const raw = process.env.GOOGLE_BIGQUERY_CREDENTIALS;
  if (!raw) throw new Error("GOOGLE_BIGQUERY_CREDENTIALS env var is not set");
  return JSON.parse(raw).project_id;
}

// ---------------------------------------------------------------------------
// Dataset helpers
// ---------------------------------------------------------------------------

export function getLinkedInDataset(orgId: string): string {
  return `linkedin_${orgId}`;
}

export async function ensureDataset(datasetId: string): Promise<void> {
  const bq = getBqClient();
  const dataset = bq.dataset(datasetId);
  const [exists] = await dataset.exists();
  if (!exists) {
    let location = "EU";
    try {
      const [meta] = await bq.dataset("dbt_meaning").getMetadata();
      location = meta.location || "EU";
    } catch {
      // Default to EU
    }
    await bq.createDataset(datasetId, { location });
    console.log(`[linkedin-transfer] Created dataset: ${datasetId} in ${location}`);
  }
}

// ---------------------------------------------------------------------------
// Table schemas
// ---------------------------------------------------------------------------

const TABLE_SCHEMAS: Record<string, { fields: { name: string; type: string }[]; partition?: string }> = {
  post_performance: {
    partition: "post_date",
    fields: [
      { name: "post_date", type: "DATE" },
      { name: "post_urn", type: "STRING" },
      { name: "post_text", type: "STRING" },
      { name: "impressions", type: "INT64" },
      { name: "clicks", type: "INT64" },
      { name: "comments", type: "INT64" },
      { name: "likes", type: "INT64" },
      { name: "shares", type: "INT64" },
      { name: "engagements", type: "INT64" },
      { name: "daily_impressions", type: "INT64" },
      { name: "daily_clicks", type: "INT64" },
      { name: "daily_engagements", type: "INT64" },
    ],
  },
  follower_stats: {
    partition: "stats_date",
    fields: [
      { name: "stats_date", type: "DATE" },
      { name: "total_followers", type: "INT64" },
      { name: "organic_gains", type: "INT64" },
      { name: "paid_gains", type: "INT64" },
    ],
  },
  follower_demographics: {
    partition: "stats_date",
    fields: [
      { name: "stats_date", type: "DATE" },
      { name: "dimension", type: "STRING" },  // "country", "industry", "seniority", "function", "company_size"
      { name: "dimension_value", type: "STRING" },
      { name: "follower_count", type: "INT64" },
    ],
  },
  page_stats: {
    partition: "stats_date",
    fields: [
      { name: "stats_date", type: "DATE" },
      { name: "page_views", type: "INT64" },
      { name: "unique_visitors", type: "INT64" },
      { name: "clicks", type: "INT64" },
    ],
  },
  org_info: {
    fields: [
      { name: "organization_id", type: "STRING" },
      { name: "organization_name", type: "STRING" },
      { name: "vanity_name", type: "STRING" },
      { name: "last_synced_at", type: "TIMESTAMP" },
    ],
  },
};

// ---------------------------------------------------------------------------
// Table management
// ---------------------------------------------------------------------------

export async function ensureLinkedInTables(datasetId: string): Promise<void> {
  const bq = getBqClient();
  const dataset = bq.dataset(datasetId);

  for (const [tableName, schema] of Object.entries(TABLE_SCHEMAS)) {
    const table = dataset.table(tableName);
    const [exists] = await table.exists();
    if (exists) continue;

    const options: Record<string, unknown> = {
      schema: { fields: schema.fields },
    };

    if (schema.partition) {
      options.timePartitioning = {
        type: "DAY",
        field: schema.partition,
      };
    }

    await table.create(options);
    console.log(`[linkedin-transfer] Created table: ${datasetId}.${tableName}`);
  }
}

// ---------------------------------------------------------------------------
// LinkedIn API helpers
// ---------------------------------------------------------------------------

const LINKEDIN_API_VERSION = "202603";

interface LinkedInApiOptions {
  accessToken: string;
  url: string;
}

async function linkedInGet({ accessToken, url }: LinkedInApiOptions): Promise<unknown> {
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Linkedin-Version": LINKEDIN_API_VERSION,
      "X-Restli-Protocol-Version": "2.0.0",
    },
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`LinkedIn API error ${res.status}: ${body}`);
  }

  return res.json();
}

// ---------------------------------------------------------------------------
// Sync orchestrator
// ---------------------------------------------------------------------------

export interface LinkedInSyncResult {
  postRows: number;
  followerRows: number;
  demographicRows: number;
  pageStatRows: number;
}

/**
 * Sync LinkedIn organization data into BigQuery for a date range.
 * Fetches from the LinkedIn Community Management API, then upserts into BQ.
 */
export async function syncLinkedInData(
  userId: string,
  orgId: string,
  startDate: string,
  endDate: string,
): Promise<LinkedInSyncResult> {
  const accessToken = await getValidLinkedInTokenForUser(userId);
  if (!accessToken) throw new Error(`No LinkedIn token for user ${userId}`);

  const datasetId = getLinkedInDataset(orgId);
  const bq = getBqClient();
  const projectId = getProjectId();
  const orgUrn = `urn:li:organization:${orgId}`;

  console.log(`[linkedin-sync] Starting sync for org ${orgId}, ${startDate} → ${endDate}`);

  await ensureDataset(datasetId);
  await ensureLinkedInTables(datasetId);

  const today = new Date().toISOString().split("T")[0];

  // ── 1. Post performance (share statistics — lifetime totals snapshot) ──
  // Note: Development Tier does not support time-series breakdowns.
  // We store a daily snapshot + computed daily deltas for easy querying.
  let postRows: Record<string, unknown>[] = [];
  try {
    const shareStats = (await linkedInGet({
      accessToken,
      url: `https://api.linkedin.com/rest/organizationalEntityShareStatistics?q=organizationalEntity&organizationalEntity=${encodeURIComponent(orgUrn)}`,
    })) as {
      elements?: Array<{
        totalShareStatistics?: {
          impressionCount?: number;
          uniqueImpressionsCount?: number;
          clickCount?: number;
          commentCount?: number;
          likeCount?: number;
          shareCount?: number;
          engagement?: number;
        };
        organizationalEntity?: string;
      }>;
    };

    // Fetch previous day's cumulative totals to compute daily deltas
    let prevImpressions = 0;
    let prevClicks = 0;
    let prevEngagements = 0;
    try {
      const fqTable = `\`${projectId}.${datasetId}.post_performance\``;
      const [prevRows] = await bq.query({
        query: `SELECT impressions, clicks, engagements FROM ${fqTable} WHERE post_date < '${today}' ORDER BY post_date DESC LIMIT 1`,
      });
      if (prevRows.length > 0) {
        prevImpressions = Number(prevRows[0].impressions ?? 0);
        prevClicks = Number(prevRows[0].clicks ?? 0);
        prevEngagements = Number(prevRows[0].engagements ?? 0);
      }
    } catch {
      // No previous data — first sync, deltas will equal the totals
    }

    for (const el of shareStats.elements ?? []) {
      const stats = el.totalShareStatistics ?? {};
      const impressions = Number(stats.impressionCount ?? 0);
      const clicks = Number(stats.clickCount ?? 0);
      const engagements = Number(stats.clickCount ?? 0) + Number(stats.likeCount ?? 0) + Number(stats.commentCount ?? 0) + Number(stats.shareCount ?? 0);

      postRows.push({
        post_date: today,
        post_urn: el.organizationalEntity ?? orgUrn,
        post_text: "lifetime_totals",
        impressions,
        clicks,
        comments: Number(stats.commentCount ?? 0),
        likes: Number(stats.likeCount ?? 0),
        shares: Number(stats.shareCount ?? 0),
        engagements,
        daily_impressions: Math.max(impressions - prevImpressions, 0),
        daily_clicks: Math.max(clicks - prevClicks, 0),
        daily_engagements: Math.max(engagements - prevEngagements, 0),
      });
    }
  } catch (err) {
    console.warn(`[linkedin-sync] Share stats fetch failed (non-fatal):`, (err as Error).message);
  }

  // ── 2. Follower statistics (lifetime snapshot from demographics endpoint) ──
  // The follower endpoint returns demographic breakdowns with counts.
  // We extract total followers from the seniority breakdown (most complete).
  let followerRows: Record<string, unknown>[] = [];
  let demographicRows: Record<string, unknown>[] = [];
  try {
    const followerStats = (await linkedInGet({
      accessToken,
      url: `https://api.linkedin.com/rest/organizationalEntityFollowerStatistics?q=organizationalEntity&organizationalEntity=${encodeURIComponent(orgUrn)}`,
    })) as {
      elements?: Array<{
        followerCountsBySeniority?: Array<{
          seniority: string;
          followerCounts: { organicFollowerCount?: number; paidFollowerCount?: number };
        }>;
        followerCountsByIndustry?: Array<{
          industry: string;
          followerCounts: { organicFollowerCount?: number; paidFollowerCount?: number };
        }>;
        followerCountsByFunction?: Array<{
          function: string;
          followerCounts: { organicFollowerCount?: number; paidFollowerCount?: number };
        }>;
        followerCountsByStaffCountRange?: Array<{
          staffCountRange: string;
          followerCounts: { organicFollowerCount?: number; paidFollowerCount?: number };
        }>;
        followerCountsByGeo?: Array<{
          geo: string;
          followerCounts: { organicFollowerCount?: number; paidFollowerCount?: number };
        }>;
        followerCountsByAssociationType?: Array<{
          associationType: string;
          followerCounts: { organicFollowerCount?: number; paidFollowerCount?: number };
        }>;
      }>;
    };

    for (const el of followerStats.elements ?? []) {
      // Calculate total followers from seniority breakdown
      let totalOrganic = 0;
      let totalPaid = 0;

      const processDimension = (
        items: Array<{ followerCounts: { organicFollowerCount?: number; paidFollowerCount?: number }; [key: string]: unknown }> | undefined,
        dimName: string,
        keyField: string
      ) => {
        if (!items) return;
        for (const item of items) {
          const organic = Number(item.followerCounts?.organicFollowerCount ?? 0);
          const paid = Number(item.followerCounts?.paidFollowerCount ?? 0);
          demographicRows.push({
            stats_date: today,
            dimension: dimName,
            dimension_value: String((item as Record<string, unknown>)[keyField] ?? "unknown"),
            follower_count: organic + paid,
          });
        }
      };

      // Sum from seniority (most reliable total)
      for (const s of el.followerCountsBySeniority ?? []) {
        totalOrganic += Number(s.followerCounts?.organicFollowerCount ?? 0);
        totalPaid += Number(s.followerCounts?.paidFollowerCount ?? 0);
      }

      followerRows.push({
        stats_date: today,
        total_followers: totalOrganic + totalPaid,
        organic_gains: totalOrganic,
        paid_gains: totalPaid,
      });

      // Store demographic breakdowns
      processDimension(el.followerCountsBySeniority as Array<{ followerCounts: { organicFollowerCount?: number; paidFollowerCount?: number }; seniority: string }>, "seniority", "seniority");
      processDimension(el.followerCountsByIndustry as Array<{ followerCounts: { organicFollowerCount?: number; paidFollowerCount?: number }; industry: string }>, "industry", "industry");
      processDimension(el.followerCountsByFunction as Array<{ followerCounts: { organicFollowerCount?: number; paidFollowerCount?: number }; function: string }>, "function", "function");
      processDimension(el.followerCountsByStaffCountRange as Array<{ followerCounts: { organicFollowerCount?: number; paidFollowerCount?: number }; staffCountRange: string }>, "company_size", "staffCountRange");
      processDimension(el.followerCountsByGeo as Array<{ followerCounts: { organicFollowerCount?: number; paidFollowerCount?: number }; geo: string }>, "country", "geo");
    }
  } catch (err) {
    console.warn(`[linkedin-sync] Follower stats fetch failed (non-fatal):`, (err as Error).message);
  }

  // ── 3. Page statistics (lifetime snapshot with industry/seniority breakdowns) ──
  let pageStatRows: Record<string, unknown>[] = [];
  try {
    const pageStats = (await linkedInGet({
      accessToken,
      url: `https://api.linkedin.com/rest/organizationPageStatistics?q=organization&organization=${encodeURIComponent(orgUrn)}`,
    })) as {
      elements?: Array<{
        totalPageStatistics?: {
          views?: {
            allPageViews?: { pageViews?: number };
            mobilePageViews?: { pageViews?: number };
            desktopPageViews?: { pageViews?: number };
          };
        };
        [key: string]: unknown;
      }>;
    };

    for (const el of pageStats.elements ?? []) {
      const views = el.totalPageStatistics?.views;
      if (views) {
        const total = Number(views.allPageViews?.pageViews ?? 0);
        const mobile = Number(views.mobilePageViews?.pageViews ?? 0);
        const desktop = Number(views.desktopPageViews?.pageViews ?? 0);
        if (total > 0) {
          pageStatRows.push({
            stats_date: today,
            page_views: total,
            unique_visitors: desktop + mobile, // best approximation
            clicks: 0,
          });
          break; // Only need one summary row from the totalPageStatistics
        }
      }
    }
  } catch (err) {
    console.warn(`[linkedin-sync] Page stats fetch failed (non-fatal):`, (err as Error).message);
  }

  // ── 5. Org info ──
  let orgInfoRows: Record<string, unknown>[] = [];
  try {
    const orgData = (await linkedInGet({
      accessToken,
      url: `https://api.linkedin.com/rest/organizations/${orgId}`,
    })) as { localizedName?: string; vanityName?: string };

    orgInfoRows = [{
      organization_id: orgId,
      organization_name: orgData.localizedName ?? "",
      vanity_name: orgData.vanityName ?? "",
      last_synced_at: new Date().toISOString(),
    }];
  } catch (err) {
    console.warn(`[linkedin-sync] Org info fetch failed (non-fatal):`, (err as Error).message);
  }

  console.log(
    `[linkedin-sync] Fetched: ${postRows.length} post, ${followerRows.length} follower, ${demographicRows.length} demographic, ${pageStatRows.length} page rows`
  );

  // ── Delete existing rows for today's snapshot (idempotent re-sync) ──
  const fqDataset = `\`${projectId}.${datasetId}\``;
  const deleteTasks: Promise<unknown>[] = [];

  if (postRows.length > 0) {
    deleteTasks.push(
      bq.query({ query: `DELETE FROM ${fqDataset}.post_performance WHERE post_date = '${today}'` }).catch(() => {})
    );
  }
  if (followerRows.length > 0) {
    deleteTasks.push(
      bq.query({ query: `DELETE FROM ${fqDataset}.follower_stats WHERE stats_date = '${today}'` }).catch(() => {})
    );
  }
  if (pageStatRows.length > 0) {
    deleteTasks.push(
      bq.query({ query: `DELETE FROM ${fqDataset}.page_stats WHERE stats_date = '${today}'` }).catch(() => {})
    );
  }
  // Demographics: replace all (it's a lifetime snapshot)
  if (demographicRows.length > 0) {
    deleteTasks.push(
      bq.query({ query: `DELETE FROM ${fqDataset}.follower_demographics WHERE TRUE` }).catch(() => {})
    );
  }

  await Promise.all(deleteTasks);

  // ── Streaming insert into BigQuery ──
  const insertTasks: Promise<unknown>[] = [];
  const dataset = bq.dataset(datasetId);

  if (postRows.length > 0) {
    insertTasks.push(dataset.table("post_performance").insert(postRows));
  }
  if (followerRows.length > 0) {
    insertTasks.push(dataset.table("follower_stats").insert(followerRows));
  }
  if (demographicRows.length > 0) {
    insertTasks.push(dataset.table("follower_demographics").insert(demographicRows));
  }
  if (pageStatRows.length > 0) {
    insertTasks.push(dataset.table("page_stats").insert(pageStatRows));
  }

  // Org info: truncate and replace
  if (orgInfoRows.length > 0) {
    await bq.query({ query: `DELETE FROM ${fqDataset}.org_info WHERE TRUE` }).catch(() => {});
    insertTasks.push(dataset.table("org_info").insert(orgInfoRows));
  }

  await Promise.all(insertTasks);

  console.log(`[linkedin-sync] Sync complete for org ${orgId}`);
  return {
    postRows: postRows.length,
    followerRows: followerRows.length,
    demographicRows: demographicRows.length,
    pageStatRows: pageStatRows.length,
  };
}

// ---------------------------------------------------------------------------
// Data status check
// ---------------------------------------------------------------------------

export interface LinkedInDataStatus {
  datasetId: string;
  hasData: boolean;
  tables: string[];
}

export async function checkLinkedInDataStatus(
  orgId: string,
): Promise<LinkedInDataStatus> {
  const bq = getBqClient();
  const datasetId = getLinkedInDataset(orgId);

  try {
    const dataset = bq.dataset(datasetId);
    const [exists] = await dataset.exists();
    if (!exists) {
      return { datasetId, hasData: false, tables: [] };
    }

    const [tables] = await dataset.getTables();
    const tableNames = tables.map((t) => t.id || "").filter(Boolean);
    const expectedTables = Object.keys(TABLE_SCHEMAS);
    const hasExpected = expectedTables.some((t) => tableNames.includes(t));
    return { datasetId, hasData: hasExpected, tables: tableNames };
  } catch {
    return { datasetId, hasData: false, tables: [] };
  }
}
