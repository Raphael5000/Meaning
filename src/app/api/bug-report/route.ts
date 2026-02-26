import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { sendAlertEmail } from "@/lib/resend";

export async function POST(req: NextRequest) {
  const session = await auth();
  const userEmail = session?.user?.email ?? "Anonymous";
  const userName = session?.user?.name ?? "Unknown";

  let body: { subject?: string; description?: string; url?: string; userAgent?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { subject, description, url, userAgent } = body;

  if (!subject || !description) {
    return NextResponse.json(
      { error: "Subject and description are required" },
      { status: 400 }
    );
  }

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #1a1a1a; margin-bottom: 16px;">New Bug Report</h2>
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 8px 12px; border: 1px solid #e5e5e5; font-weight: 600; width: 120px; vertical-align: top;">Subject</td>
          <td style="padding: 8px 12px; border: 1px solid #e5e5e5;">${escapeHtml(subject)}</td>
        </tr>
        <tr>
          <td style="padding: 8px 12px; border: 1px solid #e5e5e5; font-weight: 600; vertical-align: top;">Description</td>
          <td style="padding: 8px 12px; border: 1px solid #e5e5e5; white-space: pre-wrap;">${escapeHtml(description)}</td>
        </tr>
        <tr>
          <td style="padding: 8px 12px; border: 1px solid #e5e5e5; font-weight: 600; vertical-align: top;">Reported by</td>
          <td style="padding: 8px 12px; border: 1px solid #e5e5e5;">${escapeHtml(userName)} (${escapeHtml(userEmail)})</td>
        </tr>
        ${url ? `<tr>
          <td style="padding: 8px 12px; border: 1px solid #e5e5e5; font-weight: 600; vertical-align: top;">Page URL</td>
          <td style="padding: 8px 12px; border: 1px solid #e5e5e5;">${escapeHtml(url)}</td>
        </tr>` : ""}
        ${userAgent ? `<tr>
          <td style="padding: 8px 12px; border: 1px solid #e5e5e5; font-weight: 600; vertical-align: top;">User Agent</td>
          <td style="padding: 8px 12px; border: 1px solid #e5e5e5; font-size: 12px; color: #666;">${escapeHtml(userAgent)}</td>
        </tr>` : ""}
      </table>
      <p style="margin-top: 16px; font-size: 12px; color: #999;">
        Submitted on ${new Date().toUTCString()}
      </p>
    </div>
  `;

  try {
    await sendAlertEmail(["hi@hivory.io"], "New Bug Report", html);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Failed to send bug report email:", err);
    return NextResponse.json(
      { error: "Failed to send bug report. Please try again." },
      { status: 500 }
    );
  }
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
