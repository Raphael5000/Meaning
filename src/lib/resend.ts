import { Resend } from "resend";

let _resend: Resend | null = null;

function getResend(): Resend {
  if (!_resend) {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      throw new Error("RESEND_API_KEY environment variable is required");
    }
    _resend = new Resend(apiKey);
  }
  return _resend;
}

const SENDER_EMAIL =
  process.env.RESEND_FROM_EMAIL || "Meaning <onboarding@resend.dev>";

const ALERT_SENDER_EMAIL =
  process.env.RESEND_FROM_EMAIL?.replace(/^[^<]*</, "Alerts @ Meaning <") ||
  "Alerts @ Meaning <onboarding@resend.dev>";

export async function sendAlertEmail(
  to: string[],
  subject: string,
  html: string
): Promise<{ id: string }> {
  const resend = getResend();

  const { data, error } = await resend.emails.send({
    from: ALERT_SENDER_EMAIL,
    to,
    subject,
    html,
  });

  if (error) {
    throw new Error(`Resend error: ${error.message}`);
  }

  return { id: data!.id };
}

const CONNECTOR_LABELS: Record<string, string> = {
  GOOGLE_ADS: "Google Ads",
  SEARCH_CONSOLE: "Search Console",
  LINKEDIN: "LinkedIn",
  MAILCHIMP: "Mailchimp",
  MICROSOFT_ADS: "Microsoft Ads",
};

export async function sendSyncFailureEmail({
  connectorType,
  failedCount,
  totalCount,
  errors,
}: {
  connectorType: string;
  failedCount: number;
  totalCount: number;
  errors: Array<{ propertyId: string; error: string }>;
}): Promise<void> {
  const adminEmail = process.env.ADMIN_ALERT_EMAIL;
  if (!adminEmail) return; // silently skip if not configured

  const label = CONNECTOR_LABELS[connectorType] || connectorType;
  const time = new Date().toUTCString();

  const errorRows = errors
    .map(
      (e) => `
      <tr>
        <td style="padding: 8px 12px; border-bottom: 1px solid #eee; font-size: 13px; color: #333;">${e.propertyId}</td>
        <td style="padding: 8px 12px; border-bottom: 1px solid #eee; font-size: 13px; color: #c0392b; word-break: break-word;">${e.error}</td>
      </tr>`
    )
    .join("");

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 32px 20px;">
      <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 16px 20px; margin-bottom: 24px;">
        <p style="margin: 0; font-size: 15px; font-weight: 600; color: #991b1b;">
          ${label} sync failure — ${failedCount} of ${totalCount} account${totalCount !== 1 ? "s" : ""} failed
        </p>
        <p style="margin: 4px 0 0; font-size: 13px; color: #7f1d1d;">${time}</p>
      </div>

      <table style="width: 100%; border-collapse: collapse; border: 1px solid #e5e5e5; border-radius: 8px; overflow: hidden;">
        <thead>
          <tr style="background: #f9fafb;">
            <th style="padding: 8px 12px; text-align: left; font-size: 11px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em;">Account</th>
            <th style="padding: 8px 12px; text-align: left; font-size: 11px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em;">Error</th>
          </tr>
        </thead>
        <tbody>
          ${errorRows}
        </tbody>
      </table>

      <p style="margin-top: 24px; font-size: 13px; color: #6b7280;">
        The sync will retry automatically at the next scheduled run. To manually resync, use:
      </p>
      <pre style="background: #f3f4f6; padding: 12px; border-radius: 6px; font-size: 12px; color: #374151; overflow-x: auto;">curl -X POST "https://usemeaning.io/api/resync-all?type=${connectorType}&errorsOnly=true" \\
  -H "Authorization: Bearer $CRON_SECRET"</pre>
    </div>
  `;

  try {
    const resend = getResend();
    await resend.emails.send({
      from: ALERT_SENDER_EMAIL,
      to: adminEmail.split(",").map((e) => e.trim()),
      subject: `[Meaning] ${label} sync failed — ${failedCount}/${totalCount} accounts`,
      html,
    });
    console.log(`[sync-alert] Failure email sent for ${label}: ${failedCount}/${totalCount}`);
  } catch (err) {
    console.error("[sync-alert] Failed to send email:", err);
  }
}

export async function sendTeamInviteEmail({
  to,
  teamName,
  inviterName,
  inviteUrl,
}: {
  to: string;
  teamName: string;
  inviterName: string;
  inviteUrl: string;
}): Promise<{ id: string }> {
  const resend = getResend();

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 20px;">
      <h2 style="color: #111; margin-bottom: 8px;">You're invited to join ${teamName}</h2>
      <p style="color: #555; font-size: 15px; line-height: 1.5;">
        ${inviterName} has invited you to join their team on <strong>Meaning</strong> — an AI-powered Google Analytics assistant.
      </p>
      <p style="color: #555; font-size: 15px; line-height: 1.5;">
        Click the button below to create your account and start exploring analytics.
      </p>
      <a href="${inviteUrl}" style="display: inline-block; background: #111; color: #fff; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-weight: 500; font-size: 15px; margin: 16px 0;">
        Accept Invite
      </a>
      <p style="color: #999; font-size: 13px; margin-top: 24px;">
        This invite expires in 7 days. If you didn't expect this email, you can safely ignore it.
      </p>
    </div>
  `;

  const { data, error } = await resend.emails.send({
    from: SENDER_EMAIL,
    to: [to],
    subject: `${inviterName} invited you to join ${teamName} on Meaning`,
    html,
  });

  if (error) {
    throw new Error(`Resend error: ${error.message}`);
  }

  return { id: data!.id };
}
