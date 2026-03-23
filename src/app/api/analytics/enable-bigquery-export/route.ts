import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { createBigQueryLink, listBigQueryLinks } from "@/lib/ga4";
import { getValidGoogleTokenForUser } from "@/lib/google-token";
import { prisma } from "@/lib/prisma";
import { backfillProperty } from "@/lib/backfill";

export const dynamic = "force-dynamic";

const GCP_PROJECT_ID = "scenic-healer-486415-u3";

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

  try {
    // Check if a link already exists
    const existing = await listBigQueryLinks(accessToken, propertyId);
    if (existing.length > 0) {
      return NextResponse.json({
        success: true,
        alreadyExists: true,
        link: existing[0],
      });
    }

    // Create the BigQuery link
    const link = await createBigQueryLink(accessToken, propertyId, GCP_PROJECT_ID);

    // Create DataSource record — set to ACTIVE immediately since we'll
    // backfill historical data from the GA4 API right now.
    const bigqueryDataset = `analytics_${propertyId}`;
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
        status: "BACKFILLING",
      },
      create: {
        userId,
        orgId: resolvedOrgId || undefined,
        type: "GA4_BIGQUERY",
        propertyId,
        bigqueryDataset,
        status: "BACKFILLING",
      },
    });

    // Backfill 90 days of historical data from GA4 API in the background.
    // This gives the user data immediately instead of waiting 24hrs for
    // the first GA4 daily export.
    backfillProperty(accessToken, propertyId, 90).catch((err) => {
      console.error(`[enable-bigquery-export] Backfill failed for ${propertyId}:`, err);
    });

    return NextResponse.json({
      success: true,
      alreadyExists: false,
      link: {
        project: link.project,
        dailyExportEnabled: link.dailyExportEnabled,
        streamingExportEnabled: link.streamingExportEnabled,
      },
      dataSource: {
        id: dataSource.id,
        status: dataSource.status,
        bigqueryDataset: dataSource.bigqueryDataset,
      },
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to enable BigQuery export";

    // Handle common permission errors
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
