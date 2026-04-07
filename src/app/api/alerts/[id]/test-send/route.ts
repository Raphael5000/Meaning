import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { sendAlertEmail } from "@/lib/resend";
import { buildEmailWrapper } from "@/lib/email-wrapper";
import { generateAlertContent, AlertDataSources } from "@/lib/alert-content";
import { getGoogleAccessToken } from "@/lib/google-token";
import { describeSchedule, frequencyLabel } from "@/lib/schedule";
import { shouldUseBigQuery, getGoogleAdsCustomerId, getLinkedInOrgId, getMailchimpListId, getGscSiteUrl, getMicrosoftAdsAccountId } from "@/lib/rollout";
import { getOrgDataSources } from "@/lib/org-access";

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
      include: {
        user: { select: { name: true, email: true } },
        org: { select: { name: true } },
      },
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
      alert.org?.name || alert.propertyName || alert.propertyId || "your website";
    const alertTypeLabel =
      ALERT_TYPE_LABELS[alert.alertType] || "Performance Summary";
    const headerTitle = alert.name || alertTypeLabel;
    const scheduleDesc = describeSchedule(alert.sendDays, alert.sendHour, alert.sendMinute, alert.intervalWeeks);
    const freqLabel = frequencyLabel(alert.sendDays, alert.intervalWeeks);

    if (useLive) {
      // Resolve data sources (same logic as send route)
      let propertyId = alert.propertyId;
      let usesBigQuery = false;
      let dataSources: AlertDataSources | null = null;
      let displayCurrency = "USD";

      if (alert.orgId) {
        const org = await prisma.organization.findUnique({
          where: { id: alert.orgId },
          select: { displayCurrency: true },
        });
        displayCurrency = org?.displayCurrency ?? "USD";

        const orgDataSources = await getOrgDataSources(alert.orgId);

        if (!propertyId) {
          const ga4Ds = orgDataSources.find((ds) => ds.type === "GA4_BIGQUERY" && (ds.status === "ACTIVE" || ds.status === "BACKFILLING"));
          propertyId = ga4Ds?.propertyId ?? null;
        }

        const adsDsList = orgDataSources.filter((ds) => ds.type === "GOOGLE_ADS" && (ds.status === "ACTIVE" || ds.status === "BACKFILLING"));
        const linkedInDsList = orgDataSources.filter((ds) => ds.type === "LINKEDIN" && (ds.status === "ACTIVE" || ds.status === "BACKFILLING"));
        const mailchimpDsList = orgDataSources.filter((ds) => ds.type === "MAILCHIMP" && (ds.status === "ACTIVE" || ds.status === "BACKFILLING"));
        const gscDsList = orgDataSources.filter((ds) => ds.type === "SEARCH_CONSOLE" && (ds.status === "ACTIVE" || ds.status === "BACKFILLING"));
        const msAdsDsList = orgDataSources.filter((ds) => ds.type === "MICROSOFT_ADS" && (ds.status === "ACTIVE" || ds.status === "BACKFILLING"));

        if (propertyId) {
          usesBigQuery = true;
          dataSources = {
            propertyId,
            adsCustomerId: adsDsList[0]?.adsCustomerId ?? null,
            linkedInOrgId: linkedInDsList[0]?.propertyId ?? null,
            mailchimpListId: mailchimpDsList[0]?.propertyId ?? null,
            gscSiteUrl: gscDsList[0]?.propertyId ?? null,
            msAdsAccountId: msAdsDsList[0]?.propertyId ?? null,
          };
        }
      } else if (propertyId) {
        const accessToken = await getGoogleAccessToken(
          session as { accessToken?: string; userId?: string } | null
        );
        const rollout = await shouldUseBigQuery(propertyId, userId);
        usesBigQuery = rollout.useBigQuery;

        if (usesBigQuery) {
          const [adsId, liId, mcId, gscUrl, msId] = await Promise.all([
            getGoogleAdsCustomerId(userId, propertyId),
            getLinkedInOrgId(userId, propertyId),
            getMailchimpListId(userId, propertyId),
            getGscSiteUrl(userId, propertyId),
            getMicrosoftAdsAccountId(userId, propertyId),
          ]);
          dataSources = {
            propertyId,
            adsCustomerId: adsId,
            linkedInOrgId: liId,
            mailchimpListId: mcId,
            gscSiteUrl: gscUrl,
            msAdsAccountId: msId,
          };
        } else if (!accessToken) {
          return NextResponse.json(
            { error: "Google connection expired. Please reconnect in Settings." },
            { status: 400 }
          );
        }
      }

      if (!propertyId) {
        return NextResponse.json(
          { error: "No data source found. Please connect a property in Settings." },
          { status: 400 }
        );
      }

      // Get access token for legacy GA4 path
      const accessToken = await getGoogleAccessToken(
        session as { accessToken?: string; userId?: string } | null
      );

      // Fire off generation in the background — return immediately
      const capturedToken = accessToken || "";
      const capturedPropertyId = propertyId;
      const capturedAlertType = alert.alertType;
      const capturedCustomPrompt = alert.customPrompt;
      const capturedFreqLabel = freqLabel;
      const capturedSenderName = alert.user.name || alert.user.email;
      const capturedUsesBigQuery = usesBigQuery;
      const capturedDataSources = dataSources;
      const capturedDisplayCurrency = displayCurrency;

      void (async () => {
        console.log(`[test-send] Starting live generation for alert ${id}, property=${capturedPropertyId}, type=${capturedAlertType}, bigquery=${capturedUsesBigQuery}`);
        try {
          console.log(`[test-send] Calling generateAlertContent...`);
          const contentHtml = await generateAlertContent(
            capturedToken,
            capturedPropertyId,
            capturedAlertType,
            capturedFreqLabel,
            capturedCustomPrompt,
            capturedUsesBigQuery,
            capturedDataSources,
            capturedDisplayCurrency
          );
          console.log(`[test-send] Content generated (${contentHtml.length} chars), sending email to ${recipients.join(", ")}...`);
          if (!contentHtml.trim()) {
            console.error(`[test-send] Empty content for alert ${id} — aborting send`);
            return;
          }

          const subject = `[TEST] ${headerTitle} – ${propertyLabel}`;
          const html = buildEmailWrapper(
            propertyLabel,
            scheduleDesc,
            headerTitle,
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
    const subject = `[TEST] ${headerTitle} – ${propertyLabel}`;
    const contentHtml = buildSampleContent(alertTypeLabel, propertyLabel, scheduleDesc);

    const html = buildEmailWrapper(
      propertyLabel,
      scheduleDesc,
      headerTitle,
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
      When your scheduled alert runs, this section will contain real data from your connected analytics sources.
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
      Sample data shown above. Your actual report will contain real analytics from your connected data sources.
    </p>
  `;
}
