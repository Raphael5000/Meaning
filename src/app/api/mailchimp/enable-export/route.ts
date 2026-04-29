import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import {
  getMailchimpDataset,
  ensureDataset,
  ensureMailchimpTables,
  syncMailchimpData,
} from "@/lib/mailchimp-transfer";
import { assertCanAddSource } from "@/lib/tier";

export const dynamic = "force-dynamic";

/**
 * POST /api/mailchimp/enable-export
 *
 * Creates BigQuery dataset + tables and triggers initial sync
 * for a Mailchimp audience/list.
 * Body: { listId: string, ga4PropertyId?: string }
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  const userId = (session as { userId?: string })?.userId;

  if (!userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = (await req.json()) as { listId: string; ga4PropertyId?: string; orgId?: string };
  const { listId, ga4PropertyId, orgId } = body;

  if (!listId) {
    return NextResponse.json({ error: "listId is required" }, { status: 400 });
  }

  try {
    const datasetId = getMailchimpDataset(listId);
    await ensureDataset(datasetId);
    await ensureMailchimpTables(datasetId);

    const teamMembership = await prisma.teamMembership.findFirst({
      where: { userId },
      select: { teamId: true },
    });

    // Resolve orgId: use provided orgId, or fall back to user's active org
    let resolvedOrgId = orgId;
    if (!resolvedOrgId) {
      const user = await prisma.user.findUnique({ where: { id: userId }, select: { activeOrgId: true } });
      resolvedOrgId = user?.activeOrgId ?? undefined;
    }

    // Free-tier source-count gate (skipped if no org — pre-launch users)
    if (resolvedOrgId) {
      const check = await assertCanAddSource(resolvedOrgId, {
        type: "MAILCHIMP",
        propertyId: listId,
      });
      if (!check.ok) {
        return NextResponse.json(
          {
            error: check.reason,
            code: "FREE_TIER_SOURCE_LIMIT",
            current: check.current,
            limit: check.limit,
          },
          { status: 402 }
        );
      }
    }

    const dataSource = await prisma.dataSource.upsert({
      where: {
        userId_propertyId_type: {
          userId,
          propertyId: listId,
          type: "MAILCHIMP",
        },
      },
      update: {
        bigqueryDataset: datasetId,
        ga4PropertyId: ga4PropertyId || undefined,
        orgId: resolvedOrgId || undefined,
        status: "BACKFILLING",
      },
      create: {
        userId,
        teamId: teamMembership?.teamId ?? undefined,
        orgId: resolvedOrgId || undefined,
        type: "MAILCHIMP",
        propertyId: listId,
        bigqueryDataset: datasetId,
        ga4PropertyId: ga4PropertyId || undefined,
        status: "BACKFILLING",
      },
    });

    // Fire-and-forget: initial sync
    syncMailchimpData(userId, listId)
      .then(async (result) => {
        console.log(`[enable-mailchimp-export] Sync complete for list ${listId}:`, result);
        await prisma.dataSource.update({
          where: { id: dataSource.id },
          data: { status: "ACTIVE" },
        });
      })
      .catch(async (err) => {
        console.error(`[enable-mailchimp-export] Sync failed for list ${listId}:`, err);
        const msg = err instanceof Error ? err.message : String(err);
        await prisma.dataSource.update({
          where: { id: dataSource.id },
          data: { status: "ERROR", lastSyncError: msg.slice(0, 500) },
        }).catch(() => {});
      });

    return NextResponse.json({ dataSource, syncing: true });
  } catch (err) {
    console.error("[enable-mailchimp-export] Error:", err);
    return NextResponse.json(
      { error: "Failed to enable", message: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
