import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendAlertEmail } from "@/lib/resend";
import { generateAlertContent } from "@/lib/alert-content";
import { ALERT_TYPES } from "@/lib/alert-prompts";
import { buildEmailWrapper } from "@/lib/email-wrapper";
import { getValidGoogleTokenForUser } from "@/lib/google-token";

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
        user: { select: { id: true, name: true, email: true } },
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

        // Get a valid (refreshed if needed) Google access token for this user
        const accessToken = await getValidGoogleTokenForUser(alert.user.id);
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

