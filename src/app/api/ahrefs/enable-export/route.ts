import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getAhrefsApiKey } from "@/lib/ahrefs-token";

export const dynamic = "force-dynamic";

/**
 * POST /api/ahrefs/enable-export
 *
 * Creates a DataSource for an Ahrefs domain after the user has connected
 * their Ahrefs account via OAuth.
 *
 * Body: { domain: string, country?: string, orgId?: string }
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  const userId = (session as { userId?: string })?.userId;

  if (!userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  // Verify user has a valid Ahrefs token
  const token = await getAhrefsApiKey(userId);
  if (!token) {
    return NextResponse.json(
      { error: "No Ahrefs account connected. Please connect via OAuth first." },
      { status: 400 }
    );
  }

  let body: { domain?: string; country?: string; orgId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { domain, country, orgId } = body;

  if (!domain || typeof domain !== "string" || domain.trim().length === 0) {
    return NextResponse.json({ error: "Domain is required" }, { status: 400 });
  }

  // Clean the domain
  const cleanDomain = domain
    .trim()
    .replace(/^https?:\/\//, "")
    .replace(/\/+$/, "")
    .toLowerCase();

  try {
    // Resolve the orgId
    let resolvedOrgId = orgId;
    if (!resolvedOrgId) {
      const membership = await prisma.orgMembership.findFirst({
        where: { userId },
        select: { orgId: true },
      });
      resolvedOrgId = membership?.orgId ?? undefined;
    }

    // Check if this domain already has a DataSource
    const existingDs = await prisma.dataSource.findFirst({
      where: { userId, type: "AHREFS", propertyId: cleanDomain },
    });

    if (existingDs) {
      await prisma.dataSource.update({
        where: { id: existingDs.id },
        data: {
          status: "PENDING",
          lastSyncError: null,
          bigqueryDataset: country ? JSON.stringify({ country }) : null,
          ...(resolvedOrgId && { orgId: resolvedOrgId }),
        },
      });
    } else {
      await prisma.dataSource.create({
        data: {
          userId,
          type: "AHREFS",
          propertyId: cleanDomain,
          status: "PENDING",
          bigqueryDataset: country ? JSON.stringify({ country }) : null,
          ...(resolvedOrgId && { orgId: resolvedOrgId }),
        },
      });
    }

    return NextResponse.json({ success: true, domain: cleanDomain });
  } catch (err) {
    console.error("[ahrefs/enable-export] Error:", err);
    return NextResponse.json(
      { error: "Failed to enable Ahrefs export" },
      { status: 500 }
    );
  }
}
