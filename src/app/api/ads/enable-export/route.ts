import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getAdsDataset, ensureDataset, checkAdsDataStatus } from "@/lib/ads-transfer";

export const dynamic = "force-dynamic";

/**
 * POST /api/ads/enable-export
 *
 * Creates a GOOGLE_ADS DataSource and checks if DTS data already exists.
 * Body: { customerId: string }
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  const userId = (session as { userId?: string })?.userId;

  if (!userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = (await req.json()) as { customerId: string };
  const { customerId } = body;

  if (!customerId) {
    return NextResponse.json({ error: "customerId is required" }, { status: 400 });
  }

  try {
    const datasetId = getAdsDataset(customerId);
    await ensureDataset(datasetId);

    // Check if DTS data already exists
    const dataStatus = await checkAdsDataStatus(customerId);

    const teamMembership = await prisma.teamMembership.findFirst({
      where: { userId },
      select: { teamId: true },
    });

    const dataSource = await prisma.dataSource.upsert({
      where: {
        userId_propertyId_type: {
          userId,
          propertyId: customerId,
          type: "GOOGLE_ADS",
        },
      },
      update: {
        bigqueryDataset: datasetId,
        adsCustomerId: customerId,
        status: dataStatus.hasData ? "ACTIVE" : "PENDING",
      },
      create: {
        userId,
        teamId: teamMembership?.teamId ?? undefined,
        type: "GOOGLE_ADS",
        propertyId: customerId,
        bigqueryDataset: datasetId,
        adsCustomerId: customerId,
        status: dataStatus.hasData ? "ACTIVE" : "PENDING",
      },
    });

    return NextResponse.json({ dataSource, dataStatus });
  } catch (err) {
    console.error("[enable-ads-export] Error:", err);
    return NextResponse.json(
      { error: "Failed to enable", message: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
