import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/** DELETE /api/user/connections/google — disconnect Google account */
export async function DELETE() {
  const session = await auth();
  const userId = (session as { userId?: string })?.userId;

  if (!userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const googleAccount = await prisma.account.findFirst({
    where: { userId, provider: "google" },
    select: { id: true },
  });

  if (!googleAccount) {
    return NextResponse.json({ error: "No Google account linked" }, { status: 404 });
  }

  // Remove the linked Google account and reset the GA onboarding flag
  await prisma.$transaction([
    prisma.account.delete({ where: { id: googleAccount.id } }),
    prisma.user.update({
      where: { id: userId },
      data: { gaConnected: false },
    }),
  ]);

  return NextResponse.json({ ok: true });
}
