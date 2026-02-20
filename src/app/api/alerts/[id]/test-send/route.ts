import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { sendAlertEmail } from "@/lib/resend";
import { generateAlertContent } from "@/lib/alert-content";
import { ALERT_TYPES } from "@/lib/alert-prompts";
import { getGoogleAccessToken } from "@/lib/google-token";
import { buildEmailWrapper } from "@/lib/email-wrapper";

export const dynamic = "force-dynamic";

/** POST /api/alerts/[id]/test-send – send a test email for the given alert */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  const userId = (session as { userId?: string })?.userId;
  if (!userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const alert = await prisma.emailAlert.findFirst({
      where: { id, userId },
      include: { user: { select: { name: true, email: true } } },
    });

    if (!alert) {
      return NextResponse.json({ error: "Alert not found" }, { status: 404 });
    }

    const recipients = alert.recipients
      .split(",")
      .map((e) => e.trim())
      .filter(Boolean);

    if (recipients.length === 0) {
      return NextResponse.json(
        { error: "No valid recipients on this alert" },
        { status: 400 }
      );
    }

    const propertyLabel =
      alert.propertyName || alert.propertyId || "your website";
    const alertTypeDef = ALERT_TYPES[alert.alertType];
    const alertTypeLabel = alertTypeDef?.label || "Performance Summary";
    const subject = `[TEST] ${alertTypeLabel} – ${propertyLabel}`;

    let contentHtml: string;

    // Try to generate real content for the test email
    const accessToken = await getGoogleAccessToken(
      session as { accessToken?: string; userId?: string } | null
    );

    if (alert.propertyId && accessToken) {
      try {
        contentHtml = await generateAlertContent(
          accessToken,
          alert.propertyId,
          alert.alertType,
          alert.frequency
        );
      } catch (genErr) {
        console.error(
          `[api/alerts/${id}/test-send] Content generation failed:`,
          genErr
        );
        contentHtml = `
          <p style="color: #333; font-size: 15px; line-height: 1.6;">
            We were unable to generate the analytics report for <strong>${propertyLabel}</strong>.
            This can happen if your Google Analytics connection needs to be refreshed.
          </p>
        `;
      }
    } else {
      contentHtml = `
        <p style="color: #333; font-size: 15px; line-height: 1.6;">
          No Google Analytics property is linked to this alert, or your Google connection has expired.
          Please reconnect your Google account to receive analytics data.
        </p>
      `;
    }

    const html = buildEmailWrapper(
      propertyLabel,
      alert.frequency,
      alertTypeLabel,
      contentHtml,
      alert.user.name || alert.user.email,
      true // isTest
    );

    await sendAlertEmail(recipients, subject, html);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error(`[api/alerts/${id}/test-send] error:`, err);
    return NextResponse.json(
      { error: "Failed to send test email" },
      { status: 500 }
    );
  }
}
