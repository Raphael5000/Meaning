import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendAlertEmail } from "@/lib/resend";

export const dynamic = "force-dynamic";

/**
 * POST /api/alerts/send
 *
 * Cron endpoint that sends pending email alerts.
 * Protected by a shared secret (CRON_SECRET) passed in the Authorization header.
 *
 * Query parameter `frequency` filters which alerts to send: daily | weekly | monthly.
 * Schedule three cron jobs that each call this endpoint with the relevant frequency.
 */
export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const frequency = request.nextUrl.searchParams.get("frequency");
  if (!frequency || !["daily", "weekly", "monthly"].includes(frequency)) {
    return NextResponse.json(
      { error: "frequency query param required (daily | weekly | monthly)" },
      { status: 400 }
    );
  }

  try {
    const alerts = await prisma.emailAlert.findMany({
      where: { enabled: true, frequency },
      include: { user: { select: { name: true, email: true } } },
    });

    let sent = 0;
    let failed = 0;

    for (const alert of alerts) {
      const recipients = alert.recipients
        .split(",")
        .map((e) => e.trim())
        .filter(Boolean);

      if (recipients.length === 0) continue;

      const propertyLabel = alert.propertyName || alert.propertyId || "your website";
      const subject = `${frequency.charAt(0).toUpperCase() + frequency.slice(1)} Performance Summary – ${propertyLabel}`;

      // Placeholder email content – will be replaced with real analytics data
      const html = `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #1a1a1a; margin-bottom: 4px;">Website Performance Summary</h2>
          <p style="color: #666; font-size: 14px; margin-top: 0;">${propertyLabel} &middot; ${frequency} report</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
          <p style="color: #333; font-size: 15px; line-height: 1.6;">
            This is a placeholder for your ${frequency} website performance summary.
            Detailed analytics data will be included here in a future update.
          </p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
          <p style="color: #999; font-size: 12px;">
            Sent by <a href="https://usemeaning.io" style="color: #999;">Meaning</a>
            &middot; You received this because ${alert.user.name || alert.user.email} set up an alert.
          </p>
        </div>
      `.trim();

      try {
        await sendAlertEmail(recipients, subject, html);
        await prisma.emailAlert.update({
          where: { id: alert.id },
          data: { lastSentAt: new Date() },
        });
        sent++;
      } catch (err) {
        console.error(`[api/alerts/send] Failed to send alert ${alert.id}:`, err);
        failed++;
      }
    }

    return NextResponse.json({ frequency, total: alerts.length, sent, failed });
  } catch (err) {
    console.error("[api/alerts/send] error:", err);
    return NextResponse.json(
      { error: "Failed to process alerts" },
      { status: 500 }
    );
  }
}
