import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { sendAlertEmail } from "@/lib/resend";
import { generateAlertContent, AlertDataSources } from "@/lib/alert-content";
import { buildEmailWrapper } from "@/lib/email-wrapper";
import { getGoogleAccessToken } from "@/lib/google-token";
import { frequencyLabel } from "@/lib/schedule";
import { getOrgDataSources } from "@/lib/org-access";

export const dynamic = "force-dynamic";

/**
 * POST /api/alerts/preview-send
 *
 * Sends a "test before save" email for an unsaved alert. The v2 create flow
 * calls this when the user clicks "Send test to me first" before persisting
 * the alert. Body is the in-flight form data (same shape as POST /api/alerts).
 *
 * The email goes to the recipients listed in the body. We require auth so
 * unauthenticated callers can't use this as a free email-sender.
 */
export async function POST(request: NextRequest) {
  const session = await auth();
  const userId = (session as { userId?: string })?.userId;
  if (!userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  let body: {
    name?: string;
    recipients: string;
    alertType: string;
    customPrompt?: string | null;
    sendDays: string[];
    sendHour: number;
    sendMinute: number;
    intervalWeeks: number;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const recipients = (body.recipients || "")
    .split(",")
    .map((e) => e.trim())
    .filter(Boolean);
  if (recipients.length === 0) {
    return NextResponse.json(
      { error: "Add at least one recipient." },
      { status: 400 },
    );
  }

  // We need the user's active org to resolve data sources. Use the most
  // recently active org as a sensible default.
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { activeOrgId: true, name: true, email: true },
  });
  if (!user?.activeOrgId) {
    return NextResponse.json(
      { error: "No active workspace. Open the app first." },
      { status: 400 },
    );
  }

  const org = await prisma.organization.findUnique({
    where: { id: user.activeOrgId },
    select: { displayCurrency: true, name: true },
  });
  const displayCurrency = org?.displayCurrency ?? "USD";
  const orgDataSources = await getOrgDataSources(user.activeOrgId);

  const ga4Ds = orgDataSources.find(
    (ds) =>
      ds.type === "GA4_BIGQUERY" &&
      (ds.status === "ACTIVE" || ds.status === "BACKFILLING"),
  );
  const propertyId = ga4Ds?.propertyId ?? "";

  const dataSources: AlertDataSources = {
    propertyId,
    adsCustomerId:
      orgDataSources.find(
        (ds) =>
          ds.type === "GOOGLE_ADS" &&
          (ds.status === "ACTIVE" || ds.status === "BACKFILLING"),
      )?.adsCustomerId ?? null,
    linkedInOrgId:
      orgDataSources.find(
        (ds) =>
          ds.type === "LINKEDIN" &&
          (ds.status === "ACTIVE" || ds.status === "BACKFILLING"),
      )?.propertyId ?? null,
    mailchimpListId:
      orgDataSources.find(
        (ds) =>
          ds.type === "MAILCHIMP" &&
          (ds.status === "ACTIVE" || ds.status === "BACKFILLING"),
      )?.propertyId ?? null,
    gscSiteUrl:
      orgDataSources.find(
        (ds) =>
          ds.type === "SEARCH_CONSOLE" &&
          (ds.status === "ACTIVE" || ds.status === "BACKFILLING"),
      )?.propertyId ?? null,
    msAdsAccountId:
      orgDataSources.find(
        (ds) =>
          ds.type === "MICROSOFT_ADS" &&
          (ds.status === "ACTIVE" || ds.status === "BACKFILLING"),
      )?.propertyId ?? null,
  };

  const accessToken = await getGoogleAccessToken(
    session as { accessToken?: string; userId?: string } | null,
  );

  // Fire-and-forget: kick off generation in the background, return now.
  const capturedToken = accessToken || "";
  const capturedPropertyId = propertyId;
  const capturedAlertType = body.alertType;
  const capturedCustomPrompt = body.customPrompt ?? null;
  const capturedFreqLabel = frequencyLabel(
    body.sendDays,
    body.intervalWeeks,
  );
  const capturedDataSources = dataSources;
  const capturedDisplayCurrency = displayCurrency;
  const capturedHeaderTitle = body.name?.trim() || "Test alert";
  const capturedRecipients = recipients;

  const capturedSenderName =
    user.name || user.email || "Meaning";
  const capturedPropertyLabel = org?.name || "your workspace";
  const capturedScheduleDesc = `Every ${capturedFreqLabel} (test)`;

  void (async () => {
    try {
      const contentHtml = await generateAlertContent(
        capturedToken,
        capturedPropertyId,
        capturedAlertType,
        capturedFreqLabel,
        capturedCustomPrompt,
        true, // org-flow always uses BigQuery path
        capturedDataSources,
        capturedDisplayCurrency,
        user.activeOrgId ?? null,
      );
      if (!contentHtml.trim()) {
        console.error(`[preview-send] Empty content — aborting send`);
        return;
      }
      const subject = `[TEST] ${capturedHeaderTitle}`;
      const html = buildEmailWrapper(
        capturedPropertyLabel,
        capturedScheduleDesc,
        capturedHeaderTitle,
        contentHtml,
        capturedSenderName,
        true,
      );
      await sendAlertEmail(capturedRecipients, subject, html);
      console.log(
        `[preview-send] Test sent to ${capturedRecipients.length} recipient(s)`,
      );
    } catch (err) {
      console.error(`[preview-send] Generation failed:`, err);
    }
  })();

  return NextResponse.json({
    success: true,
    message: "Generating test — the email will arrive in about a minute.",
  });
}
