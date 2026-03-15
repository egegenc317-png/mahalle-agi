// @ts-nocheck
import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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

  const directMatches = await prisma.conversation.findMany({
    where: {
      listingId: null,
      OR: [
        { buyerId: session.user.id, sellerId: peer.id },
        { buyerId: peer.id, sellerId: session.user.id }
      ]
    },
    orderBy: { createdAt: "desc" }
  });
  let conversation = directMatches[0];

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

