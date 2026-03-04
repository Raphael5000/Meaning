import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { chargeAuthorization } from "@/lib/paystack";
import crypto from "crypto";

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

  // Auto-increment seat count and charge prorated amount for remaining days
  try {
    const subscription = await prisma.subscription.findUnique({
      where: { userId: invite.team.ownerId },
      select: { id: true, seatCount: true, currentPeriodEnd: true },
    });
    const admin = await prisma.user.findUnique({
      where: { id: invite.team.ownerId },
      select: { email: true, paystackAuthorizationCode: true },
    });

    if (subscription) {
      await prisma.subscription.update({
        where: { id: subscription.id },
        data: { seatCount: subscription.seatCount + 1 },
      });

      // Prorate: charge for remaining days in the current billing cycle
      const now = Date.now();
      const periodEnd = subscription.currentPeriodEnd.getTime();
      const remainingDays = Math.max(0, Math.ceil((periodEnd - now) / 86_400_000));
      const SEAT_PRICE_KOBO = 19900;
      const proratedAmount = Math.ceil((remainingDays / 30) * SEAT_PRICE_KOBO);

      if (proratedAmount > 0 && admin?.paystackAuthorizationCode) {
        const ref = `prorate_${invite.id}_${crypto.randomUUID().slice(0, 8)}`;
        try {
          await chargeAuthorization({
            authorization_code: admin.paystackAuthorizationCode,
            email: admin.email,
            amount: proratedAmount,
            reference: ref,
            metadata: {
              type: "prorated_seat",
              inviteId: invite.id,
              remainingDays,
            },
          });

          await prisma.payment.create({
            data: {
              userId: invite.team.ownerId,
              amount: proratedAmount,
              currency: "ZAR",
              status: "success",
              paystackReference: ref,
              description: `Prorated seat (${remainingDays} days)`,
            },
          });
        } catch (chargeErr) {
          console.error("[invite] Prorated charge failed:", chargeErr);
        }
      }
    }
  } catch (err) {
    console.error("[invite] Failed to update seat count:", err);
  }

  return NextResponse.json({ success: true, email: invite.email });
}
