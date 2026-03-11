// @ts-nocheck
import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.redirect(new URL("/auth/login", req.url));

  const type = req.nextUrl.searchParams.get("type");

  if (type === "message") {
    const conversationId = req.nextUrl.searchParams.get("conversationId") || "";
    const conversation = await prisma.conversation.findUnique({ where: { id: conversationId } });
    if (!conversation) return NextResponse.redirect(new URL("/notifications", req.url));
    const canAccess =
      conversation.conversationType === "GROUP"
        ? (conversation.participantIds || []).includes(session.user.id)
        : conversation.buyerId === session.user.id || conversation.sellerId === session.user.id;
    if (!canAccess) {
      return NextResponse.redirect(new URL("/notifications", req.url));
    }

    await prisma.conversation.update({
      where: { id: conversation.id },
      data:
        conversation.conversationType === "GROUP"
          ? {
              lastSeenByUser: {
                ...((conversation.lastSeenByUser as Record<string, string> | null) || {}),
                [session.user.id]: new Date().toISOString()
              }
            }
          : {
              [conversation.buyerId === session.user.id ? "lastSeenByBuyerAt" : "lastSeenBySellerAt"]: new Date()
            }
    });
    return NextResponse.redirect(new URL(`/messages/${conversation.id}`, req.url));
  }

  if (type === "board") {
    const postId = req.nextUrl.searchParams.get("postId") || "";
    const me = await prisma.user.findUnique({ where: { id: session.user.id } });
    if (me) {
      const seen = new Set(me.seenBoardPostIds || []);
      if (postId) seen.add(postId);
      await prisma.user.update({
        where: { id: session.user.id },
        data: { lastBoardSeenAt: new Date(), seenBoardPostIds: Array.from(seen) }
      });
    }
    return NextResponse.redirect(new URL(postId ? `/board/${postId}` : "/board", req.url));
  }

  return NextResponse.redirect(new URL("/notifications", req.url));
}

