import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendAlertEmail } from "@/lib/resend";
import { generateAlertContent, AlertDataSources } from "@/lib/alert-content";
import { ALERT_TYPES } from "@/lib/alert-prompts";
import { buildEmailWrapper } from "@/lib/email-wrapper";
import { getValidGoogleTokenForUser } from "@/lib/google-token";
import { isAlertDue, describeSchedule, frequencyLabel } from "@/lib/schedule";
import { shouldUseBigQuery, getGoogleAdsCustomerId, getLinkedInOrgId, getMailchimpListId, getGscSiteUrl, getMicrosoftAdsAccountId } from "@/lib/rollout";
import { getOrgDataSources } from "@/lib/org-access";

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
    // sendHour is stored as GMT+2 — match against current GMT+2 hour
    const currentHour = (now.getUTCHours() + 2) % 24;

    const alerts = await prisma.emailAlert.findMany({
      where: { enabled: true, sendHour: currentHour },
      include: {
        user: { select: { id: true, name: true, email: true } },
        org: { select: { name: true } },
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

      const propertyLabel = alert.org?.name || alert.propertyName || alert.propertyId || "your website";
      const alertTypeDef = ALERT_TYPES[alert.alertType];
      const alertTypeLabel = alertTypeDef?.label ?? "Performance Summary";
      const headerTitle = alert.name || alertTypeLabel;
      const subject = `${headerTitle} – ${propertyLabel}`;
      const scheduleDesc = describeSchedule(alert.sendDays, alert.sendHour, alert.sendMinute, alert.intervalWeeks);
      const freqLabel = frequencyLabel(alert.sendDays, alert.intervalWeeks);

      try {
        let contentHtml: string;

        // Resolve data sources: prefer org-level discovery, fall back to property-level
        let propertyId = alert.propertyId;
        let usesBigQuery = false;
        let dataSources: AlertDataSources | null = null;
        let displayCurrency = "USD";

        if (alert.orgId) {
          // Org-based: fetch all data sources from the org
          const org = await prisma.organization.findUnique({
            where: { id: alert.orgId },
            select: { displayCurrency: true },
          });
          displayCurrency = org?.displayCurrency ?? "USD";

          const orgDataSources = await getOrgDataSources(alert.orgId);

          // Pick first GA4 property if alert doesn't have one
          if (!propertyId) {
            const ga4Ds = orgDataSources.find((ds) => ds.type === "GA4_BIGQUERY" && (ds.status === "ACTIVE" || ds.status === "BACKFILLING"));
            propertyId = ga4Ds?.propertyId ?? null;
          }

          // Collect all platform data source IDs
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
          // Legacy property-based path
          const rollout = await shouldUseBigQuery(propertyId, alert.user.id);
          usesBigQuery = rollout.useBigQuery;

          if (usesBigQuery) {
            const [adsId, liId, mcId, gscUrl, msId] = await Promise.all([
              getGoogleAdsCustomerId(alert.user.id, propertyId),
              getLinkedInOrgId(alert.user.id, propertyId),
              getMailchimpListId(alert.user.id, propertyId),
              getGscSiteUrl(alert.user.id, propertyId),
              getMicrosoftAdsAccountId(alert.user.id, propertyId),
            ]);
            dataSources = {
              propertyId,
              adsCustomerId: adsId,
              linkedInOrgId: liId,
              mailchimpListId: mcId,
              gscSiteUrl: gscUrl,
              msAdsAccountId: msId,
            };
          }
        }

        console.log(`[alerts] alert=${alert.id} property=${propertyId} org=${alert.orgId} user=${alert.user.id} path=${usesBigQuery ? "bigquery" : "ga4"} ads=${!!dataSources?.adsCustomerId} msads=${!!dataSources?.msAdsAccountId} linkedin=${!!dataSources?.linkedInOrgId} mailchimp=${!!dataSources?.mailchimpListId} gsc=${!!dataSources?.gscSiteUrl}`);

        // Get a valid (refreshed if needed) Google access token for this user
        // BigQuery path doesn't need the user's OAuth token, but we still try
        // to get one for the GA4 fallback path
        const accessToken = await getValidGoogleTokenForUser(alert.user.id);

        if (usesBigQuery && propertyId) {
          // BigQuery path — works with or without Google OAuth token
          try {
            contentHtml = await generateAlertContent(
              accessToken || "",
              propertyId,
              alert.alertType,
              freqLabel,
              alert.customPrompt,
              true,
              dataSources,
              displayCurrency
            );
          } catch (genErr) {
            console.error(
              `[api/alerts/send] Content generation failed for alert ${alert.id}:`,
              genErr
            );
            contentHtml = `
              <p style="color: #333; font-size: 15px; line-height: 1.6;">
                We were unable to generate your analytics report for <strong>${propertyLabel}</strong> this time.
                Please log in to <a href="https://usemeaning.io" style="color: #2563eb;">Meaning</a> to check your data connections.
              </p>
            `;
          }
        } else if (propertyId && accessToken) {
          // Legacy GA4 API path
          try {
            contentHtml = await generateAlertContent(
              accessToken,
              propertyId,
              alert.alertType,
              freqLabel,
              alert.customPrompt,
              false
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
              No data source is linked to this alert.
              Please log in to <a href="https://usemeaning.io" style="color: #2563eb;">Meaning</a> to configure your data connections.
            </p>
          `;
        }

        const html = buildEmailWrapper(propertyLabel, scheduleDesc, headerTitle, contentHtml, alert.user.name || alert.user.email);

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
