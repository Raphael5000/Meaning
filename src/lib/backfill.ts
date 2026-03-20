import { BigQuery } from "@google-cloud/bigquery";
import { google } from "googleapis";

const DBT_DATASET = "dbt_meaning";

function getBqClient(): BigQuery {
  const raw = process.env.GOOGLE_BIGQUERY_CREDENTIALS;
  if (!raw) throw new Error("GOOGLE_BIGQUERY_CREDENTIALS not set");
  const creds = JSON.parse(raw);
  return new BigQuery({ projectId: creds.project_id, credentials: creds });
}

const analyticsData = google.analyticsdata("v1beta");

function dateStr(daysAgo: number): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().split("T")[0];
}

async function runGA4Report(
  accessToken: string,
  propertyId: string,
  metrics: string[],
  dimensions: string[],
  startDate: string,
  endDate: string
): Promise<Record<string, string>[]> {
  const auth = new google.auth.OAuth2();
  auth.setCredentials({ access_token: accessToken });

  const res = await analyticsData.properties.runReport({
    property: `properties/${propertyId}`,
    auth,
    requestBody: {
      dateRanges: [{ startDate, endDate }],
      metrics: metrics.map((m) => ({ name: m })),
      dimensions: dimensions.map((d) => ({ name: d })),
      limit: "10000",
      keepEmptyRows: false,
    },
  });

  const dimHeaders = res.data.dimensionHeaders?.map((h) => h.name) || [];
  const metHeaders = res.data.metricHeaders?.map((h) => h.name) || [];

  return (res.data.rows || []).map((row) => {
    const obj: Record<string, string> = {};
    row.dimensionValues?.forEach((v, i) => {
      obj[dimHeaders[i] || `dim_${i}`] = v.value || "";
    });
    row.metricValues?.forEach((v, i) => {
      obj[metHeaders[i] || `met_${i}`] = v.value || "";
    });
    return obj;
  });
}

/**
 * Backfill a property's data from GA4 API into BigQuery backfill tables.
 * Creates the backfill tables if they don't exist, then populates
 * traffic_sources and sessions from GA4 API data.
 *
 * This runs after a BQ export link is created so the user has data immediately
 * instead of waiting 24 hours for the first GA4 daily export.
 */
export async function backfillProperty(
  accessToken: string,
  propertyId: string,
  days = 90
): Promise<{ sessions: number; trafficSources: number }> {
  const client = getBqClient();
  const startDate = dateStr(days);
  const endDate = dateStr(1);

  console.log(`[backfill] Starting for property ${propertyId}, ${days} days`);

  // Ensure backfill tables exist
  await ensureBackfillTables(client);

  // 1. Backfill traffic_sources
  const tsRows = await backfillTrafficSources(client, accessToken, propertyId, startDate, endDate);

  // 2. Backfill sessions
  const sessRows = await backfillSessions(client, accessToken, propertyId, startDate, endDate);

  // 3. Rebuild users table
  await rebuildUsers(client);

  console.log(`[backfill] Done: ${sessRows} sessions, ${tsRows} traffic_sources`);
  return { sessions: sessRows, trafficSources: tsRows };
}

async function ensureBackfillTables(client: BigQuery) {
  const dataset = client.dataset(DBT_DATASET);
  const [tables] = await dataset.getTables();
  const tableIds = tables.map((t) => t.id);

  if (!tableIds.includes("backfill_sessions")) {
    // Check if sessions table exists to copy schema
    if (tableIds.includes("sessions")) {
      await client.query({ query: `CREATE TABLE \`${DBT_DATASET}.backfill_sessions\` LIKE \`${DBT_DATASET}.sessions\`` });
    }
  }
  if (!tableIds.includes("backfill_traffic_sources")) {
    if (tableIds.includes("traffic_sources")) {
      await client.query({ query: `CREATE TABLE \`${DBT_DATASET}.backfill_traffic_sources\` LIKE \`${DBT_DATASET}.traffic_sources\`` });
    }
  }
}

async function backfillTrafficSources(
  client: BigQuery,
  accessToken: string,
  propertyId: string,
  startDate: string,
  endDate: string
): Promise<number> {
  const rows = await runGA4Report(
    accessToken,
    propertyId,
    ["sessions", "totalUsers", "newUsers", "screenPageViews", "bounceRate", "averageSessionDuration", "userEngagementDuration"],
    ["date", "sessionSource", "sessionMedium", "sessionDefaultChannelGrouping"],
    startDate,
    endDate
  );

  const bqRows = rows.map((r) => ({
    session_date: `${r.date!.slice(0, 4)}-${r.date!.slice(4, 6)}-${r.date!.slice(6, 8)}`,
    property_id: propertyId,
    source: r.sessionSource || "(direct)",
    medium: r.sessionMedium || "(none)",
    channel_group: r.sessionDefaultChannelGrouping || "Unassigned",
    sessions: parseInt(r.sessions || "0", 10),
    users: parseInt(r.totalUsers || "0", 10),
    new_users: parseInt(r.newUsers || "0", 10),
    pageviews: parseInt(r.screenPageViews || "0", 10),
    bounce_rate: parseFloat(r.bounceRate || "0"),
    avg_session_duration_seconds: parseFloat(r.averageSessionDuration || "0"),
    avg_engagement_time_msec: parseFloat(r.userEngagementDuration || "0") * 1000,
  }));

  if (bqRows.length > 0) {
    await client.dataset(DBT_DATASET).table("backfill_traffic_sources").insert(bqRows);
  }
  return bqRows.length;
}

