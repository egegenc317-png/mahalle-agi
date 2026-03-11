// @ts-nocheck
import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/ratelimit";
import { messageCreateSchema } from "@/lib/validations";

const FILE_JSON_PREFIX = "__FILEJSON__";
const FILE_ONCE_CONSUMED_PREFIX = "__FILE_ONCE_CONSUMED__|";
type ConversationMessage = Awaited<ReturnType<typeof prisma.message.findMany>>[number];

function parseFileBody(body: string): { name: string; url: string; viewOnce: boolean } | null {
  if (body.startsWith(FILE_JSON_PREFIX)) {
    try {
      const parsed = JSON.parse(body.slice(FILE_JSON_PREFIX.length)) as {
        name?: string;
        url?: string;
        viewOnce?: boolean;
      };
      if (!parsed?.url || !parsed?.name) return null;
      return { name: parsed.name, url: parsed.url, viewOnce: Boolean(parsed.viewOnce) };
    } catch {
      return null;
    }
  }

  if (!body.startsWith("__FILE__|")) return null;
  const payload = body.slice("__FILE__|".length);
  const splitIndex = payload.indexOf("|");
  if (splitIndex < 1) return null;
  const name = payload.slice(0, splitIndex).trim();
  const url = payload.slice(splitIndex + 1).trim();
  if (!url) return null;
  return { name: name || "Dosya", url, viewOnce: false };
}

async function canAccess(conversationId: string, userId: string) {
  const conversation = await prisma.conversation.findUnique({ where: { id: conversationId } });
  if (!conversation) return null;
  if (conversation.conversationType === "GROUP") {
    if (!(conversation.participantIds || []).includes(userId)) return null;
    return conversation;
  }
  if (conversation.buyerId !== userId && conversation.sellerId !== userId) return null;
  return conversation;
}

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Yetkişiz" }, { status: 401 });

  const conversation = await canAccess(params.id, session.user.id);
  if (!conversation) return NextResponse.json({ error: "Erisim yok" }, { status: 403 });

  const isGroup = conversation.conversationType === "GROUP";
  const isBuyer = conversation.buyerId === session.user.id;
  const seenValue = new Date();
  const updatedConversation = await prisma.conversation.update({
    where: { id: conversation.id },
    data: isGroup
      ? {
          lastSeenByUser: {
            ...((conversation.lastSeenByUser as Record<string, string> | null) || {}),
            [session.user.id]: seenValue.toISOString()
          }
        }
      : { [isBuyer ? "lastSeenByBuyerAt" : "lastSeenBySellerAt"]: seenValue }
  });

  const items = await prisma.message.findMany({
    where: { conversationId: conversation.id },
    include: { sender: { select: { id: true, name: true } } },
    orderBy: { createdAt: "asc" }
  });
  const sanitizedItems = items.map((item: ConversationMessage) => {
    const fileBody = parseFileBody(item.body);
    if (!fileBody?.viewOnce) return item;

    const consumedAt = isBuyer
      ? (item as { viewOnceConsumedByBuyerAt?: Date | null }).viewOnceConsumedByBuyerAt
      : (item as { viewOnceConsumedBySellerAt?: Date | null }).viewOnceConsumedBySellerAt;
    if (item.senderId !== session.user.id && consumedAt) {
      return { ...item, body: `${FILE_ONCE_CONSUMED_PREFIX}${fileBody.name}` };
    }
    return item;
  });

  const peerLastSeenAt = isGroup
    ? null
    : isBuyer
      ? (updatedConversation as { lastSeenBySellerAt?: Date | null }).lastSeenBySellerAt
      : (updatedConversation as { lastSeenByBuyerAt?: Date | null }).lastSeenByBuyerAt;

  return NextResponse.json({ items: sanitizedItems, peerLastSeenAt: peerLastSeenAt ? peerLastSeenAt.toISOString() : null });
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Yetkişiz" }, { status: 401 });

  const conversation = await canAccess(params.id, session.user.id);
  if (!conversation) return NextResponse.json({ error: "Erisim yok" }, { status: 403 });

  const ip = (req.headers.get("x-forwarded-for") || "local").split(",")[0]?.trim() || "local";
  const rateLimit = await checkRateLimit(`message:${session.user.id}:${conversation.id}:${ip}`, {
    windowMs: 60 * 1000,
    maxAttempts: 40
  });
  if (!rateLimit.ok) {
    return NextResponse.json({ error: "Çok hızlı mesaj gönderiyorsun. Lütfen kısa süre sonra tekrar dene." }, { status: 429 });
  }

  const json = await req.json();
  const parsed = messageCreateSchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const msg = await prisma.message.create({
    data: { conversationId: conversation.id, senderId: session.user.id, body: parsed.data.body }
  });

  return NextResponse.json({ id: msg.id }, { status: 201 });
}


