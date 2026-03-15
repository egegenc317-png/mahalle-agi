/* eslint-disable @typescript-eslint/no-explicit-any */
// @ts-nocheck
import { getLatestMessagesByConversationIds } from "@/lib/conversation-last-message";
import { prisma } from "@/lib/prisma";

const SYSTEM_MESSAGE_PREFIX = "__SYSTEM__|";

function stripSpecialMessage(body: string) {
  if (body.startsWith(SYSTEM_MESSAGE_PREFIX)) {
    return body.slice(SYSTEM_MESSAGE_PREFIX.length).trim();
  }
  return body;
}

function getMentionToken(me: { username?: string | null; name?: string | null }) {
  if (me.username) return `@${me.username}`;
  if (me.name) return `@${me.name.replace(/\s+/g, "").toLowerCase()}`;
  return null;
}

export async function getLiveNotificationsForUser(userId: string) {
  const me = await prisma.user.findUnique({ where: { id: userId } });
  if (!me) {
    return { status: 404, body: { error: "Kullanıcı bulunamadı" } };
  }

  const [conversations, boardPosts] = await Promise.all([
    prisma.conversation.findMany({
      where: { OR: [{ buyerId: userId }, { sellerId: userId }] },
      include: {
        buyer: { select: { id: true, name: true } },
        seller: { select: { id: true, name: true } }
      },
      orderBy: { createdAt: "desc" }
    }),
    me.neighborhoodId
      ? prisma.boardPost.findMany({
          where: { neighborhoodId: me.neighborhoodId },
          include: { user: { select: { id: true, name: true } } },
          orderBy: { createdAt: "desc" },
          take: 20
        })
      : Promise.resolve([])
  ]);

  const mentionToken = getMentionToken(me);
  const latestMessageMap = await getLatestMessagesByConversationIds(conversations.map((conversation: any) => conversation.id));
  const messageAlertsRaw = conversations.map((conversation: any) => {
    const last = latestMessageMap.get(conversation.id);
    if (!last) return null;

    const mySeenAt =
      conversation.conversationType === "GROUP"
        ? (conversation.lastSeenByUser as Record<string, string> | null)?.[userId] || null
        : conversation.buyerId === userId
          ? conversation.lastSeenByBuyerAt
          : conversation.lastSeenBySellerAt;

    const isUnread =
      last.senderId !== userId &&
      (!mySeenAt || new Date(last.createdAt).getTime() > new Date(mySeenAt).getTime());
    if (!isUnread) return null;

    const peer =
      conversation.conversationType === "GROUP"
        ? conversation.groupName || conversation.contextTitle || "Grup Sohbeti"
        : conversation.buyerId === userId
          ? conversation.seller.name
          : conversation.buyer.name;

    return {
      id: conversation.id,
      peer,
      body: stripSpecialMessage(last.body),
      createdAt: last.createdAt,
      isGroup: conversation.conversationType === "GROUP",
      senderName: last.senderName || "Bir kullanıcı",
      isMention: Boolean(
        conversation.conversationType === "GROUP" &&
        mentionToken &&
        stripSpecialMessage(last.body).includes(mentionToken)
      )
    };
  });

  const lastSeen = me.lastBoardSeenAt ? new Date(me.lastBoardSeenAt).getTime() : 0;
  const boardAlerts = boardPosts
    .filter((post: any) => post.userId !== userId && new Date(post.createdAt).getTime() > lastSeen)
    .map((post: any) => ({
      id: post.id,
      title: post.title,
      userName: post.user.name
    }));

  return {
    status: 200,
    body: {
      messageAlerts: messageAlertsRaw.filter(Boolean),
      boardAlerts
    }
  };
}
