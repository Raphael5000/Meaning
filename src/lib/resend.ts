import { Resend } from "resend";
import { meaningEmailShell, meaningEmailShellWithHeader } from "./email-shell";

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
      (e) => `<tr>
        <td style="padding:6px 0;font-size:13px;color:#991B1B;font-family:monospace;">${e.propertyId}</td>
        <td style="padding:6px 0;font-size:13px;color:#991B1B;word-break:break-word;">${e.error}</td>
      </tr>`
    )
    .join("");

  const field = (l: string, v: string) => `<tr>
    <td style="padding:10px 16px 10px 0;vertical-align:top;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;color:#9A9A9A;white-space:nowrap;">${l}</td>
    <td style="padding:10px 0;font-size:14px;color:#1A1A1A;">${v}</td>
  </tr>`;

  const html = meaningEmailShellWithHeader(`
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #E5E4E1;border-bottom:1px solid #E5E4E1;">
      ${field("Connector", label)}
      ${field("Failed", `${failedCount} of ${totalCount} account${totalCount !== 1 ? "s" : ""}`)}
      ${field("Time", time)}
    </table>
    <div style="margin-top:20px;padding:16px 20px;background-color:#FEF2F2;border-radius:8px;border:1px solid #FECACA;">
      <p style="margin:0;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;color:#9A9A9A;margin-bottom:8px;">Errors</p>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        ${errorRows}
      </table>
    </div>
    <p style="margin:20px 0 0 0;font-size:13px;line-height:1.6;color:#6B6B6B;">The sync will retry automatically at the next scheduled run.</p>
  `, "#ef4444", "Sync Failure");

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

export async function sendAhrefsQuotaEmail({
  used,
  limit,
  pct,
  resetDate,
  blocked,
}: {
  used: number;
  limit: number;
  pct: number;
  resetDate: string | null;
  blocked: boolean;
}): Promise<void> {
  const adminEmail = process.env.ADMIN_ALERT_EMAIL;
  if (!adminEmail) return; // silently skip if not configured

  const field = (l: string, v: string) => `<tr>
    <td style="padding:10px 16px 10px 0;vertical-align:top;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;color:#9A9A9A;white-space:nowrap;">${l}</td>
    <td style="padding:10px 0;font-size:14px;color:#1A1A1A;">${v}</td>
  </tr>`;

  const accent = blocked ? "#ef4444" : "#f59e0b";
  const reset = resetDate ? new Date(resetDate).toUTCString() : "unknown";

  const html = meaningEmailShellWithHeader(`
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #E5E4E1;border-bottom:1px solid #E5E4E1;">
      ${field("Used", `${used.toLocaleString()} of ${limit.toLocaleString()} units (${pct.toFixed(1)}%)`)}
      ${field("Remaining", `${Math.max(0, limit - used).toLocaleString()} units`)}
      ${field("Quota resets", reset)}
      ${field("Status", blocked ? "Syncs paused" : "Syncs running")}
    </table>
    <p style="margin:20px 0 0 0;font-size:13px;line-height:1.6;color:#6B6B6B;">
      ${
        blocked
          ? "Ahrefs syncs are paused until the quota resets, to avoid overage. Existing BigQuery data is untouched — dashboards keep working from the last snapshot."
          : "Ahrefs syncs are still running. They will pause automatically before the cap is reached."
      }
    </p>
  `, accent, blocked ? "Ahrefs Quota Exhausted" : "Ahrefs Quota Warning");

  try {
    const resend = getResend();
    await resend.emails.send({
      from: ALERT_SENDER_EMAIL,
      to: adminEmail.split(",").map((e) => e.trim()),
      subject: `[Meaning] Ahrefs API units at ${pct.toFixed(0)}% of monthly cap`,
      html,
    });
    console.log(`[ahrefs-quota] Alert email sent (${pct.toFixed(1)}%)`);
  } catch (err) {
    console.error("[ahrefs-quota] Failed to send email:", err);
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

  const html = meaningEmailShell(`
    <h1 style="margin:0 0 20px 0;font-size:24px;font-weight:500;color:#1A1A1A;letter-spacing:-0.02em;">You're invited to join ${teamName}</h1>
    <p style="margin:0 0 16px 0;font-size:15px;line-height:1.7;color:#6B6B6B;">
      ${inviterName} has invited you to join their team on <strong style="color:#1A1A1A;">Meaning</strong> — an AI-powered analytics assistant.
    </p>
    <p style="margin:0 0 28px 0;font-size:15px;line-height:1.7;color:#6B6B6B;">
      Click the button below to create your account and start exploring analytics.
    </p>
    <a href="${inviteUrl}" style="display:inline-block;padding:10px 24px;background-color:#1A1A1A;color:#FFFFFF;font-size:13px;font-weight:600;text-decoration:none;border-radius:100px;">Accept Invite</a>
    <p style="margin:28px 0 0 0;font-size:13px;line-height:1.6;color:#9A9A9A;">
      This invite expires in 7 days. If you didn't expect this email, you can safely ignore it.
    </p>
  `);

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
