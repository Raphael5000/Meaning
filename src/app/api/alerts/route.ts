import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { VALID_DAYS } from "@/lib/schedule";

export const dynamic = "force-dynamic";

const VALID_ALERT_TYPES = new Set(["weekly_snapshot", "traffic_report", "top_pages", "custom"]);

/** GET /api/alerts – list all email alerts for the authenticated user */
export async function GET() {
  const session = await auth();
  const userId = (session as { userId?: string })?.userId;
  if (!userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    const alerts = await prisma.emailAlert.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(alerts);
  } catch (err) {
    console.error("[api/alerts] GET error:", err);
    return NextResponse.json(
      { error: "Failed to fetch alerts" },
      { status: 500 }
    );
  }
}

/** POST /api/alerts – create a new email alert */
export async function POST(request: NextRequest) {
  const session = await auth();
  const userId = (session as { userId?: string })?.userId;
  if (!userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = (await request.json()) as {
    recipients: string;
    alertType?: string;
    customPrompt?: string;
    propertyId?: string | null;
    propertyName?: string | null;
    sendDays?: string[];
    sendHour?: number;
    sendMinute?: number;
    intervalWeeks?: number;
  };

  // Validate recipients
  const emails = body.recipients
    .split(",")
    .map((e) => e.trim())
    .filter(Boolean);
  if (emails.length === 0) {
    return NextResponse.json(
      { error: "At least one recipient email is required" },
      { status: 400 }
    );
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  for (const email of emails) {
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: `Invalid email address: ${email}` },
        { status: 400 }
      );
    }
  }

  // Validate alert type
  const alertType = body.alertType || "weekly_snapshot";
  if (!VALID_ALERT_TYPES.has(alertType)) {
    return NextResponse.json(
      { error: "Invalid alert type" },
      { status: 400 }
    );
  }

  // Validate custom prompt
  const customPrompt = alertType === "custom" ? (body.customPrompt ?? "").trim() : null;
  if (alertType === "custom" && !customPrompt) {
    return NextResponse.json(
      { error: "A custom prompt is required for the Custom Report type" },
      { status: 400 }
    );
  }

  // Validate schedule fields
  const sendDays = body.sendDays || ["monday"];
  if (!Array.isArray(sendDays) || sendDays.length === 0 || !sendDays.every((d) => VALID_DAYS.has(d))) {
    return NextResponse.json(
      { error: "sendDays must be a non-empty array of valid day names (e.g. monday, tuesday)" },
      { status: 400 }
    );
  }

  const sendHour = body.sendHour ?? 9;
  if (!Number.isInteger(sendHour) || sendHour < 0 || sendHour > 23) {
    return NextResponse.json(
      { error: "sendHour must be an integer between 0 and 23" },
      { status: 400 }
    );
  }

  const sendMinute = body.sendMinute ?? 0;
  if (!Number.isInteger(sendMinute) || sendMinute < 0 || sendMinute > 59) {
    return NextResponse.json(
      { error: "sendMinute must be an integer between 0 and 59" },
      { status: 400 }
    );
  }

  const intervalWeeks = body.intervalWeeks ?? 1;
  if (!Number.isInteger(intervalWeeks) || intervalWeeks < 1 || intervalWeeks > 52) {
    return NextResponse.json(
      { error: "intervalWeeks must be an integer between 1 and 52" },
      { status: 400 }
    );
  }

  try {
    const alert = await prisma.emailAlert.create({
      data: {
        userId,
        recipients: emails.join(", "),
        alertType,
        customPrompt,
        propertyId: body.propertyId ?? null,
        propertyName: body.propertyName ?? null,
        sendDays,
        sendHour,
        sendMinute,
        intervalWeeks,
      },
    });

    return NextResponse.json(alert, { status: 201 });
  } catch (err) {
    console.error("[api/alerts] POST error:", err);
    return NextResponse.json(
      { error: "Failed to create alert" },
      { status: 500 }
    );
  }
}
