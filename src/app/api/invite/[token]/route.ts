import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { updateSubscriptionQuantity } from "@/lib/paystack";

export const dynamic = "force-dynamic";

/** GET /api/invite/[token] — validate invite token and return info */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  const invite = await prisma.teamInvite.findUnique({
    where: { token },
    include: { team: { select: { name: true, owner: { select: { name: true } } } } },
  });

  if (!invite) {
    return NextResponse.json({ error: "Invite not found" }, { status: 404 });
  }

  if (invite.acceptedAt) {
    return NextResponse.json({ error: "Invite already accepted" }, { status: 400 });
  }

  if (invite.expiresAt < new Date()) {
    return NextResponse.json({ error: "Invite has expired" }, { status: 400 });
  }

  return NextResponse.json({
    email: invite.email,
    teamName: invite.team.name,
    inviterName: invite.team.owner.name,
  });
}

/** POST /api/invite/[token] — accept invite (create account or link existing) */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  const invite = await prisma.teamInvite.findUnique({
    where: { token },
    include: { team: { select: { id: true, ownerId: true } } },
  });

  if (!invite) {
    return NextResponse.json({ error: "Invite not found" }, { status: 404 });
  }

  if (invite.acceptedAt) {
    return NextResponse.json({ error: "Invite already accepted" }, { status: 400 });
  }

  if (invite.expiresAt < new Date()) {
    return NextResponse.json({ error: "Invite has expired" }, { status: 400 });
  }

  const { name, password } = (await request.json()) as {
    name: string;
    password: string;
  };

  if (!name?.trim()) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }
  if (!password || password.length < 8) {
    return NextResponse.json(
      { error: "Password must be at least 8 characters" },
      { status: 400 }
    );
  }

  // Find or create user
  let user = await prisma.user.findUnique({
    where: { email: invite.email },
  });

  if (user) {
    // If user exists but has no password, set it
    if (!user.passwordHash) {
      const hash = await bcrypt.hash(password, 12);
      user = await prisma.user.update({
        where: { id: user.id },
        data: { passwordHash: hash, name: name.trim() },
      });
    }
  } else {
    // Create new user
    const hash = await bcrypt.hash(password, 12);
    user = await prisma.user.create({
      data: {
        email: invite.email,
        name: name.trim(),
        passwordHash: hash,
      },
    });
  }

  // Create team membership
  await prisma.teamMembership.upsert({
    where: { teamId_userId: { teamId: invite.team.id, userId: user.id } },
    create: {
      teamId: invite.team.id,
      userId: user.id,
      role: "member",
      properties: invite.properties,
    },
    update: {
      properties: invite.properties,
    },
  });

  // Mark invite as accepted
  await prisma.teamInvite.update({
    where: { id: invite.id },
    data: { acceptedAt: new Date() },
  });

  // Auto-increment seat count and update Paystack billing
  try {
    const subscription = await prisma.subscription.findUnique({
      where: { userId: invite.team.ownerId },
      select: { id: true, seatCount: true, paystackSubscriptionCode: true },
    });
    if (subscription) {
      const newSeatCount = subscription.seatCount + 1;
      await prisma.subscription.update({
        where: { id: subscription.id },
        data: { seatCount: newSeatCount },
      });
      if (subscription.paystackSubscriptionCode) {
        await updateSubscriptionQuantity(
          subscription.paystackSubscriptionCode,
          newSeatCount
        );
      }
    }
  } catch (err) {
    console.error("[invite] Failed to update seat count:", err);
  }

  return NextResponse.json({ success: true, email: invite.email });
}
