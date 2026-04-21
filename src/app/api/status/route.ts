import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const CONNECTOR_LABELS: Record<string, string> = {
  GOOGLE_ADS: "Google Ads",
  SEARCH_CONSOLE: "Search Console",
  LINKEDIN: "LinkedIn",
  MAILCHIMP: "Mailchimp",
  MICROSOFT_ADS: "Microsoft Ads",
};

const CONNECTOR_ORDER = ["GOOGLE_ADS", "SEARCH_CONSOLE", "LINKEDIN", "MAILCHIMP", "MICROSOFT_ADS"];

/**
 * GET /api/status
 *
 * Public endpoint — no auth required.
 * Returns 90-day sync history per connector type, aggregated across all accounts.
 */
export async function GET() {
  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
  ninetyDaysAgo.setUTCHours(0, 0, 0, 0);

  // Get all sync logs for the last 90 days
  const logs = await prisma.syncLog.findMany({
    where: { date: { gte: ninetyDaysAgo } },
    select: { connectorType: true, date: true, success: true },
    orderBy: { date: "asc" },
  });

  // Get active account counts per connector
  const activeCounts = await prisma.dataSource.groupBy({
    by: ["type"],
    where: { status: { in: ["ACTIVE", "BACKFILLING"] }, type: { not: "GA4_BIGQUERY" } },
    _count: true,
  });
  const accountCounts: Record<string, number> = {};
  for (const row of activeCounts) {
    accountCounts[row.type] = row._count;
  }

  // Build 90-day history per connector
  const connectors = CONNECTOR_ORDER.filter((type) => (accountCounts[type] ?? 0) > 0).map((type) => {
    const totalAccounts = accountCounts[type] ?? 0;
    const typeLogs = logs.filter((l) => l.connectorType === type);

    // Build day-by-day map
    const days: Array<{ date: string; successRate: number; total: number; succeeded: number }> = [];

    for (let i = 89; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split("T")[0];

      const dayLogs = typeLogs.filter((l) => {
        const logDate = new Date(l.date).toISOString().split("T")[0];
        return logDate === dateStr;
      });

      if (dayLogs.length === 0) {
        // No data for this day — treat as no sync attempted (grey/neutral)
        days.push({ date: dateStr, successRate: -1, total: 0, succeeded: 0 });
      } else {
        const succeeded = dayLogs.filter((l) => l.success).length;
        const total = dayLogs.length;
        days.push({ date: dateStr, successRate: total > 0 ? succeeded / total : -1, total, succeeded });
      }
    }

    // Overall uptime: % of days with logs where all syncs succeeded
    const daysWithLogs = days.filter((d) => d.total > 0);
    const perfectDays = daysWithLogs.filter((d) => d.successRate === 1).length;
    const uptime = daysWithLogs.length > 0 ? (perfectDays / daysWithLogs.length) * 100 : 100;

    // Current status
    const today = days[days.length - 1];
    const currentStatus = today.total === 0
      ? "No data"
      : today.successRate === 1
        ? "Operational"
        : today.successRate >= 0.5
          ? "Degraded"
          : "Outage";

    return {
      type,
      label: CONNECTOR_LABELS[type] || type,
      accounts: totalAccounts,
      currentStatus,
      uptime: Math.round(uptime * 100) / 100,
      days,
    };
  });

  // Overall status
  const allOperational = connectors.every((c) => c.currentStatus === "Operational" || c.currentStatus === "No data");
  const anyOutage = connectors.some((c) => c.currentStatus === "Outage");
  const overallStatus = allOperational ? "All Systems Operational" : anyOutage ? "Partial Outage" : "Degraded Performance";

  return NextResponse.json({ overallStatus, connectors });
}
