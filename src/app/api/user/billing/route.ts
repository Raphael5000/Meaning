import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  if (!session?.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payments = await prisma.payment.findMany({
    where: { userId: session.userId },
    orderBy: { createdAt: "desc" },
    take: 20,
    select: {
      id: true,
      amount: true,
      currency: true,
      status: true,
      description: true,
      paystackReference: true,
      createdAt: true,
    },
  });

  return NextResponse.json({ payments });
}
