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
  process.env.RESEND_FROM_EMAIL || "Meaning <alerts@usemeaning.io>";

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
