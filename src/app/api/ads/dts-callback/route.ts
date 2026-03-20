import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { createAdsTransfer } from "@/lib/ads-transfer";

export const dynamic = "force-dynamic";

/**
 * GET /api/ads/dts-callback?version_info=...
 *
 * Called after the user completes the DTS OAuth consent.
 * Uses the versionInfo to programmatically create the DTS transfer config.
 * The customerId is read from sessionStorage via a cookie set before redirect.
 */
export async function GET(req: NextRequest) {
  const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3001";
  const session = await auth();
  const userId = (session as { userId?: string })?.userId;

  if (!userId) {
    return NextResponse.redirect(new URL("/login", baseUrl));
  }

  const versionInfo = req.nextUrl.searchParams.get("version_info");
  if (!versionInfo) {
    console.error("[dts-callback] No version_info in callback");
    return NextResponse.redirect(new URL("/?error=dts_no_version_info", baseUrl));
  }

  // Get the pending customer ID from cookie
  const cookieStore = await (await import("next/headers")).cookies();
  const customerId = cookieStore.get("ads_pending_customer")?.value;
  cookieStore.delete("ads_pending_customer");

  if (!customerId) {
    console.error("[dts-callback] No pending customer ID");
    return NextResponse.redirect(new URL("/?error=dts_no_customer", baseUrl));
  }

  try {
    const { transferConfigName, datasetId } = await createAdsTransfer(
      customerId,
      versionInfo,
    );

    // Get the user's team
    const teamMembership = await prisma.teamMembership.findFirst({
      where: { userId },
      select: { teamId: true },
    });

    // Create or update the DataSource record
    await prisma.dataSource.upsert({
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

    console.log(`[dts-callback] Created DTS transfer for customer ${customerId}: ${transferConfigName}`);
    return NextResponse.redirect(new URL("/?ads_connected=true", baseUrl));
  } catch (err) {
    console.error("[dts-callback] Error creating transfer:", err);
    return NextResponse.redirect(
      new URL(`/?error=dts_failed&detail=${encodeURIComponent(err instanceof Error ? err.message : "Unknown error")}`, baseUrl)
    );
  }
}
