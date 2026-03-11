// @ts-nocheck
import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getClosedStatus, getIstanbulNow } from "@/lib/shop-hours";

type ConversationLite = {
  id: string;
  buyerId: string;
  sellerId: string;
  contextType?: string;
};

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Yetkişiz" }, { status: 401 });

  const contentType = req.headers.get("content-type") || "";
  const payload = contentType.includes("application/x-www-form-urlencoded")
    ? Object.fromEntries((await req.formData()).entries())
    : await req.json();

  const shopUserId = String(payload.shopUserId || "").trim();
  if (!shopUserId) return NextResponse.json({ error: "İşletme bulunamadı" }, { status: 400 });

  const shopUser = await prisma.user.findUnique({ where: { id: shopUserId } });
  if (!shopUser || shopUser.accountType !== "BUSINESS") {
    return NextResponse.json({ error: "İşletme bulunamadı" }, { status: 404 });
  }
  if (shopUser.id === session.user.id) {
    return NextResponse.json({ error: "Kendi işletmene mesaj atamazsin" }, { status: 400 });
  }

  const now = getIstanbulNow();
  const closed = getClosedStatus(shopUser.businessClosedHours, now.day, now.minutes);
  if (closed.isClosed) {
    const message = "İşletme şu an kapalı. İşletmeye mesaj gönderimi geçici olarak kapalı.";
    if (contentType.includes("application/x-www-form-urlencoded")) {
      return NextResponse.redirect(new URL(`/shop/${shopUser.id}?error=${encodeURIComponent(message)}`, req.url));
    }
    return NextResponse.json({ error: message }, { status: 409 });
  }

  const allMyConversations = await prisma.conversation.findMany({
    where: { OR: [{ buyerId: session.user.id }, { sellerId: session.user.id }] }
  });

  const existingConversation = (allMyConversations as ConversationLite[]).find(
    (c) =>
      c.contextType === "SHOP" &&
      ((c.buyerId === session.user.id && c.sellerId === shopUser.id) ||
        (c.buyerId === shopUser.id && c.sellerId === session.user.id))
  );

  const conversation =
    existingConversation ||
    (await prisma.conversation.create({
      data: {
        listingId: null,
        buyerId: session.user.id,
        sellerId: shopUser.id,
        conversationType: "DIRECT",
        contextType: "SHOP",
        contextTitle: `${shopUser.shopName || `${shopUser.name} Dükkanı`} - İşletme Mesajı`
      }
    }));

  if (contentType.includes("application/x-www-form-urlencoded")) {
    return NextResponse.redirect(new URL(`/messages/${conversation.id}`, req.url));
  }

  return NextResponse.json({ id: conversation.id }, { status: 201 });
}




