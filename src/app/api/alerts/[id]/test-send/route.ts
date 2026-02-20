import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { sendAlertEmail } from "@/lib/resend";

export const dynamic = "force-dynamic";

/** POST /api/alerts/[id]/test-send – send a test email for the given alert */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  const userId = (session as { userId?: string })?.userId;
  if (!userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { id } = await params;

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
    const subject = `[TEST] ${alert.frequency.charAt(0).toUpperCase() + alert.frequency.slice(1)} Performance Summary – ${propertyLabel}`;

    const html = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: #fff3cd; border: 1px solid #ffc107; border-radius: 6px; padding: 12px 16px; margin-bottom: 20px;">
          <p style="color: #856404; font-size: 13px; margin: 0; font-weight: 600;">This is a test email. No action is needed.</p>
        </div>
        <h2 style="color: #1a1a1a; margin-bottom: 4px;">Website Performance Summary</h2>
        <p style="color: #666; font-size: 14px; margin-top: 0;">${propertyLabel} &middot; ${alert.frequency} report</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
        <p style="color: #333; font-size: 15px; line-height: 1.6;">
          This is a placeholder for your ${alert.frequency} website performance summary.
          Detailed analytics data will be included here in a future update.
        </p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
        <p style="color: #999; font-size: 12px;">
          Sent by <a href="https://usemeaning.io" style="color: #999;">Meaning</a>
          &middot; You received this because ${alert.user.name || alert.user.email} sent a test alert.
        </p>
      </div>
    `.trim();

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
