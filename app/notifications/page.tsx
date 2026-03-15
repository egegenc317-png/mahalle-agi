// @ts-nocheck
import { redirect } from "next/navigation";
import { Bell } from "lucide-react";

import { auth } from "@/lib/auth";
import { getLatestMessagesByConversationIds } from "@/lib/conversation-last-message";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LiveNotificationsPanel } from "@/components/live-notifications-panel";

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

export default async function NotificationsPage() {
  const session = await auth();
  if (!session) redirect("/auth/login");

  const me = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!me) redirect("/auth/login");

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

  const latestMessageMap = await getLatestMessagesByConversationIds(conversations.map((conversation) => conversation.id));
  const messageAlertsRaw = conversations.map((conversation) => {
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
          getMentionToken(me) &&
          stripSpecialMessage(last.body).includes(getMentionToken(me) as string)
        )
      };
    });
  const messageAlerts = messageAlertsRaw.filter(Boolean) as Array<{
    id: string;
    peer: string;
    body: string;
    createdAt: Date;
    isGroup?: boolean;
    senderName: string;
    isMention: boolean;
  }>;

  const lastSeen = me.lastBoardSeenAt ? new Date(me.lastBoardSeenAt).getTime() : 0;
  const boardAlerts = boardPosts.filter(
    (post) => post.userId !== session.user.id && new Date(post.createdAt).getTime() > lastSeen
  );

  return (
    <Card className="overflow-hidden rounded-[24px] border-amber-200 bg-gradient-to-b from-[#fff7eb] to-white shadow-sm sm:rounded-[28px]">
      <CardHeader className="border-b border-amber-100 bg-gradient-to-r from-amber-50 to-orange-50 p-4 sm:p-6">
        <CardTitle className="inline-flex items-center gap-2 text-zinc-900">
          <Bell className="h-5 w-5 text-orange-500" />
          Bildirimler
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <LiveNotificationsPanel
          initialMessageAlerts={messageAlerts}
          initialBoardAlerts={boardAlerts.map((post) => ({
            id: post.id,
            title: post.title,
            userName: post.user.name
          }))}
        />
      </CardContent>
    </Card>
  );
}




