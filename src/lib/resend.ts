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

export async function sendAlertEmail(
  to: string[],
  subject: string,
  html: string
): Promise<{ id: string }> {
  const resend = getResend();

  const { data, error } = await resend.emails.send({
    from: SENDER_EMAIL,
    to,
    subject,
    html,
  });

  if (error) {
    throw new Error(`Resend error: ${error.message}`);
  }

  return { id: data!.id };
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
