import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { VALID_DAYS } from "@/lib/schedule";

export const dynamic = "force-dynamic";

const VALID_ALERT_TYPES = new Set(["weekly_snapshot", "traffic_report", "top_pages", "custom"]);

/** PUT /api/alerts/[id] – update an email alert */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  const userId = (session as { userId?: string })?.userId;
  if (!userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { id } = await params;

  const body = (await request.json()) as {
    recipients?: string;
    alertType?: string;
    customPrompt?: string | null;
    propertyId?: string | null;
    propertyName?: string | null;
    enabled?: boolean;
    sendDays?: string[];
    sendHour?: number;
    sendMinute?: number;
    intervalWeeks?: number;
  };

  try {
    // Ensure alert belongs to user
    const existing = await prisma.emailAlert.findFirst({
      where: { id, userId },
    });
    if (!existing) {
      return NextResponse.json({ error: "Alert not found" }, { status: 404 });
    }

    const data: Record<string, unknown> = {};

    if (body.recipients !== undefined) {
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
      data.recipients = emails.join(", ");
    }

    if (body.alertType !== undefined) {
      if (!VALID_ALERT_TYPES.has(body.alertType)) {
        return NextResponse.json(
          { error: "Invalid alert type" },
          { status: 400 }
        );
      }
      data.alertType = body.alertType;
    }

    // Determine the effective alert type (updated or existing)
    const effectiveAlertType = (data.alertType as string) ?? existing.alertType;

    if (body.customPrompt !== undefined) {
      data.customPrompt = body.customPrompt ? body.customPrompt.trim() : null;
    }

    // If alert type is (or is being changed to) "custom", ensure a prompt exists
    if (effectiveAlertType === "custom") {
      const effectivePrompt = data.customPrompt !== undefined
        ? data.customPrompt
        : existing.customPrompt;
      if (!effectivePrompt) {
        return NextResponse.json(
          { error: "A custom prompt is required for the Custom Report type" },
          { status: 400 }
        );
      }
    }

    // Clear customPrompt when switching away from custom type
    if (effectiveAlertType !== "custom" && data.alertType !== undefined) {
      data.customPrompt = null;
    }

    if (body.sendDays !== undefined) {
      if (!Array.isArray(body.sendDays) || body.sendDays.length === 0 || !body.sendDays.every((d) => VALID_DAYS.has(d))) {
        return NextResponse.json(
          { error: "sendDays must be a non-empty array of valid day names" },
          { status: 400 }
        );
      }
      data.sendDays = body.sendDays;
    }

    if (body.sendHour !== undefined) {
      if (!Number.isInteger(body.sendHour) || body.sendHour < 0 || body.sendHour > 23) {
        return NextResponse.json(
          { error: "sendHour must be an integer between 0 and 23" },
          { status: 400 }
        );
      }
      data.sendHour = body.sendHour;
    }

    if (body.sendMinute !== undefined) {
      if (!Number.isInteger(body.sendMinute) || body.sendMinute < 0 || body.sendMinute > 59) {
        return NextResponse.json(
          { error: "sendMinute must be an integer between 0 and 59" },
          { status: 400 }
        );
      }
      data.sendMinute = body.sendMinute;
    }

    if (body.intervalWeeks !== undefined) {
      if (!Number.isInteger(body.intervalWeeks) || body.intervalWeeks < 1 || body.intervalWeeks > 52) {
        return NextResponse.json(
          { error: "intervalWeeks must be an integer between 1 and 52" },
          { status: 400 }
        );
      }
      data.intervalWeeks = body.intervalWeeks;
    }

    if (body.propertyId !== undefined) data.propertyId = body.propertyId;
    if (body.propertyName !== undefined) data.propertyName = body.propertyName;
    if (body.enabled !== undefined) data.enabled = body.enabled;

    const alert = await prisma.emailAlert.update({
      where: { id },
      data,
    });

    return NextResponse.json(alert);
  } catch (err) {
    console.error("[api/alerts] PUT error:", err);
    return NextResponse.json(
      { error: "Failed to update alert" },
      { status: 500 }
    );
  }
}

/** DELETE /api/alerts/[id] – delete an email alert */
export async function DELETE(
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
    const existing = await prisma.emailAlert.findFirst({
      where: { id, userId },
    });
    if (!existing) {
      return NextResponse.json({ error: "Alert not found" }, { status: 404 });
    }

    await prisma.emailAlert.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[api/alerts] DELETE error:", err);
    return NextResponse.json(
      { error: "Failed to delete alert" },
      { status: 500 }
    );
  }
}
