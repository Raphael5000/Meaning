import { NextRequest, NextResponse } from "next/server";
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

  const chats = await prisma.chat.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    include: {
      messages: { orderBy: { sortOrder: "asc" } },
    },
  });

  return NextResponse.json(chats);
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
    }[];
  };

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
          sortOrder: i,
        })),
      },
    },
    include: { messages: { orderBy: { sortOrder: "asc" } } },
  });

  return NextResponse.json(chat, { status: 201 });
}
