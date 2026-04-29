import { prisma } from "@/lib/prisma";
import { hasActiveSubscription } from "@/lib/subscription";

/**
 * Free tier caps. Pro tier is unlimited.
 */
export const FREE_TIER_SOURCE_LIMIT = 2;
export const FREE_TIER_MESSAGE_LIMIT = 20;

export type Tier = "free" | "paid";

/** Statuses that count as "this org has this source connected" for limit purposes. */
const CONNECTED_STATUSES = ["ACTIVE", "BACKFILLING", "ERROR"] as const;

/**
 * Resolve the user whose subscription governs an org. Today that's the org owner.
 * (Future: support team billing across orgs.)
 */
export async function getOrgSubscriptionOwnerId(
  orgId: string
): Promise<string | null> {
  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    select: { ownerId: true },
  });
  return org?.ownerId ?? null;
}

/**
 * Tier of an org: "paid" if the org owner has an active/trialing subscription
 * that hasn't expired, otherwise "free".
 */
export async function getOrgTier(orgId: string): Promise<Tier> {
  const ownerId = await getOrgSubscriptionOwnerId(orgId);
  if (!ownerId) return "free";
  return (await hasActiveSubscription(ownerId)) ? "paid" : "free";
}

/** Count of currently-connected (ACTIVE | BACKFILLING | ERROR) data sources for an org. */
export async function getOrgSourceCount(orgId: string): Promise<number> {
  return prisma.dataSource.count({
    where: {
      orgId,
      status: { in: [...CONNECTED_STATUSES] },
    },
  });
}

/** "YYYY-MM" in UTC for the current month. */
export function currentYearMonth(): string {
  const now = new Date();
  const yyyy = now.getUTCFullYear();
  const mm = String(now.getUTCMonth() + 1).padStart(2, "0");
  return `${yyyy}-${mm}`;
}

/** First-of-next-month in UTC — when the current monthly counter resets. */
export function nextMonthResetAt(): Date {
  const now = new Date();
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1, 0, 0, 0, 0)
  );
}

/**
 * Read current chat usage for an org. Always returns a value — if no row
 * exists for the current month, used = 0.
 */
export async function getOrgMessageUsage(orgId: string): Promise<{
  used: number;
  limit: number;
  resetsAt: Date;
  yearMonth: string;
}> {
  const yearMonth = currentYearMonth();
  const row = await prisma.orgChatUsage.findUnique({
    where: { orgId_yearMonth: { orgId, yearMonth } },
    select: { messageCount: true },
  });
  return {
    used: row?.messageCount ?? 0,
    limit: FREE_TIER_MESSAGE_LIMIT,
    resetsAt: nextMonthResetAt(),
    yearMonth,
  };
}

/**
 * Increment chat message count by 1 for the org/current-month. Upserts the row.
 * Uses a raw atomic update to avoid lost-update races on concurrent chats.
 */
export async function incrementOrgMessageCount(orgId: string): Promise<void> {
  const yearMonth = currentYearMonth();
  await prisma.orgChatUsage.upsert({
    where: { orgId_yearMonth: { orgId, yearMonth } },
    create: { orgId, yearMonth, messageCount: 1 },
    update: { messageCount: { increment: 1 } },
  });
}

/**
 * Returns ok=false with a structured reason if a free-tier org is at the
 * source limit. Pro tiers always pass.
 *
 * Pass `existingType` and `existingPropertyId` for upserts — if the
 * (orgId, type, propertyId) combo already exists as an active source, this
 * is a reconnect (not a new slot) and should be allowed.
 */
export async function assertCanAddSource(
  orgId: string,
  existing?: { type: string; propertyId: string }
): Promise<
  | { ok: true; tier: Tier; current: number; limit: number | null }
  | { ok: false; reason: string; current: number; limit: number }
> {
  const tier = await getOrgTier(orgId);
  if (tier === "paid") {
    const current = await getOrgSourceCount(orgId);
    return { ok: true, tier, current, limit: null };
  }

  // For free orgs, count active sources. Re-enabling an existing one doesn't
  // count as a "new" source.
  const current = await getOrgSourceCount(orgId);

  if (existing) {
    const existingRow = await prisma.dataSource.findFirst({
      where: {
        orgId,
        type: existing.type,
        propertyId: existing.propertyId,
        status: { in: [...CONNECTED_STATUSES] },
      },
      select: { id: true },
    });
    if (existingRow) {
      // Reconnect — allow regardless of count.
      return { ok: true, tier, current, limit: FREE_TIER_SOURCE_LIMIT };
    }
  }

  if (current >= FREE_TIER_SOURCE_LIMIT) {
    return {
      ok: false,
      reason: "Free tier is limited to 2 connected data sources. Upgrade to Pro for unlimited.",
      current,
      limit: FREE_TIER_SOURCE_LIMIT,
    };
  }

  return { ok: true, tier, current, limit: FREE_TIER_SOURCE_LIMIT };
}
