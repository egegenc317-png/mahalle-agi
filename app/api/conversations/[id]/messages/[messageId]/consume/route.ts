// @ts-nocheck
import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const FILE_JSON_PREFIX = "__FILEJSON__";

function isViewOnceFile(body: string) {
  if (!body.startsWith(FILE_JSON_PREFIX)) return false;
  try {
    const parsed = JSON.parse(body.slice(FILE_JSON_PREFIX.length)) as { viewOnce?: boolean };
    return Boolean(parsed?.viewOnce);
  } catch {
    return false;
  }
}

export async function POST(_: Request, { params }: { params: { id: string; messageId: string } }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Yetkişiz" }, { status: 401 });

  const conversation = await prisma.conversation.findUnique({ where: { id: params.id } });
  if (!conversation) return NextResponse.json({ error: "Konuşma bulunamadı" }, { status: 404 });
  const canAccess =
    conversation.conversationType === "GROUP"
      ? (conversation.participantIds || []).includes(session.user.id)
      : conversation.buyerId === session.user.id || conversation.sellerId === session.user.id;
  if (!canAccess) {
    return NextResponse.json({ error: "Erisim yok" }, { status: 403 });
  }

  const message = await prisma.message.findUnique({ where: { id: params.messageId } });
  if (!message || message.conversationId !== conversation.id) {
    return NextResponse.json({ error: "Mesaj bulunamadı" }, { status: 404 });
  }
  if (message.senderId === session.user.id) {
    return NextResponse.json({ ok: true });
  }
  if (!isViewOnceFile(message.body)) {
    return NextResponse.json({ ok: true });
  }

  const isBuyer = conversation.buyerId === session.user.id;
  const data = isBuyer ? { viewOnceConsumedByBuyerAt: new Date() } : { viewOnceConsumedBySellerAt: new Date() };
  await prisma.message.update({ where: { id: message.id }, data });
  return NextResponse.json({ ok: true });
}



