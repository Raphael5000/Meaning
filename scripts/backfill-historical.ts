/**
 * Historical backfill: pulls up to 90 days of GA4 API data and writes
 * it directly into the dbt mart tables in BigQuery.
 *
 * This gives the chat/alerts historical context for trend analysis.
 * Raw event-level data is NOT backfilled — only aggregated marts.
 *
 * Usage: npx tsx scripts/backfill-historical.ts [propertyId] [days=90]
 */

import "dotenv/config";
import { BigQuery } from "@google-cloud/bigquery";
import { google } from "googleapis";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const PROPERTY_ID = process.argv[2] || "404628120";
const DAYS = Math.min(parseInt(process.argv[3] || "90", 10), 365);
const DBT_DATASET = "dbt_meaning";

const bqCreds = JSON.parse(process.env.GOOGLE_BIGQUERY_CREDENTIALS!);
const bqClient = new BigQuery({ projectId: bqCreds.project_id, credentials: bqCreds });

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

const analyticsData = google.analyticsdata("v1beta");

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function getAccessToken(): Promise<string> {
  const account = await prisma.account.findFirst({ where: { provider: "google" } });
  if (!account?.refresh_token) throw new Error("No Google refresh token");
  const oauth2 = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  );
  oauth2.setCredentials({ refresh_token: account.refresh_token });
  const { credentials } = await oauth2.refreshAccessToken();
  return credentials.access_token!;
}

function dateStr(daysAgo: number): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().split("T")[0];
}

