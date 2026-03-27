import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { checkMsAdsDataStatus } from "@/lib/microsoft-ads-transfer";

export const dynamic = "force-dynamic";

/**
 * GET /api/microsoft-ads/transfer-status?accountId=...
 *
 * Checks if Microsoft Ads data has arrived in BigQuery.
 * Auto-updates DataSource status from PENDING → ACTIVE when data appears.
 */
export async function GET(req: NextRequest) {
  const session = await auth();
  const userId = (session as { userId?: string })?.userId;

  if (!userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const accountId = req.nextUrl.searchParams.get("accountId");
  if (!accountId) {
    return NextResponse.json({ error: "accountId is required" }, { status: 400 });
  }

  try {
    const status = await checkMsAdsDataStatus(accountId);

    // Auto-update DataSource status if data has arrived
    if (status.hasData) {
      await prisma.dataSource.updateMany({
        where: {
          userId,
          propertyId: accountId,
          type: "MICROSOFT_ADS",
          status: "PENDING",
        },
        data: { status: "ACTIVE" },
      });
    }

    return NextResponse.json(status);
  } catch (err) {
    console.error("[msads-transfer-status] Error:", err);
    return NextResponse.json(
      { error: "Failed to check status", detail: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
