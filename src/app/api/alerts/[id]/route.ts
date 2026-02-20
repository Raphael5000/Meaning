import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

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
    frequency?: string;
    propertyId?: string | null;
    propertyName?: string | null;
    enabled?: boolean;
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

    if (body.frequency !== undefined) {
      const validFrequencies = ["daily", "weekly", "monthly"];
      if (!validFrequencies.includes(body.frequency)) {
        return NextResponse.json(
          { error: "Frequency must be daily, weekly, or monthly" },
          { status: 400 }
        );
      }
      data.frequency = body.frequency;
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