async function runGA4Report(
  accessToken: string,
  metrics: string[],
  dimensions: string[],
  startDate: string,
  endDate: string,
  limit = 10000
): Promise<Record<string, string>[]> {
  const auth = new google.auth.OAuth2();
  auth.setCredentials({ access_token: accessToken });

  const res = await analyticsData.properties.runReport({
    property: `properties/${PROPERTY_ID}`,
    auth,
    requestBody: {
      dateRanges: [{ startDate, endDate }],
      metrics: metrics.map((m) => ({ name: m })),
      dimensions: dimensions.map((d) => ({ name: d })),
      limit: String(limit),
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

async function insertRows(table: string, rows: Record<string, unknown>[]) {
  if (rows.length === 0) return;
  // Write to backfill_ prefixed tables to avoid conflicts with dbt-managed tables
  const targetTable = table.startsWith("backfill_") ? table : `backfill_${table}`;
  try {
    await bqClient.dataset(DBT_DATASET).table(targetTable).insert(rows);
  } catch (e: unknown) {
    const err = e as { errors?: { row?: unknown; errors?: unknown[] }[] };
    if (err.errors?.length) {
      console.error(`\n  Insert error in ${targetTable}:`, JSON.stringify(err.errors[0], null, 2));
    }
    throw e;
  }
}

// ---------------------------------------------------------------------------
// Backfill: traffic_sources
// ---------------------------------------------------------------------------

async function backfillTrafficSources(accessToken: string) {
  console.log("\n=== Backfilling traffic_sources ===");

  const startDate = dateStr(DAYS);
  const endDate = dateStr(1); // yesterday

  const rows = await runGA4Report(
    accessToken,
    [
      "sessions",
      "totalUsers",
      "newUsers",
      "screenPageViews",
      "bounceRate",
      "averageSessionDuration",
      "userEngagementDuration",
    ],
    ["date", "sessionSource", "sessionMedium", "sessionDefaultChannelGrouping"],
    startDate,
    endDate
  );

  console.log(`  Fetched ${rows.length} rows from GA4 API`);

  const bqRows = rows.map((r) => ({
    session_date: `${r.date!.slice(0, 4)}-${r.date!.slice(4, 6)}-${r.date!.slice(6, 8)}`,
    property_id: PROPERTY_ID,
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
    await insertRows("traffic_sources", bqRows);
    console.log(`  Inserted ${bqRows.length} rows into traffic_sources`);
  }
}

// ---------------------------------------------------------------------------
// Backfill: sessions (aggregated by day + dimensions)
// ---------------------------------------------------------------------------

async function backfillSessions(accessToken: string) {
  console.log("\n=== Backfilling sessions ===");

  // We can't get individual session-level data from the GA4 API,
  // so we query day-by-day with key dimensions to build session-like rows.
  // Each row represents a session "group" (date + source + device + country).

  const startDate = dateStr(DAYS);
  const endDate = dateStr(1);

  const rows = await runGA4Report(
    accessToken,
    [
      "sessions",
      "totalUsers",
      "newUsers",
      "screenPageViews",
      "bounceRate",
      "averageSessionDuration",
      "engagedSessions",
    ],
    [
      "date",
      "sessionSource",
      "sessionMedium",
      "sessionDefaultChannelGrouping",
      "deviceCategory",
      "country",
      "landingPage",
    ],
    startDate,
    endDate,
    10000
  );

  console.log(`  Fetched ${rows.length} dimension combos from GA4 API`);

  // Expand each row into individual session rows for the sessions table
  const bqRows: Record<string, unknown>[] = [];
  let sessionCounter = 0;

  for (const r of rows) {
    const sessionCount = parseInt(r.sessions || "0", 10);
    const dateFormatted = `${r.date!.slice(0, 4)}-${r.date!.slice(4, 6)}-${r.date!.slice(6, 8)}`;
    const bounceRate = parseFloat(r.bounceRate || "0");
    const avgDuration = parseFloat(r.averageSessionDuration || "0");
    const newUsers = parseInt(r.newUsers || "0", 10);
    const pageviewsPerSession = Math.round(
      parseInt(r.screenPageViews || "0", 10) / Math.max(sessionCount, 1)
    );
    const engagedSessions = parseInt(r.engagedSessions || "0", 10);

    for (let i = 0; i < sessionCount; i++) {
      sessionCounter++;
      const isBounce = Math.random() < bounceRate;
      const isNewUser = i < newUsers;
      const isEngaged = i < engagedSessions;

      const durSec = Math.max(1, Math.round(avgDuration + (Math.random() - 0.5) * avgDuration * 0.4));

      bqRows.push({
        session_key: `${PROPERTY_ID}-backfill-${sessionCounter}`,
        property_id: PROPERTY_ID,
        user_pseudo_id: `backfill_user_${sessionCounter}`,
        ga_session_id: sessionCounter,
        session_date: dateFormatted,
        session_start: `${dateFormatted}T12:00:00Z`,
        session_end: `${dateFormatted}T12:00:${String(Math.min(durSec, 59)).padStart(2, "0")}Z`,
        session_duration_seconds: durSec,
        pageviews: isBounce ? 1 : pageviewsPerSession,
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
        ga_session_number: isNewUser ? 1 : 2,
        is_first_visit: isNewUser,
      });
    }
  }

  // Insert in batches of 500 (BigQuery streaming insert limit)
  const BATCH_SIZE = 500;
  let inserted = 0;
  for (let i = 0; i < bqRows.length; i += BATCH_SIZE) {
    const batch = bqRows.slice(i, i + BATCH_SIZE);
    await insertRows("sessions", batch);
    inserted += batch.length;
    process.stdout.write(`  Inserted ${inserted}/${bqRows.length} sessions\r`);
  }
  console.log(`\n  Total: ${bqRows.length} session rows inserted`);
}

// ---------------------------------------------------------------------------
// Backfill: users (aggregated)
// ---------------------------------------------------------------------------

async function backfillUsers(accessToken: string) {
  console.log("\n=== Backfilling users ===");

  // After sessions are backfilled, rebuild users from the sessions table
  // Drop and recreate to avoid partitioning spec conflict with dbt-managed table
  await bqClient.query({ query: `DROP TABLE IF EXISTS \`${DBT_DATASET}.users\`` });

  const sql = `
    CREATE TABLE \`${DBT_DATASET}.users\`
    CLUSTER BY property_id
    AS SELECT
      property_id,
      user_pseudo_id,
      MIN(session_start) AS first_seen,
      MAX(session_start) AS last_seen,
      COUNT(*) AS total_sessions,
      SUM(pageviews) AS total_pageviews,
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
  `;

  // Suppress unused parameter warning
  void accessToken;

  await bqClient.query({ query: sql, maximumBytesBilled: "5000000000" });
  const [countRows] = await bqClient.query(
    `SELECT COUNT(*) as cnt FROM \`${DBT_DATASET}.users\``
  );
  console.log(`  Rebuilt users table: ${countRows[0].cnt} users`);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function clearExistingBackfill() {
  console.log(`\n=== Clearing existing backfill data for property ${PROPERTY_ID} ===`);
  for (const table of ["backfill_sessions", "backfill_traffic_sources"]) {
    try {
      await bqClient.query({
        query: `DELETE FROM \`${DBT_DATASET}.${table}\` WHERE property_id = @propertyId`,
        params: { propertyId: PROPERTY_ID },
      });
      console.log(`  Cleared ${table}`);
    } catch (e: unknown) {
      const err = e as Error;
      // Table may not exist yet — that's fine
      if (!err.message?.includes("Not found")) throw e;
      console.log(`  ${table} not found (will be created)`);
    }
  }
}

async function main() {
  console.log(`=== Historical Backfill ===`);
  console.log(`Property: ${PROPERTY_ID}`);
  console.log(`Days: ${DAYS}`);
  console.log(`Date range: ${dateStr(DAYS)} to ${dateStr(1)}`);

  const accessToken = await getAccessToken();

  await clearExistingBackfill();
  await backfillTrafficSources(accessToken);
  await backfillSessions(accessToken);
  await backfillUsers(accessToken);

  console.log("\n=== Backfill complete ===");
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error("Error:", e.message);
  process.exit(1);
});
