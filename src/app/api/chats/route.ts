import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/** GET /api/chats – list all chats (with messages) for the authenticated user */
export async function GET() {
  const session = await auth();
  const userId = (session as { userId?: string })?.userId;
  if (!userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    const chats = await prisma.chat.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      include: {
        messages: { orderBy: { sortOrder: "asc" } },
      },
    });

    return NextResponse.json(chats);
  } catch (err) {
    console.error("[api/chats] GET error:", err);
    return NextResponse.json({ error: "Failed to fetch chats" }, { status: 500 });
  }
}

/** POST /api/chats – create a new chat with its initial messages */
export async function POST(request: NextRequest) {
  const session = await auth();
  const userId = (session as { userId?: string })?.userId;
  if (!userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = (await request.json()) as {
    id: string;
    title: string;
    propertyId?: string | null;
    propertyName?: string;
    messages: {
      id: string;
      role: string;
      content: string;
      scorecard?: { value: string; label: string; change?: string } | null;
      scorecardRevealed?: boolean;
      suggestedQuestions?: string[];
      chart?: Record<string, unknown> | null;
    }[];
  };

  try {
    const chat = await prisma.chat.create({
      data: {
        id: body.id,
        userId,
        title: body.title,
        propertyId: body.propertyId ?? null,
        propertyName: body.propertyName ?? null,
        messages: {
          create: body.messages.map((m, i) => ({
            id: m.id,
            role: m.role,
            content: m.content,
            scorecard: m.scorecard ?? undefined,
            scorecardRevealed: m.scorecardRevealed ?? false,
            suggestedQuestions: m.suggestedQuestions ?? undefined,
            chart: (m.chart ?? undefined) as Prisma.InputJsonValue | undefined,
            sortOrder: i,
          })),
        },
      },
      include: { messages: { orderBy: { sortOrder: "asc" } } },
    });

    return NextResponse.json(chat, { status: 201 });
  } catch (err) {
    console.error("[api/chats] POST error:", err);
    return NextResponse.json({ error: "Failed to create chat" }, { status: 500 });
  }
}
