/* eslint-disable @typescript-eslint/no-explicit-any */
// @ts-nocheck
import { prisma } from "@/lib/prisma";

const FILE_JSON_PREFIX = "__FILEJSON__";
const FILE_ONCE_CONSUMED_PREFIX = "__FILE_ONCE_CONSUMED__|";

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

export async function getConversationMessagesSnapshot(conversationId: string, userId: string) {
  const conversation = await prisma.conversation.findUnique({ where: { id: conversationId } });
  if (!conversation) return { status: 404, body: { error: "Konuşma bulunamadı" } };

  if (conversation.conversationType === "GROUP") {
    if (!(conversation.participantIds || []).includes(userId)) {
      return { status: 403, body: { error: "Erisim yok" } };
    }
  } else if (conversation.buyerId !== userId && conversation.sellerId !== userId) {
    return { status: 403, body: { error: "Erisim yok" } };
  }

  const isGroup = conversation.conversationType === "GROUP";
  const isBuyer = conversation.buyerId === userId;
  const seenValue = new Date();
  const updatedConversation = await prisma.conversation.update({
    where: { id: conversation.id },
    data: isGroup
      ? {
          lastSeenByUser: {
            ...((conversation.lastSeenByUser as Record<string, string> | null) || {}),
            [userId]: seenValue.toISOString()
          }
        }
      : { [isBuyer ? "lastSeenByBuyerAt" : "lastSeenBySellerAt"]: seenValue }
  });

  const items = await prisma.message.findMany({
    where: { conversationId: conversation.id },
    include: { sender: { select: { id: true, name: true } } },
    orderBy: { createdAt: "asc" }
  });

  const sanitizedItems = items.map((item: any) => {
    const fileBody = parseFileBody(item.body);
    if (!fileBody?.viewOnce) return item;

    const consumedAt = isBuyer ? item.viewOnceConsumedByBuyerAt : item.viewOnceConsumedBySellerAt;
    if (item.senderId !== userId && consumedAt) {
      return { ...item, body: `${FILE_ONCE_CONSUMED_PREFIX}${fileBody.name}` };
    }
    return item;
  });

  const peerLastSeenAt = isGroup
    ? null
    : isBuyer
      ? updatedConversation.lastSeenBySellerAt
      : updatedConversation.lastSeenByBuyerAt;

  return {
    status: 200,
    body: {
      items: sanitizedItems,
      peerLastSeenAt: peerLastSeenAt ? peerLastSeenAt.toISOString() : null
    }
  };
}
