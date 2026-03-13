/* eslint-disable @typescript-eslint/no-explicit-any */
// @ts-nocheck
import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();

  if (!session?.user.id) {
    return NextResponse.json({ unreadCount: 0 });
  }

  const dbUser = await prisma.user.findUnique({ where: { id: session.user.id } });
  let unreadMessageCount = 0;
  let unreadBoardCount = 0;

  const myConversations = await prisma.conversation.findMany({
    where: { OR: [{ buyerId: session.user.id }, { sellerId: session.user.id }] }
  });

  const latestMessages = await Promise.all(
    myConversations.map(async (conversation: any) => {
      const msgs = await prisma.message.findMany({
        where: { conversationId: conversation.id },
        orderBy: { createdAt: "asc" }
      });
      const last = msgs.length > 0 ? msgs[msgs.length - 1] : null;
      if (!last) return 0;
      const mySeenAt =
        conversation.conversationType === "GROUP"
          ? (conversation.lastSeenByUser as Record<string, string> | null)?.[session.user.id] || null
          : conversation.buyerId === session.user.id
            ? conversation.lastSeenByBuyerAt
            : conversation.lastSeenBySellerAt;
      const unread = last.senderId !== session.user.id && (!mySeenAt || new Date(last.createdAt).getTime() > new Date(mySeenAt).getTime());
      return unread ? 1 : 0;
    })
  );

  unreadMessageCount = latestMessages.reduce<number>((sum, item) => sum + item, 0);

  if (dbUser?.neighborhoodId) {
    const newBoardPosts = await prisma.boardPost.findMany({
      where: { neighborhoodId: dbUser.neighborhoodId },
      orderBy: { createdAt: "desc" },
      take: 20
    });
    const seenIds = new Set(dbUser.seenBoardPostIds || []);
    unreadBoardCount = newBoardPosts.filter((post: any) => post.userId !== session.user.id && !seenIds.has(post.id)).length;
  }

  return NextResponse.json({ unreadCount: unreadMessageCount + unreadBoardCount });
}