async function backfillSessions(
  client: BigQuery,
  accessToken: string,
  propertyId: string,
  startDate: string,
  endDate: string
): Promise<number> {
  const rows = await runGA4Report(
    accessToken,
    propertyId,
    ["sessions", "totalUsers", "newUsers", "screenPageViews", "bounceRate", "averageSessionDuration", "engagedSessions"],
    ["date", "sessionSource", "sessionMedium", "sessionDefaultChannelGrouping", "deviceCategory", "country", "landingPage"],
    startDate,
    endDate,
  );

  const bqRows: Record<string, unknown>[] = [];
  let counter = 0;

  for (const r of rows) {
    const sessionCount = parseInt(r.sessions || "0", 10);
    const dateFormatted = `${r.date!.slice(0, 4)}-${r.date!.slice(4, 6)}-${r.date!.slice(6, 8)}`;
    const bounceRate = parseFloat(r.bounceRate || "0");
    const avgDuration = parseFloat(r.averageSessionDuration || "0");
    const newUsers = parseInt(r.newUsers || "0", 10);
    const pvPerSession = Math.round(parseInt(r.screenPageViews || "0", 10) / Math.max(sessionCount, 1));
    const engagedSessions = parseInt(r.engagedSessions || "0", 10);

    for (let i = 0; i < sessionCount; i++) {
      counter++;
      const isBounce = Math.random() < bounceRate;
      const isNew = i < newUsers;
      const isEngaged = i < engagedSessions;
      const durSec = Math.max(1, Math.round(avgDuration + (Math.random() - 0.5) * avgDuration * 0.4));

      bqRows.push({
        session_key: `${propertyId}-backfill-${counter}`,
        property_id: propertyId,
        user_pseudo_id: `backfill_user_${counter}`,
        ga_session_id: counter,
        session_date: dateFormatted,
        session_start: `${dateFormatted}T12:00:00Z`,
        session_end: `${dateFormatted}T12:00:${String(Math.min(durSec, 59)).padStart(2, "0")}Z`,
        session_duration_seconds: durSec,
        pageviews: isBounce ? 1 : pvPerSession,
        total_engagement_time_msec: isEngaged ? Math.round(avgDuration * 800) : 0,
        is_engaged: isEngaged,
        is_bounce: isBounce,
        landing_page: r.landingPage || "",
        exit_page: r.landingPage || "",
        session_source: r.sessionSource || "(direct)",
        session_medium: r.sessionMedium || "(none)",
        session_default_channel_group: r.sessionDefaultChannelGrouping || "Unassigned",
        device_category: r.deviceCategory || "desktop",
        device_os: "",
        device_browser: "",
        geo_country: r.country || "",
        geo_city: "",
        ga_session_number: isNew ? 1 : 2,
        is_first_visit: isNew,
      });
    }
  }

  // Insert in batches
  const BATCH = 500;
  for (let i = 0; i < bqRows.length; i += BATCH) {
    await client.dataset(DBT_DATASET).table("backfill_sessions").insert(bqRows.slice(i, i + BATCH));
  }
  return bqRows.length;
}

async function rebuildUsers(client: BigQuery) {
  await client.query({ query: `DROP TABLE IF EXISTS \`${DBT_DATASET}.users\`` });
  await client.query({
    query: `
      CREATE TABLE \`${DBT_DATASET}.users\`
      CLUSTER BY property_id
      AS SELECT
        property_id, user_pseudo_id,
        MIN(session_start) AS first_seen, MAX(session_start) AS last_seen,
        COUNT(*) AS total_sessions, SUM(pageviews) AS total_pageviews,
        AVG(session_duration_seconds) AS avg_session_duration_seconds,
        SAFE_DIVIDE(COUNTIF(is_bounce), COUNT(*)) AS bounce_rate,
        SUM(total_engagement_time_msec) AS total_engagement_time_msec,
        ARRAY_AGG(session_source ORDER BY session_start LIMIT 1)[SAFE_OFFSET(0)] AS acquisition_source,
        ARRAY_AGG(session_medium ORDER BY session_start LIMIT 1)[SAFE_OFFSET(0)] AS acquisition_medium,
        ARRAY_AGG(session_default_channel_group ORDER BY session_start LIMIT 1)[SAFE_OFFSET(0)] AS acquisition_channel_group,
        ARRAY_AGG(landing_page ORDER BY session_start LIMIT 1)[SAFE_OFFSET(0)] AS acquisition_landing_page,
        ARRAY_AGG(device_category ORDER BY session_start DESC LIMIT 1)[SAFE_OFFSET(0)] AS device_category,
        ARRAY_AGG(geo_country ORDER BY session_start DESC LIMIT 1)[SAFE_OFFSET(0)] AS geo_country,
        ARRAY_AGG(geo_city ORDER BY session_start DESC LIMIT 1)[SAFE_OFFSET(0)] AS geo_city,
        MAX(CASE WHEN is_first_visit THEN TRUE ELSE FALSE END) AS is_new_user
      FROM \`${DBT_DATASET}.sessions\`
      GROUP BY property_id, user_pseudo_id
    `,
    maximumBytesBilled: "5000000000",
  });
}
