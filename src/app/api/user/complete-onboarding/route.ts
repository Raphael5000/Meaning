import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const session = await auth();
    const userId =
      typeof (session as { userId?: unknown })?.userId === "string"
        ? (session as { userId: string }).userId
        : null;

    if (!userId) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });

    if (!user) {
      console.error("[complete-onboarding] User not found for id:", userId);
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    await prisma.user.update({
      where: { id: userId },
      data: { gaConnected: true },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[complete-onboarding]", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    const isDev = process.env.NODE_ENV === "development";
    return NextResponse.json(
      { error: isDev ? message : "Something went wrong" },
      { status: 500 }
    );
  }
}
