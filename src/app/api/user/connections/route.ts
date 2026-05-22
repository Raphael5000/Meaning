import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const session = await auth();
  const userId = (session as { userId?: string })?.userId;

  if (!userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    const [googleAccount, linkedinAccount, mailchimpAccount, microsoftAdsAccount, ahrefsAccount, attioAccount] = await Promise.all([
      prisma.account.findFirst({
        where: { userId, provider: "google" },
        select: { id: true, providerAccountId: true, refresh_token: true, scope: true },
      }),
      prisma.account.findFirst({
        where: { userId, provider: "linkedin" },
        select: { id: true, providerAccountId: true, scope: true },
      }),
      prisma.account.findFirst({
        where: { userId, provider: "mailchimp" },
        select: { id: true, providerAccountId: true },
      }),
      prisma.account.findFirst({
        where: { userId, provider: "microsoft-ads" },
        select: { id: true, providerAccountId: true },
      }),
      prisma.account.findFirst({
        where: { userId, provider: "ahrefs" },
        select: { id: true, providerAccountId: true },
      }),
      prisma.account.findFirst({
        where: { userId, provider: "attio" },
        select: { id: true, providerAccountId: true },
      }),
    ]);

    // Try to get the Google email from the user record
    let googleEmail: string | null = null;
    if (googleAccount) {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { email: true },
      });
      googleEmail = user?.email ?? null;
    }

    // Check if adwords scope is granted
    const hasAdsScope = googleAccount?.scope?.includes("adwords") ?? false;
    // Check if webmasters scope is granted (Search Console)
    const hasGscScope = googleAccount?.scope?.includes("webmasters") ?? false;
    console.log("[connections] scope:", googleAccount?.scope, "hasAdsScope:", hasAdsScope, "hasGscScope:", hasGscScope, "hasMicrosoftAdsAccount:", !!microsoftAdsAccount);

    // Get all DataSources — prefer orgId filter, fall back to userId
    const orgId = req.nextUrl.searchParams.get("orgId");
    const dataSources = await prisma.dataSource.findMany({
      where: orgId ? { orgId } : { userId },
      select: {
        id: true,
        type: true,
        propertyId: true,
        bigqueryDataset: true,
        adsCustomerId: true,
        ga4PropertyId: true,
        status: true,
        lastSyncedAt: true,
        lastSyncError: true,
      },
    });

    // Optional: if propertyId is passed, filter property-specific sources
    const propertyId = req.nextUrl.searchParams.get("propertyId");

    const propertyDataSources = propertyId
      ? dataSources.filter(
          (ds) =>
            ds.propertyId === propertyId ||
            ds.ga4PropertyId === propertyId
        )
      : dataSources;

    return NextResponse.json({
      hasGoogleAccount: !!googleAccount,
      googleEmail,
      hasAdsScope,
      hasGscScope,
      hasLinkedInAccount: !!linkedinAccount,
      hasMailchimpAccount: !!mailchimpAccount,
      hasMicrosoftAdsAccount: !!microsoftAdsAccount,
      hasAhrefsAccount: !!ahrefsAccount,
      hasAttioAccount: !!attioAccount,
      hasRedditAccount: userId === process.env.REDDIT_ALLOWED_USER_ID && !!process.env.REDDIT_CLIENT_ID,
      dataSources: propertyDataSources,
    });
  } catch (err) {
    console.error("[connections] Error:", err);
    return NextResponse.json(
      { error: "Internal server error", detail: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
