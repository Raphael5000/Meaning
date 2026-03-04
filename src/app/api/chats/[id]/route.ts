import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/** PUT /api/chats/:id – update chat title and/or replace messages */
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

  try {
    // Verify ownership
    const existing = await prisma.chat.findFirst({ where: { id, userId } });
    if (!existing) {
      return NextResponse.json({ error: "Chat not found" }, { status: 404 });
    }

    const body = (await request.json()) as {
      title?: string;
      propertyId?: string | null;
      propertyName?: string;
      messages?: {
        id: string;
        role: string;
        content: string;
        scorecard?: { value: string; label: string; change?: string } | null;
        scorecardRevealed?: boolean;
        suggestedQuestions?: string[];
        chart?: Record<string, unknown> | null;
      }[];
    };

    // Build update data
    const updateData: Record<string, unknown> = {};
    if (body.title !== undefined) updateData.title = body.title;
    if (body.propertyId !== undefined) updateData.propertyId = body.propertyId;
    if (body.propertyName !== undefined) updateData.propertyName = body.propertyName;

    // If messages provided, delete old ones and insert the new set
    if (body.messages) {
      await prisma.chatMessage.deleteMany({ where: { chatId: id } });
      updateData.messages = {
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
      };
    }

    const chat = await prisma.chat.update({
      where: { id },
      data: updateData,
      include: { messages: { orderBy: { sortOrder: "asc" } } },
    });

    return NextResponse.json(chat);
  } catch (err) {
    console.error("[api/chats] PUT error:", err);
    return NextResponse.json({ error: "Failed to update chat" }, { status: 500 });
  }
}

/** DELETE /api/chats/:id – delete a chat and its messages */
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
    // Verify ownership
    const existing = await prisma.chat.findFirst({ where: { id, userId } });
    if (!existing) {
      return NextResponse.json({ error: "Chat not found" }, { status: 404 });
    }

    await prisma.chat.delete({ where: { id } });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[api/chats] DELETE error:", err);
    return NextResponse.json({ error: "Failed to delete chat" }, { status: 500 });
  }
}
