import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { sendAlertEmail } from "@/lib/resend";
import { buildEmailWrapper } from "@/lib/email-wrapper";
import { generateAlertContent } from "@/lib/alert-content";
import { getGoogleAccessToken } from "@/lib/google-token";
import { describeSchedule, frequencyLabel } from "@/lib/schedule";

export const dynamic = "force-dynamic";

const ALERT_TYPE_LABELS: Record<string, string> = {
  weekly_snapshot: "Weekly Snapshot",
  traffic_report: "Traffic Report",
  top_pages: "Top Pages",
  custom: "Custom Report",
};

/** POST /api/alerts/[id]/test-send – send a test email for the given alert.
 *
 *  Default: sends instantly with sample content.
 *  ?live=true: fires off real AI generation in the background and emails when done.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  const userId = (session as { userId?: string })?.userId;
  if (!userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { id } = await params;
  const useLive = request.nextUrl.searchParams.get("live") === "true";

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
    const alertTypeLabel =
      ALERT_TYPE_LABELS[alert.alertType] || "Performance Summary";
    const scheduleDesc = describeSchedule(alert.sendDays, alert.sendHour, alert.sendMinute, alert.intervalWeeks);
    const freqLabel = frequencyLabel(alert.sendDays, alert.intervalWeeks);

    if (useLive) {
      // Get access token while we still have the session context
      const accessToken = await getGoogleAccessToken(
        session as { accessToken?: string; userId?: string } | null
      );

      if (!alert.propertyId || !accessToken) {
        return NextResponse.json(
          { error: "No GA4 property linked or Google connection expired" },
          { status: 400 }
        );
      }

      // Fire off generation in the background — return immediately
      const capturedToken = accessToken;
      const capturedPropertyId = alert.propertyId;
      const capturedAlertType = alert.alertType;
      const capturedCustomPrompt = alert.customPrompt;
      const capturedFreqLabel = freqLabel;
      const capturedSenderName = alert.user.name || alert.user.email;

      void (async () => {
        console.log(`[test-send] Starting live generation for alert ${id}, property=${capturedPropertyId}, type=${capturedAlertType}`);
        try {
          console.log(`[test-send] Calling generateAlertContent...`);
          const contentHtml = await generateAlertContent(
            capturedToken,
            capturedPropertyId,
            capturedAlertType,
            capturedFreqLabel,
            capturedCustomPrompt
          );
          console.log(`[test-send] Content generated (${contentHtml.length} chars), sending email to ${recipients.join(", ")}...`);

          const subject = `[TEST] ${alertTypeLabel} – ${propertyLabel}`;
          const html = buildEmailWrapper(
            propertyLabel,
            scheduleDesc,
            alertTypeLabel,
            contentHtml,
            capturedSenderName,
            true
          );

          await sendAlertEmail(recipients, subject, html);
          console.log(`[test-send] Live test email sent for alert ${id}`);
        } catch (err) {
          console.error(`[test-send] Live generation failed for alert ${id}:`, err);
        }
      })();

      return NextResponse.json({
        success: true,
        message: "Generating report — the email will arrive in about a minute.",
      });
    }

    // Default: instant send with sample content
    const subject = `[TEST] ${alertTypeLabel} – ${propertyLabel}`;
    const contentHtml = buildSampleContent(alertTypeLabel, propertyLabel, scheduleDesc);

    const html = buildEmailWrapper(
      propertyLabel,
      scheduleDesc,
      alertTypeLabel,
      contentHtml,
      alert.user.name || alert.user.email,
      true
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

/** Build sample HTML content that previews the email format. */
function buildSampleContent(
  alertTypeLabel: string,
  propertyLabel: string,
  scheduleDescription: string
): string {
  return `
    <p style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 15px; line-height: 1.6; color: #333;">
      This is a preview of your <strong>${alertTypeLabel}</strong> for
      <strong>${propertyLabel}</strong> (${scheduleDescription}).
      When your scheduled alert runs, this section will contain real data from Google Analytics.
    </p>
    <h3 style="color: #1a1a1a; font-size: 16px; font-weight: 600; margin: 24px 0 8px 0;">Traffic Overview</h3>
    <table style="width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 14px;">
      <thead>
        <tr style="background: #f8f9fa;">
          <th style="text-align: left; padding: 10px 12px; border: 1px solid #e5e7eb; font-weight: 600; color: #1a1a1a;">Metric</th>
          <th style="text-align: right; padding: 10px 12px; border: 1px solid #e5e7eb; font-weight: 600; color: #1a1a1a;">This period</th>
          <th style="text-align: right; padding: 10px 12px; border: 1px solid #e5e7eb; font-weight: 600; color: #1a1a1a;">Change</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td style="padding: 10px 12px; border: 1px solid #e5e7eb;">Users</td>
          <td style="text-align: right; padding: 10px 12px; border: 1px solid #e5e7eb;">1,234</td>
          <td style="text-align: right; padding: 10px 12px; border: 1px solid #e5e7eb; color: #16a34a;">+12.3%</td>
        </tr>
        <tr>
          <td style="padding: 10px 12px; border: 1px solid #e5e7eb;">Sessions</td>
          <td style="text-align: right; padding: 10px 12px; border: 1px solid #e5e7eb;">2,567</td>
          <td style="text-align: right; padding: 10px 12px; border: 1px solid #e5e7eb; color: #16a34a;">+8.1%</td>
        </tr>
        <tr>
          <td style="padding: 10px 12px; border: 1px solid #e5e7eb;">Page Views</td>
          <td style="text-align: right; padding: 10px 12px; border: 1px solid #e5e7eb;">5,891</td>
          <td style="text-align: right; padding: 10px 12px; border: 1px solid #e5e7eb; color: #dc2626;">-2.4%</td>
        </tr>
      </tbody>
    </table>
    <h3 style="color: #1a1a1a; font-size: 16px; font-weight: 600; margin: 24px 0 8px 0;">Observations</h3>
    <ul style="padding-left: 20px; margin: 8px 0;">
      <li style="font-size: 15px; line-height: 1.6; color: #333; margin-bottom: 6px;">User traffic increased by 12.3% compared to the previous period.</li>
      <li style="font-size: 15px; line-height: 1.6; color: #333; margin-bottom: 6px;">Page views saw a slight decline of 2.4%, suggesting shorter browsing sessions.</li>
    </ul>
    <h3 style="color: #1a1a1a; font-size: 16px; font-weight: 600; margin: 24px 0 8px 0;">Recommendations</h3>
    <ul style="padding-left: 20px; margin: 8px 0;">
      <li style="font-size: 15px; line-height: 1.6; color: #333; margin-bottom: 6px;">Investigate the drop in page views — consider adding internal links to increase pages per session.</li>
      <li style="font-size: 15px; line-height: 1.6; color: #333; margin-bottom: 6px;">Capitalise on the growing user base by testing new calls-to-action on high-traffic pages.</li>
    </ul>
    <p style="color: #666; font-size: 13px; font-style: italic;">
      Sample data shown above. Your actual report will contain real analytics from Google Analytics.
    </p>
  `;
}
