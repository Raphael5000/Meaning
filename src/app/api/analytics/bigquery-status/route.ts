import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { listBigQueryLinks } from "@/lib/ga4";
import { getGoogleAccessToken } from "@/lib/google-token";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * GET /api/analytics/bigquery-status?propertyId=123456789
 *
 * Checks whether a GA4 property has an active BigQuery export link.
 * If a link exists and no DataSource record exists yet, creates one.
 */
export async function GET(request: NextRequest) {
  const session = await auth();
  const accessToken = await getGoogleAccessToken(
    session as { accessToken?: string; userId?: string; teamAdminId?: string } | null
  );

  if (!accessToken) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const userId = (session as { userId?: string })?.userId;
  if (!userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const propertyId = request.nextUrl.searchParams.get("propertyId");
  if (!propertyId) {
    return NextResponse.json(
      { error: "propertyId is required" },
      { status: 400 }
    );
  }

  try {
    // Check for existing BigQuery links via GA4 Admin API
    const links = await listBigQueryLinks(accessToken, propertyId);
    const hasExport = links.length > 0;
    const link = links[0] || null;

    // Determine dataset name from the link
    const bigqueryDataset = hasExport ? `analytics_${propertyId}` : null;

    // Check for existing DataSource record
    let dataSource = await prisma.dataSource.findFirst({
      where: { propertyId, userId, type: "GA4_BIGQUERY" },
    });

    if (hasExport && !dataSource) {
      // Auto-create a DataSource record in PENDING status
      // It will be flipped to ACTIVE once data is verified (ticket 4.4)
      dataSource = await prisma.dataSource.create({
        data: {
          userId,
          type: "GA4_BIGQUERY",
          propertyId,
          bigqueryDataset,
          status: "PENDING",
        },
      });
    } else if (hasExport && dataSource && !dataSource.bigqueryDataset) {
      // Update dataset name if it was missing
      dataSource = await prisma.dataSource.update({
        where: { id: dataSource.id },
        data: { bigqueryDataset },
      });
    }

    return NextResponse.json({
      propertyId,
      hasExport,
      link: link
        ? {
            project: link.project,
            dailyExportEnabled: link.dailyExportEnabled,
            streamingExportEnabled: link.streamingExportEnabled,
          }
        : null,
      dataSource: dataSource
        ? {
            id: dataSource.id,
            status: dataSource.status,
            bigqueryDataset: dataSource.bigqueryDataset,
          }
        : null,
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to check BigQuery status";
    console.error("[bigquery-status]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
