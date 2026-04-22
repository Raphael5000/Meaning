import { NextRequest, NextResponse } from "next/server";
import { BigQuery } from "@google-cloud/bigquery";
import { prisma } from "@/lib/prisma";
import { deduplicateTable } from "@/lib/bq-helpers";
import { getAdsDataset, ADS_KEY_COLUMNS } from "@/lib/ads-transfer";
import { getMsAdsDataset, MSADS_KEY_COLUMNS } from "@/lib/microsoft-ads-transfer";
import { getLinkedInDataset, LINKEDIN_KEY_COLUMNS } from "@/lib/linkedin-transfer";
import { getGscDataset, GSC_KEY_COLUMNS } from "@/lib/gsc-transfer";
import { getMailchimpDataset, MAILCHIMP_KEY_COLUMNS } from "@/lib/mailchimp-transfer";

export const dynamic = "force-dynamic";

// Table configs: key columns + partition column
const TABLE_CONFIGS: Record<string, Record<string, { keys: string[]; partition?: string }>> = {
  GOOGLE_ADS: {
    campaign_performance: { keys: ADS_KEY_COLUMNS.campaign_performance, partition: "stats_date" },
    keyword_performance: { keys: ADS_KEY_COLUMNS.keyword_performance, partition: "stats_date" },
    click_attribution: { keys: ADS_KEY_COLUMNS.click_attribution, partition: "click_date" },
    account_info: { keys: ADS_KEY_COLUMNS.account_info },
  },
  MICROSOFT_ADS: {
    campaign_performance: { keys: MSADS_KEY_COLUMNS.campaign_performance, partition: "stats_date" },
    keyword_performance: { keys: MSADS_KEY_COLUMNS.keyword_performance, partition: "stats_date" },
    search_query_performance: { keys: MSADS_KEY_COLUMNS.search_query_performance, partition: "stats_date" },
    account_info: { keys: MSADS_KEY_COLUMNS.account_info },
  },
  LINKEDIN: {
    post_performance: { keys: LINKEDIN_KEY_COLUMNS.post_performance, partition: "published_date" },
    follower_stats: { keys: LINKEDIN_KEY_COLUMNS.follower_stats, partition: "stats_date" },
    follower_demographics: { keys: LINKEDIN_KEY_COLUMNS.follower_demographics, partition: "stats_date" },
    page_stats: { keys: LINKEDIN_KEY_COLUMNS.page_stats, partition: "stats_date" },
    org_info: { keys: LINKEDIN_KEY_COLUMNS.org_info },
  },
  SEARCH_CONSOLE: {
    search_performance: { keys: GSC_KEY_COLUMNS.search_performance, partition: "query_date" },
    url_inspection: { keys: GSC_KEY_COLUMNS.url_inspection, partition: "inspected_date" },
    site_info: { keys: GSC_KEY_COLUMNS.site_info },
  },
  MAILCHIMP: {
    campaign_reports: { keys: MAILCHIMP_KEY_COLUMNS.campaign_reports, partition: "send_date" },
    audience_stats: { keys: MAILCHIMP_KEY_COLUMNS.audience_stats, partition: "stats_date" },
    audience_growth: { keys: MAILCHIMP_KEY_COLUMNS.audience_growth, partition: "month_date" },
    mc_account_info: { keys: MAILCHIMP_KEY_COLUMNS.mc_account_info },
  },
};

function getDatasetId(type: string, propertyId: string): string {
  switch (type) {
    case "GOOGLE_ADS": return getAdsDataset(propertyId);
    case "MICROSOFT_ADS": return getMsAdsDataset(propertyId);
    case "LINKEDIN": return getLinkedInDataset(propertyId);
    case "SEARCH_CONSOLE": return getGscDataset(propertyId);
    case "MAILCHIMP": return getMailchimpDataset(propertyId);
    default: return "";
  }
}

/**
 * POST /api/dedup
 *
 * Admin endpoint: deduplicates all BigQuery tables for all active data sources.
 * Protected by CRON_SECRET.
 *
 * Optional query params:
 *   ?type=GOOGLE_ADS  — only dedup one connector type
 *
 * Example:
 *   curl -X POST https://usemeaning.io/api/dedup -H "Authorization: Bearer $CRON_SECRET"
 *   curl -X POST "https://usemeaning.io/api/dedup?type=GOOGLE_ADS" -H "Authorization: Bearer $CRON_SECRET"
 */
export async function POST(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = req.headers.get("authorization");

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const typeFilter = req.nextUrl.searchParams.get("type");
  const typeCondition = typeFilter ? { type: typeFilter } : { type: { not: "GA4_BIGQUERY" } };

  const dataSources = await prisma.dataSource.findMany({
    where: { ...typeCondition, status: { in: ["ACTIVE", "BACKFILLING", "ERROR"] } },
    select: { id: true, type: true, propertyId: true, adsCustomerId: true },
  });

  if (dataSources.length === 0) {
    return NextResponse.json({ message: "No matching data sources", duplicatesRemoved: 0 });
  }

  const raw = process.env.GOOGLE_BIGQUERY_CREDENTIALS;
  if (!raw) {
    return NextResponse.json({ error: "GOOGLE_BIGQUERY_CREDENTIALS not set" }, { status: 500 });
  }
  const credentials = JSON.parse(raw);
  const bq = new BigQuery({ projectId: credentials.project_id, credentials });
  const projectId = credentials.project_id;

  console.log(`[dedup] Starting dedup for ${dataSources.length} data sources (type=${typeFilter || "all"})`);

  let totalDupes = 0;
  const results: Array<{ type: string; dataset: string; table: string; removed: number }> = [];

  // Always dedup exchange_rates (shared table, not per-connector)
  try {
    const [erExists] = await bq.dataset("dbt_meaning").table("exchange_rates").exists().catch(() => [false]);
    if (erExists) {
      const fqER = `\`${projectId}.dbt_meaning.exchange_rates\``;
      const removed = await deduplicateTable(bq, fqER, ["rate_date", "target"], "rate_date", "dedup");
      if (removed > 0) {
        totalDupes += removed;
        results.push({ type: "SHARED", dataset: "dbt_meaning", table: "exchange_rates", removed });
      }
    }
  } catch (err) {
    console.error(`[dedup] Error deduping exchange_rates:`, (err as Error).message);
  }

  for (const ds of dataSources) {
    const tables = TABLE_CONFIGS[ds.type];
    if (!tables) continue;

    const propId = ds.adsCustomerId || ds.propertyId;
    const datasetId = getDatasetId(ds.type, propId);
    if (!datasetId) continue;

    // Check dataset exists
    const [exists] = await bq.dataset(datasetId).exists().catch(() => [false]);
    if (!exists) continue;

    for (const [tableName, config] of Object.entries(tables)) {
      try {
        const [tableExists] = await bq.dataset(datasetId).table(tableName).exists().catch(() => [false]);
        if (!tableExists) continue;

        const fqTable = `\`${projectId}.${datasetId}.${tableName}\``;
        const removed = await deduplicateTable(bq, fqTable, config.keys, config.partition, "dedup");
        if (removed > 0) {
          totalDupes += removed;
          results.push({ type: ds.type, dataset: datasetId, table: tableName, removed });
        }
      } catch (err) {
        console.error(`[dedup] Error deduping ${datasetId}.${tableName}:`, (err as Error).message);
      }
    }
  }

  console.log(`[dedup] Done: ${totalDupes} total duplicates removed across ${results.length} tables`);
  return NextResponse.json({ duplicatesRemoved: totalDupes, tables: results, total: dataSources.length });
}
