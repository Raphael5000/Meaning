import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { prepareAdsTransfer } from "@/lib/ads-transfer";

export const dynamic = "force-dynamic";

/**
 * POST /api/ads/enable-export
 *
 * Creates the BigQuery dataset for a Google Ads customer and returns
 * a BigQuery Console URL where the user completes the DTS setup.
 * DTS requires in-browser OAuth consent, so we can't do it fully programmatically.
 *
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
    return NextResponse.json(
      { error: "customerId is required" },
      { status: 400 }
    );
  }

  // Check if already exists
  const existing = await prisma.dataSource.findFirst({
    where: { userId, type: "GOOGLE_ADS", propertyId: customerId },
  });
  if (existing) {
    return NextResponse.json(
      { error: "already_exists", message: "Google Ads is already connected for this account.", dataSource: existing },
      { status: 409 }
    );
  }

  try {
    const { datasetId, setupUrl } = await prepareAdsTransfer(customerId);

    // Get the user's team (if any)
    const teamMembership = await prisma.teamMembership.findFirst({
      where: { userId },
      select: { teamId: true },
    });

    // Create the DataSource record in PENDING state
    const dataSource = await prisma.dataSource.create({
      data: {
        userId,
        teamId: teamMembership?.teamId ?? undefined,
        type: "GOOGLE_ADS",
        propertyId: customerId,
        bigqueryDataset: datasetId,
        adsCustomerId: customerId,
        status: "PENDING",
      },
    });

    console.log(`[enable-ads-export] Created GOOGLE_ADS DataSource ${dataSource.id} for customer ${customerId}`);

    return NextResponse.json({
      dataSource,
      datasetId,
      setupUrl,
    });
  } catch (err) {
    console.error("[enable-ads-export] Error:", err);
    return NextResponse.json(
      { error: "Failed to set up Google Ads export", message: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
