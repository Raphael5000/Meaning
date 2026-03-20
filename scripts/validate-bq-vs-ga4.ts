/**
 * Parallel validation: compares BigQuery dbt mart outputs against GA4 API
 * for the same date range. Run daily to catch discrepancies.
 *
 * Usage: npx tsx scripts/validate-bq-vs-ga4.ts [days=7]
 */

import "dotenv/config";
import { BigQuery } from "@google-cloud/bigquery";
import { google } from "googleapis";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

const PROPERTY_ID = "404628120";
const DAYS = parseInt(process.argv[2] || "7", 10);
const TOLERANCE = 0.05; // 5% tolerance for acceptable discrepancy

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

async function queryBQ(sql: string): Promise<Record<string, unknown>[]> {
  const [rows] = await bqClient.query({ query: sql, maximumBytesBilled: "1000000000" });
  return rows;
}

async function queryGA4(
  accessToken: string,
  metrics: string[],
  dimensions?: string[],
  startDate?: string,
  endDate?: string
) {
  const auth = new google.auth.OAuth2();
  auth.setCredentials({ access_token: accessToken });

  const res = await analyticsData.properties.runReport({
    property: `properties/${PROPERTY_ID}`,
    auth,
    requestBody: {
      dateRanges: [{ startDate: startDate || `${DAYS}daysAgo`, endDate: endDate || "yesterday" }],
      metrics: metrics.map((m) => ({ name: m })),
      dimensions: dimensions?.map((d) => ({ name: d })),
      limit: "100",
    },
  });

  const dimHeaders = res.data.dimensionHeaders?.map((h) => h.name) || [];
  const metHeaders = res.data.metricHeaders?.map((h) => h.name) || [];

  return (res.data.rows || []).map((row) => {
    const obj: Record<string, string> = {};
    row.dimensionValues?.forEach((v, i) => { obj[dimHeaders[i] || `dim_${i}`] = v.value || ""; });
    row.metricValues?.forEach((v, i) => { obj[metHeaders[i] || `met_${i}`] = v.value || ""; });
    return obj;
  });
}

function compare(label: string, bqVal: number, ga4Val: number): { pass: boolean; delta: string } {
  if (ga4Val === 0 && bqVal === 0) return { pass: true, delta: "0%" };
  const pct = ga4Val !== 0 ? ((bqVal - ga4Val) / ga4Val) : (bqVal !== 0 ? Infinity : 0);
  const pass = Math.abs(pct) <= TOLERANCE || Math.abs(bqVal - ga4Val) <= 1;
  return { pass, delta: `${(pct * 100).toFixed(1)}%` };
}

// ---------------------------------------------------------------------------
// Validation checks
// ---------------------------------------------------------------------------

interface CheckResult {
  name: string;
  bq: number;
  ga4: number;
  delta: string;
  pass: boolean;
}

