import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const ALLOWED_PROVIDERS = [
  "google",
  "microsoft-ads",
  "linkedin",
  "mailchimp",
  "ahrefs",
  "attio",
] as const;
type AllowedProvider = (typeof ALLOWED_PROVIDERS)[number];

const PROVIDER_DATASOURCE_TYPES: Record<AllowedProvider, string[]> = {
  google: ["GA4_BIGQUERY", "GOOGLE_ADS", "SEARCH_CONSOLE"],
  "microsoft-ads": ["MICROSOFT_ADS"],
  linkedin: ["LINKEDIN"],
  mailchimp: ["MAILCHIMP"],
  ahrefs: ["AHREFS"],
  attio: ["ATTIO"],
};

/**
 * DELETE /api/user/connections/oauth-account
 * Body: { provider: "google" | "microsoft-ads" | "linkedin" | "mailchimp" }
 *
 * Nuke the OAuth Account row for the given provider + current user so the
 * next Connect click runs a fresh consent flow and writes a clean
 * access_token / refresh_token pair.  Also soft-disconnects every
 * DataSource tied to that provider (so the list reflects the reset).
 *
 * Primary use: Microsoft Ads refresh_token ended up missing or revoked and
 * sync loops with "No Microsoft Ads token for user X" — the only way out
 * was DB surgery.  Now the UI can call this endpoint and re-OAuth in-app.
 */
export async function DELETE(req: NextRequest) {
  const session = await auth();
  const userId = (session as { userId?: string })?.userId;
  if (!userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { provider } = (await req.json().catch(() => ({}))) as {
    provider?: string;
  };
  if (!provider || !ALLOWED_PROVIDERS.includes(provider as AllowedProvider)) {
    return NextResponse.json(
      { error: `provider must be one of: ${ALLOWED_PROVIDERS.join(", ")}` },
      { status: 400 }
    );
  }

  const accounts = await prisma.account.findMany({
    where: { userId, provider },
    select: { id: true },
  });

  const types = PROVIDER_DATASOURCE_TYPES[provider as AllowedProvider];

  const [accountResult, dataSourceResult] = await prisma.$transaction([
    prisma.account.deleteMany({
      where: { userId, provider },
    }),
    prisma.dataSource.updateMany({
      where: { userId, type: { in: types } },
      data: {
        status: "DISCONNECTED",
        lastSyncError: null,
        updatedAt: new Date(),
      },
    }),
  ]);

  console.log(
    `[oauth-account] User ${userId} reset provider=${provider}: ${accountResult.count} account(s) deleted, ${dataSourceResult.count} data source(s) disconnected (found ${accounts.length} matching accounts)`
  );

  return NextResponse.json({
    ok: true,
    accountsDeleted: accountResult.count,
    dataSourcesDisconnected: dataSourceResult.count,
  });
}
