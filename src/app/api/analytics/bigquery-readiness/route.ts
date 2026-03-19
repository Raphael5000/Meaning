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
    const pendingSources = await prisma.dataSource.findMany({
      where: { status: "PENDING", type: "GA4_BIGQUERY" },
      include: { user: { select: { id: true, email: true } } },
    });

    if (pendingSources.length === 0) {
      return NextResponse.json({ checked: 0, activated: 0 });
    }

    const client = getBigQueryClient();
    let activated = 0;
    let errors = 0;

    for (const ds of pendingSources) {
      const dataset = ds.bigqueryDataset || `analytics_${ds.propertyId}`;

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
            },
          });
          activated++;
          console.log(
            `[bigquery-readiness] Activated DataSource ${ds.id} for property ${ds.propertyId} (user: ${ds.user.email})`
          );
        }
      } catch (err: unknown) {
        // Dataset doesn't exist yet or access error — skip, will retry next run
        const message = err instanceof Error ? err.message : String(err);
        if (!message.includes("Not found")) {
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
