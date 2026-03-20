import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { checkAdsDataStatus } from "@/lib/ads-transfer";

export const dynamic = "force-dynamic";

/**
 * GET /api/ads/transfer-status?customerId=1234567890
 *
 * Checks if Google Ads data has arrived in BigQuery for a customer.
 * Updates DataSource status from PENDING → ACTIVE when tables appear.
 */
export async function GET(req: NextRequest) {
  const session = await auth();
  const userId = (session as { userId?: string })?.userId;

  if (!userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const customerId = req.nextUrl.searchParams.get("customerId");
  if (!customerId) {
    return NextResponse.json(
      { error: "customerId query parameter is required" },
      { status: 400 }
    );
  }

  const dataSource = await prisma.dataSource.findFirst({
    where: { userId, type: "GOOGLE_ADS", adsCustomerId: customerId },
  });

  if (!dataSource) {
    return NextResponse.json(
      { error: "not_found", message: "No Google Ads DataSource found for this customer." },
      { status: 404 }
    );
  }

  try {
    const dataStatus = await checkAdsDataStatus(customerId);

    // Auto-update status when data arrives
    if (dataStatus.hasData && dataSource.status !== "ACTIVE") {
      await prisma.dataSource.update({
        where: { id: dataSource.id },
        data: { status: "ACTIVE" },
      });
      dataSource.status = "ACTIVE";
    }

    return NextResponse.json({
      dataSource,
      dataStatus,
    });
  } catch (err) {
    console.error("[transfer-status] Error:", err);
    return NextResponse.json(
      { error: "Failed to check transfer status", message: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
