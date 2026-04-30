import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { BigQuery } from "@google-cloud/bigquery";
import { createBigQueryLink, listBigQueryLinks } from "@/lib/ga4";
import { getValidGoogleTokenForUser } from "@/lib/google-token";
import { prisma } from "@/lib/prisma";
import { backfillProperty } from "@/lib/backfill";
import { assertCanAddSource } from "@/lib/tier";

export const dynamic = "force-dynamic";

const GCP_PROJECT_ID = "scenic-healer-486415-u3";

/** Check whether the BigQuery dataset exists and is accessible. */
async function checkDatasetExists(dataset: string): Promise<boolean> {
  const raw = process.env.GOOGLE_BIGQUERY_CREDENTIALS;
  if (!raw) return false;
  try {
    const creds = JSON.parse(raw);
    const bq = new BigQuery({ projectId: creds.project_id, credentials: creds });
    const [exists] = await bq.dataset(dataset).exists();
    return exists;
  } catch {
    return false;
  }
}

/**
 * POST /api/analytics/enable-bigquery-export
 *
 * Creates a BigQuery export link on the user's GA4 property via the
 * Admin API. Requires the user to have analytics.edit scope (granted
 * via the elevated OAuth flow) and Admin/Editor role on the GA4 property.
 *
 * Body: { propertyId: string }
 */
export async function POST(request: NextRequest) {
  const session = await auth();
  const userId = (session as { userId?: string })?.userId;
  if (!userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  // Always read fresh from DB — the session JWT may still have the old
  // analytics.readonly token, but the DB has the new analytics.edit token
  // from the elevated OAuth flow.
  const accessToken = await getValidGoogleTokenForUser(userId);
  if (!accessToken) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  let body: { propertyId?: string; orgId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { propertyId } = body;

  // Resolve orgId: use provided or fall back to user's active org
  let resolvedOrgId = body.orgId;
  if (!resolvedOrgId) {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { activeOrgId: true } });
    resolvedOrgId = user?.activeOrgId ?? undefined;
  }
  if (!propertyId) {
    return NextResponse.json(
      { error: "propertyId is required" },
      { status: 400 }
    );
  }

  // Free-tier source-count gate (skipped if no org — pre-launch users)
  if (resolvedOrgId) {
    const check = await assertCanAddSource(resolvedOrgId, {
      type: "GA4_BIGQUERY",
      propertyId,
    });
    if (!check.ok) {
      return NextResponse.json(
        {
          error: check.reason,
          code: "FREE_TIER_SOURCE_LIMIT",
          current: check.current,
          limit: check.limit,
        },
        { status: 402 }
      );
    }
  }

  try {
    // Check if a link already exists
    const existing = await listBigQueryLinks(accessToken, propertyId);
    let alreadyExists = false;
    let linkInfo: { project?: string; dailyExportEnabled?: boolean; streamingExportEnabled?: boolean } = {};

    if (existing.length > 0) {
      alreadyExists = true;
      linkInfo = existing[0];
    } else {
      // Create the BigQuery link
      const link = await createBigQueryLink(accessToken, propertyId, GCP_PROJECT_ID);
      linkInfo = {
        project: link.project,
        dailyExportEnabled: link.dailyExportEnabled,
        streamingExportEnabled: link.streamingExportEnabled,
      };
    }

    // Validate the BigQuery dataset exists and is accessible
    const bigqueryDataset = `analytics_${propertyId}`;
    const datasetExists = await checkDatasetExists(bigqueryDataset);

    // Create DataSource record — status depends on whether the BQ dataset
    // is actually available. If not, set to PENDING so the readiness cron
    // can escalate to ERROR if it stays missing after 48h.
    const initialStatus = datasetExists ? "BACKFILLING" : "PENDING";
    const dataSource = await prisma.dataSource.upsert({
      where: {
        userId_propertyId_type: {
          userId,
          propertyId,
          type: "GA4_BIGQUERY",
        },
      },
      update: {
        bigqueryDataset,
        orgId: resolvedOrgId || undefined,
        status: initialStatus,
        lastSyncError: null,
      },
      create: {
        userId,
        orgId: resolvedOrgId || undefined,
        type: "GA4_BIGQUERY",
        propertyId,
        bigqueryDataset,
        status: initialStatus,
        lastSyncError: null,
      },
    });

    // Backfill 90 days of historical data from GA4 API in the background.
    // This gives the user data immediately instead of waiting 24hrs for
    // the first GA4 daily export.
    backfillProperty(accessToken, propertyId, 90).catch((err) => {
      console.error(`[enable-bigquery-export] Backfill failed for ${propertyId}:`, err);
      // Record the backfill failure on the DataSource
      prisma.dataSource.update({
        where: { id: dataSource.id },
        data: { lastSyncError: `Backfill failed: ${err instanceof Error ? err.message : String(err)}` },
      }).catch(() => {});
    });

    return NextResponse.json({
      success: true,
      alreadyExists,
      link: linkInfo,
      dataSource: {
        id: dataSource.id,
        status: dataSource.status,
        bigqueryDataset: dataSource.bigqueryDataset,
      },
      ...(initialStatus === "PENDING" && {
        warning: "BigQuery dataset not found yet. Data will appear once GA4 creates the export (up to 24h). We'll keep checking automatically.",
      }),
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to enable BigQuery export";

    // Distinguish "insufficient OAuth scope" (we never asked for analytics.edit)
    // from "user lacks property access" (they don't have Admin/Editor on the
    // GA4 property). Both surface as 403 from Google but the user fix is
    // very different.
    const lower = message.toLowerCase();
    if (
      lower.includes("insufficient authentication scopes") ||
      lower.includes("insufficient_scope") ||
      lower.includes("insufficient auth scopes")
    ) {
      return NextResponse.json(
        {
          error: "insufficient_scope",
          code: "INSUFFICIENT_SCOPE",
          message:
            "We need permission to manage your GA4 property. Click \"Fully reconnect Google Analytics\" and accept the new permissions.",
          reconnectUrl: "/api/auth/connect-google-admin",
        },
        { status: 403 }
      );
    }

    if (message.includes("PERMISSION_DENIED") || message.includes("403")) {
      return NextResponse.json(
        {
          error: "permission_denied",
          message:
            "You need Admin or Editor access on this GA4 property to enable BigQuery export.",
        },
        { status: 403 }
      );
    }

    console.error("[enable-bigquery-export]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
