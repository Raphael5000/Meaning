import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import {
  getMailchimpDataset,
  ensureDataset,
  ensureMailchimpTables,
  syncMailchimpData,
} from "@/lib/mailchimp-transfer";

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

  const body = (await req.json()) as { listId: string; ga4PropertyId?: string };
  const { listId, ga4PropertyId } = body;

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
        status: "BACKFILLING",
      },
      create: {
        userId,
        teamId: teamMembership?.teamId ?? undefined,
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
        await prisma.dataSource.update({
          where: { id: dataSource.id },
          data: { status: "ERROR" },
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
