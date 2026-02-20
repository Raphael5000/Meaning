import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const VALID_ALERT_TYPES = new Set(["weekly_snapshot", "traffic_report", "top_pages"]);

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
    frequency: string;
    alertType?: string;
    propertyId?: string | null;
    propertyName?: string | null;
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

  // Validate frequency
  const validFrequencies = ["daily", "weekly", "monthly"];
  if (!validFrequencies.includes(body.frequency)) {
    return NextResponse.json(
      { error: "Frequency must be daily, weekly, or monthly" },
      { status: 400 }
    );
  }

  // Validate alert type
  const alertType = body.alertType || "weekly_snapshot";
  if (!VALID_ALERT_TYPES.has(alertType)) {
    return NextResponse.json(
      { error: "Invalid alert type" },
      { status: 400 }
    );
  }

  try {
    const alert = await prisma.emailAlert.create({
      data: {
        userId,
        recipients: emails.join(", "),
        frequency: body.frequency,
        alertType,
        propertyId: body.propertyId ?? null,
        propertyName: body.propertyName ?? null,
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
