import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { sendTeamInviteEmail } from "@/lib/resend";

export const dynamic = "force-dynamic";

/** POST /api/team/invite — send an invite to a new team member */
export async function POST(request: NextRequest) {
  const session = await auth();
  const userId = (session as { userId?: string })?.userId;
  if (!userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  // Verify user owns a team
  const team = await prisma.team.findUnique({
    where: { ownerId: userId },
    include: {
      memberships: true,
      invites: { where: { acceptedAt: null, expiresAt: { gt: new Date() } } },
      owner: { select: { name: true } },
    },
  });

  if (!team) {
    return NextResponse.json({ error: "You don't own a team" }, { status: 403 });
  }

  const { email, properties } = (await request.json()) as {
    email: string;
    properties?: string[];
  };

  if (!email?.trim()) {
    return NextResponse.json({ error: "Email is required" }, { status: 400 });
  }

  // Check for existing active invite
  const existingInvite = await prisma.teamInvite.findUnique({
    where: { teamId_email: { teamId: team.id, email: email.trim().toLowerCase() } },
  });
  if (existingInvite && !existingInvite.acceptedAt && existingInvite.expiresAt > new Date()) {
    return NextResponse.json(
      { error: "An active invite already exists for this email" },
      { status: 400 }
    );
  }

  // Check if already a member
  const existingUser = await prisma.user.findUnique({
    where: { email: email.trim().toLowerCase() },
    select: { id: true },
  });
  if (existingUser) {
    const existingMembership = await prisma.teamMembership.findUnique({
      where: { teamId_userId: { teamId: team.id, userId: existingUser.id } },
    });
    if (existingMembership) {
      return NextResponse.json(
        { error: "This user is already a team member" },
        { status: 400 }
      );
    }
  }

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7); // 7-day expiry

  // Upsert to handle expired/accepted invites being re-sent
  const invite = await prisma.teamInvite.upsert({
    where: { teamId_email: { teamId: team.id, email: email.trim().toLowerCase() } },
    create: {
      teamId: team.id,
      email: email.trim().toLowerCase(),
      properties: properties || [],
      expiresAt,
    },
    update: {
      properties: properties || [],
      expiresAt,
      acceptedAt: null,
      token: undefined, // generates a new cuid
    },
  });

  // Send invite email
  const baseUrl = process.env.NEXTAUTH_URL || "https://usemeaning.io";
  const inviteUrl = `${baseUrl}/invite/${invite.token}`;
  try {
    await sendTeamInviteEmail({
      to: email.trim().toLowerCase(),
      teamName: team.name,
      inviterName: team.owner.name || "Your teammate",
      inviteUrl,
    });
  } catch (err) {
    console.error("[team/invite] Failed to send email:", err);
    // Don't fail the invite creation — email can be resent
  }

  return NextResponse.json({ invite }, { status: 201 });
}

/** DELETE /api/team/invite — revoke a pending invite */
export async function DELETE(request: NextRequest) {
  const session = await auth();
  const userId = (session as { userId?: string })?.userId;
  if (!userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { inviteId } = (await request.json()) as { inviteId: string };

  const invite = await prisma.teamInvite.findUnique({
    where: { id: inviteId },
    include: { team: { select: { ownerId: true } } },
  });

  if (!invite || invite.team.ownerId !== userId) {
    return NextResponse.json({ error: "Invite not found" }, { status: 404 });
  }

  await prisma.teamInvite.delete({ where: { id: inviteId } });

  return NextResponse.json({ success: true });
}
