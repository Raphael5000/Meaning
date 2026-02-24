import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendAlertEmail } from "@/lib/resend";
import { generateAlertContent } from "@/lib/alert-content";
import { ALERT_TYPES } from "@/lib/alert-prompts";
import { buildEmailWrapper } from "@/lib/email-wrapper";
import { getValidGoogleTokenForUser } from "@/lib/google-token";
import { isAlertDue, describeSchedule, frequencyLabel } from "@/lib/schedule";

export const dynamic = "force-dynamic";

/**
 * POST /api/alerts/send
 *
 * Cron endpoint that sends pending email alerts.
 * Protected by a shared secret (CRON_SECRET) passed in the Authorization header.
 *
 * Schedule a single cron job (e.g. every hour) that calls this endpoint.
 * The endpoint determines which alerts are due based on each alert's custom schedule.
 */
export async function GET(request: NextRequest) {
  return handleSend(request);
}

export async function POST(request: NextRequest) {
  return handleSend(request);
}

async function handleSend(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();

  try {
    // Fetch all enabled alerts whose sendHour matches the current UTC hour.
    // Fine-grained filtering (day, interval) happens in application code.
    const currentHour = now.getUTCHours();

    const alerts = await prisma.emailAlert.findMany({
      where: { enabled: true, sendHour: currentHour },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
    });

    let sent = 0;
    let failed = 0;
    let skipped = 0;

    for (const alert of alerts) {
      // Check if this alert is actually due (day-of-week + interval check)
      if (!isAlertDue(alert.sendDays, alert.sendHour, alert.intervalWeeks, alert.lastSentAt, now)) {
        skipped++;
        continue;
      }

      const recipients = alert.recipients
        .split(",")
        .map((e) => e.trim())
        .filter(Boolean);

      if (recipients.length === 0) continue;

      const propertyLabel = alert.propertyName || alert.propertyId || "your website";
      const alertTypeDef = ALERT_TYPES[alert.alertType];
      const alertTypeLabel = alertTypeDef?.label ?? "Performance Summary";
      const subject = `${alertTypeLabel} – ${propertyLabel}`;
      const scheduleDesc = describeSchedule(alert.sendDays, alert.sendHour, alert.sendMinute, alert.intervalWeeks);
      const freqLabel = frequencyLabel(alert.sendDays, alert.intervalWeeks);

      try {
        let contentHtml: string;

        // Get a valid (refreshed if needed) Google access token for this user
        const accessToken = await getValidGoogleTokenForUser(alert.user.id);
        if (alert.propertyId && accessToken) {
          try {
            contentHtml = await generateAlertContent(
              accessToken,
              alert.propertyId,
              alert.alertType,
              freqLabel,
              alert.customPrompt
            );
          } catch (genErr) {
            console.error(
              `[api/alerts/send] Content generation failed for alert ${alert.id}:`,
              genErr
            );
            contentHtml = `
              <p style="color: #333; font-size: 15px; line-height: 1.6;">
                We were unable to generate your analytics report for <strong>${propertyLabel}</strong> this time.
                This can happen if your Google Analytics connection needs to be refreshed.
                Please log in to <a href="https://usemeaning.io" style="color: #2563eb;">Meaning</a> to reconnect your account.
              </p>
            `;
          }
        } else {
          contentHtml = `
            <p style="color: #333; font-size: 15px; line-height: 1.6;">
              No Google Analytics property is linked to this alert.
              Please log in to <a href="https://usemeaning.io" style="color: #2563eb;">Meaning</a> to configure a property.
            </p>
          `;
        }

        const html = buildEmailWrapper(propertyLabel, scheduleDesc, alertTypeLabel, contentHtml, alert.user.name || alert.user.email);

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

    return NextResponse.json({ total: alerts.length, sent, failed, skipped });
  } catch (err) {
    console.error("[api/alerts/send] error:", err);
    return NextResponse.json(
      { error: "Failed to process alerts" },
      { status: 500 }
    );
  }
}
