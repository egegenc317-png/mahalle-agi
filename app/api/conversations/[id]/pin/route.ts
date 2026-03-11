// @ts-nocheck
import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function canPin(conversation: {
  conversationType?: string | null;
  participantIds?: string[] | null;
  adminIds?: string[] | null;
}, userId: string) {
  return conversation.conversationType === "GROUP" && (conversation.participantIds || []).includes(userId) && (conversation.adminIds || []).includes(userId);
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });

  const conversation = await prisma.conversation.findUnique({ where: { id: params.id } });
  if (!conversation || !canPin(conversation, session.user.id)) {
    return NextResponse.json({ error: "Bu grup için sabitleme yetkin yok." }, { status: 403 });
  }

  const payload = (await req.json()) as { messageId?: string | null };
  const messageId = typeof payload.messageId === "string" ? payload.messageId : null;

  if (!messageId) {
    const updated = await prisma.conversation.update({
      where: { id: conversation.id },
      data: {
        pinnedMessageId: null,
        pinnedMessageAt: null,
        pinnedByUserId: null
      }
    });
    return NextResponse.json({ item: updated });
  }

  const message = await prisma.message.findUnique({ where: { id: messageId } });
  if (!message || message.conversationId !== conversation.id) {
    return NextResponse.json({ error: "Sabitlenecek mesaj bulunamadı." }, { status: 404 });
  }

  const updated = await prisma.conversation.update({
    where: { id: conversation.id },
    data: {
      pinnedMessageId: message.id,
      pinnedMessageAt: new Date(),
      pinnedByUserId: session.user.id
    }
  });

  return NextResponse.json({ item: updated });
}

