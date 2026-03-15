/* eslint-disable @typescript-eslint/no-explicit-any */
// @ts-nocheck
import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
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

export async function GET() {
  const session = await auth();
  if (!session?.user.id) {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
  }

  const me = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!me) {
    return NextResponse.json({ error: "Kullanıcı bulunamadı" }, { status: 404 });
  }

  const [conversations, boardPosts] = await Promise.all([
    prisma.conversation.findMany({
      where: { OR: [{ buyerId: session.user.id }, { sellerId: session.user.id }] },
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
          ? (conversation.lastSeenByUser as Record<string, string> | null)?.[session.user.id] || null
          : conversation.buyerId === session.user.id
            ? conversation.lastSeenByBuyerAt
            : conversation.lastSeenBySellerAt;

      const isUnread =
        last.senderId !== session.user.id &&
        (!mySeenAt || new Date(last.createdAt).getTime() > new Date(mySeenAt).getTime());
      if (!isUnread) return null;

      const peer =
        conversation.conversationType === "GROUP"
          ? conversation.groupName || conversation.contextTitle || "Grup Sohbeti"
          : conversation.buyerId === session.user.id
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
    .filter((post: any) => post.userId !== session.user.id && new Date(post.createdAt).getTime() > lastSeen)
    .map((post: any) => ({
      id: post.id,
      title: post.title,
      userName: post.user.name
    }));

  return NextResponse.json({
    messageAlerts: messageAlertsRaw.filter(Boolean),
    boardAlerts
  });
}
