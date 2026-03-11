// @ts-nocheck
import Link from "next/link";
import { redirect } from "next/navigation";
import { Bell, Megaphone, MessageCircle } from "lucide-react";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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

  const messageAlertsRaw = await Promise.all(
    conversations.map(async (conversation) => {
      const msgs = await prisma.message.findMany({
        where: { conversationId: conversation.id },
        include: { sender: { select: { id: true, name: true } } },
        orderBy: { createdAt: "asc" }
      });
      const last = msgs.length > 0 ? msgs[msgs.length - 1] : null;
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
        senderName: (last as { sender?: { name?: string } }).sender?.name || "Bir kullanıcı",
        isMention: Boolean(
          conversation.conversationType === "GROUP" &&
          getMentionToken(me) &&
          stripSpecialMessage(last.body).includes(getMentionToken(me) as string)
        )
      };
    })
  );
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
      <CardContent className="space-y-4 p-3 sm:p-4">
        {messageAlerts.length === 0 && boardAlerts.length === 0 ? (
          <p className="rounded-xl border border-dashed border-amber-200 bg-white p-4 text-sm text-zinc-500">
            Yeni bildirim yok.
          </p>
        ) : null}

        {messageAlerts.length > 0 ? (
          <section className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Yeni Mesajlar</p>
            {messageAlerts.map((item) => (
              <Link
                key={item.id}
                href={`/api/notifications/open?type=message&conversationId=${encodeURIComponent(item.id)}`}
                className="block rounded-xl border border-amber-200 bg-amber-50/40 p-3 transition hover:bg-amber-100/40"
              >
                <p className="inline-flex items-center gap-2 text-sm font-semibold text-zinc-900">
                  <MessageCircle className="h-4 w-4 text-orange-500" />
                  {item.isGroup
                    ? item.isMention
                      ? `${item.senderName}, ${item.peer} grubunda seni etiketledi`
                      : `${item.peer} grubunda yeni mesaj var`
                    : `${item.peer} kişisi sana bir mesaj gönderdi`}
                </p>
                <p className="mt-1 truncate text-sm text-zinc-700">{item.body}</p>
              </Link>
            ))}
          </section>
        ) : null}

        {boardAlerts.length > 0 ? (
          <section className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Yeni Duyurular</p>
            {boardAlerts.map((post) => (
              <Link
                key={post.id}
                href={`/api/notifications/open?type=board&postId=${encodeURIComponent(post.id)}`}
                className="block rounded-xl border border-amber-200 bg-white p-3 transition hover:bg-amber-50"
              >
                <p className="inline-flex items-center gap-2 text-sm font-semibold text-zinc-900">
                  <Megaphone className="h-4 w-4 text-orange-500" />
                  {post.user.name} kişisi yeni bir duyuru yayinladı
                </p>
                <p className="mt-1 truncate text-sm text-zinc-700">{post.title}</p>
              </Link>
            ))}
          </section>
        ) : null}
      </CardContent>
    </Card>
  );
}




