// @ts-nocheck
import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { checkRateLimit } from "@/lib/ratelimit";
import { verifyGroupInvite } from "@/lib/group-invites";
import { prisma } from "@/lib/prisma";

const SYSTEM_MESSAGE_PREFIX = "__SYSTEM__|";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.redirect(new URL("/auth/login", req.url));
  }

  const ip = (req.headers.get("x-forwarded-for") || "local").split(",")[0].trim();
  if (!(await checkRateLimit(`group-join:${session.user.id}:${ip}`, { windowMs: 60_000, maxAttempts: 20 })).ok) {
    return NextResponse.redirect(new URL("/messages?error=Cok+fazla+davet+denemesi", req.url));
  }

  const token = req.nextUrl.searchParams.get("invite");
  if (!token) {
    return NextResponse.redirect(new URL("/messages", req.url));
  }

  const invite = await verifyGroupInvite(token);
  if (!invite) {
    return NextResponse.redirect(new URL("/messages?error=Davet+baglantisi+gecersiz+veya+suresi+dolmus", req.url));
  }

  const conversation = await prisma.conversation.findUnique({ where: { id: invite.conversationId } });
  if (!conversation || conversation.conversationType !== "GROUP") {
    return NextResponse.redirect(new URL("/messages", req.url));
  }

  if ((conversation.participantIds || []).includes(session.user.id)) {
    return NextResponse.redirect(new URL(`/messages/${conversation.id}`, req.url));
  }

  const me = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!me) {
    return NextResponse.redirect(new URL("/auth/login", req.url));
  }

  await prisma.conversation.update({
    where: { id: conversation.id },
    data: {
      participantIds: Array.from(new Set([...(conversation.participantIds || []), session.user.id])),
      lastSeenByUser: {
        ...((conversation.lastSeenByUser as Record<string, string> | null) || {}),
        [session.user.id]: new Date().toISOString()
      }
    }
  });

  await prisma.message.create({
    data: {
      conversationId: conversation.id,
      senderId: session.user.id,
      body: `${SYSTEM_MESSAGE_PREFIX}${me.name} davet bağlantısıyla gruba katıldı.`
    }
  });

  return NextResponse.redirect(new URL(`/messages/${conversation.id}`, req.url));
}

