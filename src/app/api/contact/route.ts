import { NextResponse } from "next/server";
import { sendAlertEmail } from "@/lib/resend";
import { meaningEmailShell } from "@/lib/email-shell";

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function POST(req: Request) {
  try {
    const { name, email, subject, message } = await req.json();

    if (!name || !email || !subject || !message) {
      return NextResponse.json(
        { error: "All fields are required" },
        { status: 400 }
      );
    }

    const field = (label: string, value: string) => `
      <tr>
        <td style="padding:10px 16px 10px 0;vertical-align:top;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;color:#9A9A9A;white-space:nowrap;">${label}</td>
        <td style="padding:10px 0;font-size:14px;color:#1A1A1A;">${value}</td>
      </tr>`;

    const html = meaningEmailShell(`
      <p style="margin:0 0 4px 0;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.1em;color:#9A9A9A;">New Enquiry</p>
      <h1 style="margin:0 0 28px 0;font-size:22px;font-weight:500;color:#1A1A1A;letter-spacing:-0.02em;">Message from ${escapeHtml(name)}</h1>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #E5E4E1;border-bottom:1px solid #E5E4E1;">
        ${field("Name", escapeHtml(name))}
        ${field("Email", escapeHtml(email))}
        ${field("Subject", escapeHtml(subject))}
      </table>
      <p style="margin:28px 0 8px 0;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.1em;color:#9A9A9A;">Message</p>
      <div style="padding:16px 20px;background-color:#FAFAF8;border-radius:8px;border:1px solid #E5E4E1;">
        <p style="margin:0;font-size:14px;line-height:1.7;color:#1A1A1A;white-space:pre-wrap;">${escapeHtml(message)}</p>
      </div>
      <div style="margin-top:28px;">
        <a href="mailto:${escapeHtml(email)}" style="display:inline-block;padding:10px 24px;background-color:#1A1A1A;color:#FFFFFF;font-size:13px;font-weight:600;text-decoration:none;border-radius:100px;">Reply to ${escapeHtml(name)}</a>
      </div>
    `);

    await sendAlertEmail(
      ["matt@hivory.io"],
      `Contact Form: ${subject}`,
      html
    );

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Contact form error:", err);
    return NextResponse.json(
      { error: "Failed to send message. Please try again." },
      { status: 500 }
    );
  }
}
