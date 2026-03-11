// @ts-nocheck
import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type ConversationView = {
  id: string;
  buyerId: string;
  sellerId: string;
  contextType?: string;
  listingId?: string | null;
  createdAt?: Date;
};

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.redirect(new URL("/auth/login", req.url));
  }

  const userId = req.nextUrl.searchParams.get("userId") || "";
  const contextTitle = req.nextUrl.searchParams.get("contextTitle") || "Direkt Sohbet";

  if (!userId) {
    return NextResponse.redirect(new URL("/messages", req.url));
  }

  const peer = await prisma.user.findUnique({ where: { id: userId } });
  if (!peer || peer.id === session.user.id) {
    return NextResponse.redirect(new URL("/messages", req.url));
  }

  const allMyConversations = await prisma.conversation.findMany({
    where: { OR: [{ buyerId: session.user.id }, { sellerId: session.user.id }] }
  });

  const directMatches = (allMyConversations as ConversationView[]).filter(
    (c) =>
      !c.listingId &&
      ((c.buyerId === session.user.id && c.sellerId === peer.id) ||
        (c.buyerId === peer.id && c.sellerId === session.user.id))
  );
  let conversation = directMatches.sort((a, b) => +new Date(b.createdAt || 0) - +new Date(a.createdAt || 0))[0];

  if (!conversation) {
    conversation = await prisma.conversation.create({
      data: {
        listingId: null,
        buyerId: session.user.id,
        sellerId: peer.id,
        conversationType: "DIRECT",
        contextType: "BOARD",
        contextTitle
      }
    });
  }

  return NextResponse.redirect(new URL(`/messages/${conversation.id}`, req.url));
}

