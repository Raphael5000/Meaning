import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { syncRedditData, validateRedditSubreddit } from "@/lib/reddit-transfer";

export const dynamic = "force-dynamic";

// Matt-only gate
const ALLOWED_USER_ID = process.env.REDDIT_ALLOWED_USER_ID;

/**
 * POST /api/reddit/enable-export
 *
 * Creates DataSource entries for Reddit subreddits and triggers backfill.
 * Uses Reddit's public JSON endpoints — no API credentials needed.
 * Body: { subreddits: string, orgId?: string }
 *   subreddits is a comma-separated list of subreddit names (without r/)
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  const userId = (session as { userId?: string })?.userId;

  if (!userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  if (ALLOWED_USER_ID && userId !== ALLOWED_USER_ID) {
    return NextResponse.json({ error: "Reddit connector is not available for your account" }, { status: 403 });
  }

  let body: { subreddits?: string; orgId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { subreddits, orgId } = body;

  if (!subreddits || typeof subreddits !== "string" || subreddits.trim().length === 0) {
    return NextResponse.json({ error: "Subreddit names are required" }, { status: 400 });
  }

  const subredditList = subreddits
    .split(",")
    .map((s) => s.trim().replace(/^r\//, "").toLowerCase())
    .filter((s) => s.length > 0);

  if (subredditList.length === 0) {
    return NextResponse.json({ error: "No valid subreddit names provided" }, { status: 400 });
  }

  try {
    let resolvedOrgId = orgId;
    if (!resolvedOrgId) {
      const membership = await prisma.orgMembership.findFirst({
        where: { userId },
        select: { orgId: true },
      });
      resolvedOrgId = membership?.orgId ?? undefined;
    }

    const results: Array<{ subreddit: string; success: boolean; error?: string }> = [];

    for (const subreddit of subredditList) {
      try {
        // Validate subreddit exists
        await validateRedditSubreddit(subreddit);

        // Upsert DataSource
        const existingDs = await prisma.dataSource.findFirst({
          where: { userId, type: "REDDIT", propertyId: subreddit },
        });

        let dataSource;
        if (existingDs) {
          dataSource = await prisma.dataSource.update({
            where: { id: existingDs.id },
            data: {
              status: "BACKFILLING",
              lastSyncError: null,
              ...(resolvedOrgId && { orgId: resolvedOrgId }),
            },
          });
        } else {
          dataSource = await prisma.dataSource.create({
            data: {
              userId,
              type: "REDDIT",
              propertyId: subreddit,
              status: "BACKFILLING",
              ...(resolvedOrgId && { orgId: resolvedOrgId }),
            },
          });
        }

        // Fire-and-forget sync
        const dsOrgId = resolvedOrgId ?? userId;
        syncRedditData(subreddit, dsOrgId)
          .then(async (result) => {
            console.log(`[reddit/enable-export] Sync complete for r/${subreddit}:`, result);
            await prisma.dataSource.update({
              where: { id: dataSource.id },
              data: { status: "ACTIVE", lastSyncedAt: new Date() },
            });
          })
          .catch(async (err) => {
            console.error(`[reddit/enable-export] Sync failed for r/${subreddit}:`, err);
            const msg = err instanceof Error ? err.message : String(err);
            await prisma.dataSource.update({
              where: { id: dataSource.id },
              data: { status: "ERROR", lastSyncError: msg.slice(0, 500) },
            }).catch(() => {});
          });

        results.push({ subreddit, success: true });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        results.push({ subreddit, success: false, error: msg });
      }
    }

    return NextResponse.json({ success: true, results, syncing: true });
  } catch (err) {
    console.error("[reddit/enable-export] Error:", err);
    return NextResponse.json(
      { error: "Failed to enable Reddit export" },
      { status: 500 }
    );
  }
}
