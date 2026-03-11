// @ts-nocheck
import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { checkRateLimit } from "@/lib/ratelimit";
import { createGroupInvite, revokeGroupInvite } from "@/lib/group-invites";
import { prisma } from "@/lib/prisma";

function isGroupAdmin(conversation: {
  conversationType?: string | null;
  participantIds?: string[] | null;
  adminIds?: string[] | null;
}, userId: string) {
  return conversation.conversationType === "GROUP" && (conversation.participantIds || []).includes(userId) && (conversation.adminIds || []).includes(userId);
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
  const ip = (req.headers.get("x-forwarded-for") || "local").split(",")[0].trim();
  if (!(await checkRateLimit(`group-invite:${session.user.id}:${params.id}:${ip}`, { windowMs: 60_000, maxAttempts: 10 })).ok) {
    return NextResponse.json({ error: "Çok kısa sürede fazla davet bağlantısı ürettin." }, { status: 429 });
  }

  const conversation = await prisma.conversation.findUnique({ where: { id: params.id } });
  if (!conversation || !isGroupAdmin(conversation, session.user.id)) {
    return NextResponse.json({ error: "Bu grup için davet yetkin yok." }, { status: 403 });
  }

  await revokeGroupInvite(conversation.id);
  const invite = await createGroupInvite(conversation.id, session.user.id);
  const baseUrl = process.env.NEXTAUTH_URL || new URL(req.url).origin;
  return NextResponse.json({
    inviteUrl: `${baseUrl}/api/conversations/groups/join?invite=${encodeURIComponent(invite.token)}`,
    expiresAt: invite.expiresAt
  });
}

