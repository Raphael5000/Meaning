import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  const userId = (session as { userId?: string })?.userId;

  if (!userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const googleAccount = await prisma.account.findFirst({
    where: { userId, provider: "google" },
    select: { id: true, providerAccountId: true, refresh_token: true },
  });

  // Try to get the Google email from the id_token or from the user record
  let googleEmail: string | null = null;
  if (googleAccount) {
    // The user's email is on the User model — for Google OAuth users this is
    // the Google email.  For credentials users who linked Google separately,
    // it is still typically the same email.
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true },
    });
    googleEmail = user?.email ?? null;
  }

  return NextResponse.json({
    hasGoogleAccount: !!googleAccount?.refresh_token,
    googleEmail,
  });
}
