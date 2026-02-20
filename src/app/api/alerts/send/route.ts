import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendAlertEmail } from "@/lib/resend";
import { generateAlertContent } from "@/lib/alert-content";
import { ALERT_TYPES } from "@/lib/alert-prompts";

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
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            accounts: {
              where: { provider: "google" },
              select: { access_token: true },
            },
          },
        },
      },
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
      const alertTypeDef = ALERT_TYPES[alert.alertType];
      const alertTypeLabel = alertTypeDef?.label || "Performance Summary";
      const subject = `${alertTypeLabel} – ${propertyLabel}`;

      try {
        let contentHtml: string;

        // If we have a property and a Google access token, generate AI content
        const accessToken = alert.user.accounts[0]?.access_token;
        if (alert.propertyId && accessToken) {
          try {
            contentHtml = await generateAlertContent(
              accessToken,
              alert.propertyId,
              alert.alertType,
              frequency
            );
          } catch (genErr) {
            console.error(
              `[api/alerts/send] Content generation failed for alert ${alert.id}:`,
              genErr
            );
            // Fall back to a message indicating generation failed
            contentHtml = `
              <p style="color: #333; font-size: 15px; line-height: 1.6;">
                We were unable to generate your ${frequency} analytics report for <strong>${propertyLabel}</strong> this time.
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

        const html = buildEmailWrapper(propertyLabel, frequency, alertTypeLabel, contentHtml, alert.user.name || alert.user.email);

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

/** Wrap generated content in a consistent email layout. */
function buildEmailWrapper(
  propertyLabel: string,
  frequency: string,
  alertTypeLabel: string,
  contentHtml: string,
  senderName: string,
  isTest = false
): string {
  const testBanner = isTest
    ? `<div style="background: #fff3cd; border: 1px solid #ffc107; border-radius: 6px; padding: 12px 16px; margin-bottom: 20px;">
        <p style="color: #856404; font-size: 13px; margin: 0; font-weight: 600;">This is a test email. No action is needed.</p>
      </div>`
    : "";

  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      ${testBanner}
      <h2 style="color: #1a1a1a; margin-bottom: 4px;">${alertTypeLabel}</h2>
      <p style="color: #666; font-size: 14px; margin-top: 0;">${propertyLabel} &middot; ${frequency} report</p>
      <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
      ${contentHtml}
      <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
      <p style="color: #999; font-size: 12px;">
        Sent by <a href="https://usemeaning.io" style="color: #999;">Meaning</a>
        &middot; You received this because ${senderName} set up an alert.
      </p>
    </div>
  `.trim();
}

export { buildEmailWrapper };
