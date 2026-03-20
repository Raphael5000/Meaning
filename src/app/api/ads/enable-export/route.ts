import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getDtsAuthUrl, getAdsDataset, ensureDataset, createAdsTransfer } from "@/lib/ads-transfer";

export const dynamic = "force-dynamic";

/**
 * POST /api/ads/enable-export
 *
 * Two-step flow:
 * Step 1: { customerId } → returns { authUrl } for DTS OAuth consent
 * Step 2: { customerId, versionInfo } → creates the DTS transfer
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  const userId = (session as { userId?: string })?.userId;

  if (!userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = (await req.json()) as { customerId: string; versionInfo?: string };
  const { customerId, versionInfo } = body;

  if (!customerId) {
    return NextResponse.json({ error: "customerId is required" }, { status: 400 });
  }

  // Step 1: Return the DTS auth URL
  if (!versionInfo) {
    const datasetId = getAdsDataset(customerId);
    await ensureDataset(datasetId);
    const authUrl = getDtsAuthUrl();
    return NextResponse.json({ authUrl, datasetId, step: 1 });
  }

  // Step 2: Create the transfer with versionInfo
  try {
    // Check if already exists
    const existing = await prisma.dataSource.findFirst({
      where: { userId, type: "GOOGLE_ADS", propertyId: customerId, status: "ACTIVE" },
    });
    if (existing) {
      return NextResponse.json(
        { error: "already_exists", message: "Google Ads is already connected.", dataSource: existing },
        { status: 409 }
      );
    }

    const { transferConfigName, datasetId } = await createAdsTransfer(customerId, versionInfo);

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
        dtsTransferId: transferConfigName,
        bigqueryDataset: datasetId,
        status: "BACKFILLING",
      },
      create: {
        userId,
        teamId: teamMembership?.teamId ?? undefined,
        type: "GOOGLE_ADS",
        propertyId: customerId,
        bigqueryDataset: datasetId,
        adsCustomerId: customerId,
        dtsTransferId: transferConfigName,
        status: "BACKFILLING",
      },
    });

    console.log(`[enable-ads-export] Created DTS transfer for customer ${customerId}: ${transferConfigName}`);
    return NextResponse.json({ dataSource, step: 2 });
  } catch (err) {
    console.error("[enable-ads-export] Error:", err);
    return NextResponse.json(
      { error: "Failed to create transfer", message: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
