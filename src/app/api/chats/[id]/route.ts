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
    const updateData: Prisma.ChatUpdateInput = {};
    if (body.title !== undefined) updateData.title = body.title;
    if (body.propertyId !== undefined) updateData.propertyId = body.propertyId;
    if (body.propertyName !== undefined) updateData.propertyName = body.propertyName;

    let chat;
    if (body.messages) {
      // Use a transaction to atomically delete old messages and insert new ones
      // (prevents race conditions from concurrent PUTs)
      const messageRows = body.messages.map((m, i) => ({
        role: m.role,
        content: m.content,
        scorecard: (m.scorecard ?? undefined) as Prisma.InputJsonValue | undefined,
        scorecardRevealed: m.scorecardRevealed ?? false,
        suggestedQuestions: (m.suggestedQuestions ?? undefined) as Prisma.InputJsonValue | undefined,
        chart: (m.chart ?? undefined) as Prisma.InputJsonValue | undefined,
        sortOrder: i,
        chatId: id,
      }));

      chat = await prisma.$transaction(async (tx) => {
        await tx.chatMessage.deleteMany({ where: { chatId: id } });
        await tx.chat.update({ where: { id }, data: updateData });
        await tx.chatMessage.createMany({ data: messageRows });
        return tx.chat.findUniqueOrThrow({
          where: { id },
          include: { messages: { orderBy: { sortOrder: "asc" } } },
        });
      });
    } else {
      chat = await prisma.chat.update({
        where: { id },
        data: updateData,
        include: { messages: { orderBy: { sortOrder: "asc" } } },
      });
    }

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