async function runChecks(accessToken: string): Promise<CheckResult[]> {
  const results: CheckResult[] = [];
  const endDate = new Date();
  endDate.setDate(endDate.getDate() - 1);
  const startDate = new Date(endDate);
  startDate.setDate(startDate.getDate() - DAYS + 1);

  const startStr = startDate.toISOString().split("T")[0];
  const endStr = endDate.toISOString().split("T")[0];

  console.log(`\nValidating ${startStr} to ${endStr} (${DAYS} days)\n`);

  // 1. Total sessions
  const [bqSessions] = await queryBQ(
    `SELECT COUNT(*) as val FROM \`dbt_meaning.sessions\` WHERE session_date BETWEEN '${startStr}' AND '${endStr}'`
  );
  const ga4Sessions = await queryGA4(accessToken, ["sessions"], undefined, startStr, endStr);
  const bqS = Number(bqSessions.val);
  const ga4S = Number(ga4Sessions[0]?.sessions || 0);
  const cSessions = compare("Sessions", bqS, ga4S);
  results.push({ name: "Total Sessions", bq: bqS, ga4: ga4S, ...cSessions });

  // 2. Total users
  const [bqUsers] = await queryBQ(
    `SELECT COUNT(DISTINCT user_pseudo_id) as val FROM \`dbt_meaning.sessions\` WHERE session_date BETWEEN '${startStr}' AND '${endStr}'`
  );
  const ga4Users = await queryGA4(accessToken, ["totalUsers"], undefined, startStr, endStr);
  const bqU = Number(bqUsers.val);
  const ga4U = Number(ga4Users[0]?.totalUsers || 0);
  const cUsers = compare("Users", bqU, ga4U);
  results.push({ name: "Total Users", bq: bqU, ga4: ga4U, ...cUsers });

  // 3. New users
  const [bqNewUsers] = await queryBQ(
    `SELECT COUNTIF(is_first_visit) as val FROM \`dbt_meaning.sessions\` WHERE session_date BETWEEN '${startStr}' AND '${endStr}'`
  );
  const ga4NewUsers = await queryGA4(accessToken, ["newUsers"], undefined, startStr, endStr);
  const bqN = Number(bqNewUsers.val);
  const ga4N = Number(ga4NewUsers[0]?.newUsers || 0);
  const cNew = compare("New Users", bqN, ga4N);
  results.push({ name: "New Users", bq: bqN, ga4: ga4N, ...cNew });

  // 4. Pageviews
  const [bqPV] = await queryBQ(
    `SELECT COUNT(*) as val FROM \`dbt_meaning.pageviews\` WHERE event_date BETWEEN '${startStr}' AND '${endStr}'`
  );
  const ga4PV = await queryGA4(accessToken, ["screenPageViews"], undefined, startStr, endStr);
  const bqP = Number(bqPV.val);
  const ga4P = Number(ga4PV[0]?.screenPageViews || 0);
  const cPV = compare("Pageviews", bqP, ga4P);
  results.push({ name: "Pageviews", bq: bqP, ga4: ga4P, ...cPV });

  // 5. Bounce rate
  const [bqBounce] = await queryBQ(
    `SELECT AVG(CASE WHEN is_bounce THEN 1.0 ELSE 0.0 END) as val FROM \`dbt_meaning.sessions\` WHERE session_date BETWEEN '${startStr}' AND '${endStr}'`
  );
  const ga4Bounce = await queryGA4(accessToken, ["bounceRate"], undefined, startStr, endStr);
  const bqB = Number(Number(bqBounce.val).toFixed(4));
  const ga4B = Number(Number(ga4Bounce[0]?.bounceRate || 0).toFixed(4));
  const cBounce = compare("Bounce Rate", bqB, ga4B);
  results.push({ name: "Bounce Rate", bq: bqB, ga4: ga4B, ...cBounce });

  // 6. Traffic sources (top 5 by sessions)
  const bqSources = await queryBQ(
    `SELECT source, medium, SUM(sessions) as sessions FROM \`dbt_meaning.traffic_sources\` WHERE session_date BETWEEN '${startStr}' AND '${endStr}' GROUP BY source, medium ORDER BY sessions DESC LIMIT 5`
  );
  const ga4Sources = await queryGA4(
    accessToken, ["sessions"], ["sessionSource", "sessionMedium"], startStr, endStr
  );

  for (const bqRow of bqSources) {
    const src = String(bqRow.source);
    const med = String(bqRow.medium);
    const ga4Match = ga4Sources.find(
      (r) => r.sessionSource === src && r.sessionMedium === med
    );
    const bqV = Number(bqRow.sessions);
    const ga4V = Number(ga4Match?.sessions || 0);
    const c = compare(`Source ${src}/${med}`, bqV, ga4V);
    results.push({ name: `Source: ${src} / ${med}`, bq: bqV, ga4: ga4V, ...c });
  }

  return results;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log("=== BQ vs GA4 Parallel Validation ===");

  const accessToken = await getAccessToken();
  const results = await runChecks(accessToken);

  // Print results table
  console.log("\n%-30s %10s %10s %8s %6s", "Check", "BQ", "GA4", "Delta", "Pass");
  console.log("-".repeat(70));
  for (const r of results) {
    const icon = r.pass ? "OK" : "FAIL";
    console.log(
      `%-30s %10s %10s %8s %6s`,
      r.name.substring(0, 30),
      String(r.bq),
      String(r.ga4),
      r.delta,
      icon
    );
  }

  const failures = results.filter((r) => !r.pass);
  console.log(`\n${results.length} checks: ${results.length - failures.length} passed, ${failures.length} failed`);

  if (failures.length > 0) {
    console.log("\nFailed checks:");
    for (const f of failures) {
      console.log(`  - ${f.name}: BQ=${f.bq} vs GA4=${f.ga4} (${f.delta})`);
    }
    process.exit(1);
  }

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error("Error:", e.message);
  process.exit(1);
});
