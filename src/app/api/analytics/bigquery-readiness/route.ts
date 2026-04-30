import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { BigQuery } from "@google-cloud/bigquery";

export const dynamic = "force-dynamic";

function getBigQueryClient(): BigQuery {
  const raw = process.env.GOOGLE_BIGQUERY_CREDENTIALS;
  if (!raw) throw new Error("GOOGLE_BIGQUERY_CREDENTIALS not set");
  const credentials = JSON.parse(raw);
  return new BigQuery({ projectId: credentials.project_id, credentials });
}

/**
 * GET /api/analytics/bigquery-readiness
 *
 * Cron endpoint that checks all PENDING DataSource records to see if
 * BigQuery data has arrived (at least one events_* table exists).
 * Flips status to ACTIVE when ready.
 *
 * Protected by CRON_SECRET. Schedule to run every hour or so.
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Check both PENDING and BACKFILLING GA4 sources — BACKFILLING sources
    // that have never synced may also have missing datasets.
    const pendingSources = await prisma.dataSource.findMany({
      where: {
        type: "GA4_BIGQUERY",
        status: { in: ["PENDING", "BACKFILLING"] },
      },
      include: { user: { select: { id: true, email: true } } },
    });

    if (pendingSources.length === 0) {
      return NextResponse.json({ checked: 0, activated: 0, escalated: 0 });
    }

    const client = getBigQueryClient();
    let activated = 0;
    let escalated = 0;
    let errors = 0;

    // Escalate to ERROR if stuck for more than 48 hours
    const ESCALATION_THRESHOLD_MS = 48 * 60 * 60 * 1000;

    for (const ds of pendingSources) {
      const dataset = ds.bigqueryDataset || `analytics_${ds.propertyId}`;
      const ageMs = Date.now() - new Date(ds.createdAt).getTime();

      try {
        // Check if the dataset exists and has at least one events_ table
        const [tables] = await client.dataset(dataset).getTables();
        const hasEventData = tables.some(
          (t) => t.id && t.id.startsWith("events_")
        );

        if (hasEventData) {
          await prisma.dataSource.update({
            where: { id: ds.id },
            data: {
              status: "ACTIVE",
              bigqueryDataset: dataset,
              lastSyncError: null,
            },
          });
          activated++;
          console.log(
            `[bigquery-readiness] Activated DataSource ${ds.id} for property ${ds.propertyId} (user: ${ds.user.email})`
          );
        } else if (ageMs > ESCALATION_THRESHOLD_MS) {
          // Dataset exists but has no events_ tables after 48h
          await prisma.dataSource.update({
            where: { id: ds.id },
            data: {
              status: "ERROR",
              lastSyncError: "BigQuery dataset exists but contains no event data after 48 hours. Check your GA4 BigQuery export settings.",
            },
          });
          escalated++;
          console.warn(
            `[bigquery-readiness] Escalated DataSource ${ds.id} to ERROR — no events_ tables after ${Math.round(ageMs / 3600000)}h (user: ${ds.user.email})`
          );
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);

        if (message.includes("Not found")) {
          // Dataset doesn't exist — escalate to ERROR if older than 48h
          if (ageMs > ESCALATION_THRESHOLD_MS) {
            await prisma.dataSource.update({
              where: { id: ds.id },
              data: {
                status: "ERROR",
                lastSyncError: `BigQuery dataset "${dataset}" not found after ${Math.round(ageMs / 3600000)} hours. Please verify your GA4 BigQuery export is linked to project "${client.projectId}" and re-enable the export.`,
              },
            });
            escalated++;
            console.warn(
              `[bigquery-readiness] Escalated DataSource ${ds.id} to ERROR — dataset not found after ${Math.round(ageMs / 3600000)}h (user: ${ds.user.email})`
            );
          }
          // Otherwise just wait — it can take up to 24h for GA4 to create the dataset
        } else {
          console.error(
            `[bigquery-readiness] Error checking ${dataset}:`,
            message
          );
          errors++;
        }
      }
    }

    return NextResponse.json({
      checked: pendingSources.length,
      activated,
      escalated,
      errors,
    });
  } catch (err) {
    console.error("[bigquery-readiness] error:", err);
    return NextResponse.json(
      { error: "Failed to check readiness" },
      { status: 500 }
    );
  }
}
