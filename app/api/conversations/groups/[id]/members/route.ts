// @ts-nocheck
import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const SYSTEM_MESSAGE_PREFIX = "__SYSTEM__|";

function isGroupAdmin(conversation: {
  conversationType?: string | null;
  participantIds?: string[] | null;
  adminIds?: string[] | null;
}, userId: string) {
  return conversation.conversationType === "GROUP" && (conversation.participantIds || []).includes(userId) && (conversation.adminIds || []).includes(userId);
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
  const sessionUserId = session.user.id;

  const conversation = await prisma.conversation.findUnique({ where: { id: params.id } });
  if (!conversation || conversation.conversationType !== "GROUP" || !(conversation.participantIds || []).includes(sessionUserId)) {
    return NextResponse.json({ error: "Bu gruba erişimin yok." }, { status: 403 });
  }
  const groupConversation = conversation;

  const payload = (await req.json()) as { action?: "promote" | "demote" | "remove" | "add" | "leave"; userId?: string };
  const targetUserId = String(payload.userId || "");
  const participantIds = [...(conversation.participantIds || [])];
  let adminIds = Array.from(new Set(conversation.adminIds || [conversation.createdById || sessionUserId].filter(Boolean)));
  const action = payload.action;
  const isAdmin = isGroupAdmin(conversation, sessionUserId);
  const users = (await prisma.user.findMany()) as Array<{ id: string; name: string }>;
  const actor = users.find((user) => user.id === sessionUserId);
  const actorName = actor?.name || "Bir kullanıcı";

  async function writeSystemMessage(text: string) {
    await prisma.message.create({
      data: {
        conversationId: groupConversation.id,
        senderId: sessionUserId,
        body: `${SYSTEM_MESSAGE_PREFIX}${text}`
      }
    });
  }

  if (action === "add") {
    if (!isAdmin) {
      return NextResponse.json({ error: "Bu grup için yönetici yetkin yok." }, { status: 403 });
    }
    if (!targetUserId) return NextResponse.json({ error: "Geçerli bir kullanıcı seç." }, { status: 400 });
    if (participantIds.includes(targetUserId)) {
      return NextResponse.json({ error: "Bu kullanıcı zaten grupta." }, { status: 400 });
    }
    const targetUser = users.find((user) => user.id === targetUserId);
    if (!targetUser) {
      return NextResponse.json({ error: "Kullanıcı bulunamadı." }, { status: 404 });
    }
    const updated = await prisma.conversation.update({
      where: { id: groupConversation.id },
      data: {
        participantIds: [...participantIds, targetUserId],
        lastSeenByUser: {
          ...((groupConversation.lastSeenByUser as Record<string, string> | null) || {}),
          [targetUserId]: new Date().toISOString()
        }
      }
    });
    await writeSystemMessage(`${actorName}, ${targetUser.name} kişisini gruba ekledi.`);
    return NextResponse.json({ item: updated });
  }

  if (action === "leave") {
    const nextParticipantIds = participantIds.filter((id) => id !== sessionUserId);
    if (nextParticipantIds.length < 2) {
      return NextResponse.json({ error: "Grupta en az 2 kişi kalmalı." }, { status: 400 });
    }
    const nextAdminIds = adminIds.filter((id) => id !== sessionUserId);
    const finalAdminIds = nextAdminIds.length > 0 ? nextAdminIds : [nextParticipantIds[0]];
    const updated = await prisma.conversation.update({
      where: { id: groupConversation.id },
      data: {
        participantIds: nextParticipantIds,
        adminIds: finalAdminIds,
        lastSeenByUser: Object.fromEntries(
          Object.entries((groupConversation.lastSeenByUser as Record<string, string> | null) || {}).filter(([key]) => key !== sessionUserId)
        )
      }
    });
    await writeSystemMessage(`${actorName} gruptan ayrıldı.`);
    return NextResponse.json({ item: updated });
  }

  if (!isAdmin) {
    return NextResponse.json({ error: "Bu grup için yönetici yetkin yok." }, { status: 403 });
  }

  if (!targetUserId || !(groupConversation.participantIds || []).includes(targetUserId)) {
    return NextResponse.json({ error: "Geçerli bir grup üyesi seç." }, { status: 400 });
  }
  const targetUser = users.find((user) => user.id === targetUserId);
  const targetName = targetUser?.name || "Bu kullanıcı";

  if (action === "promote") {
    adminIds = Array.from(new Set([...adminIds, targetUserId]));
    await writeSystemMessage(`${actorName}, ${targetName} kişisini yönetici yaptı.`);
  } else if (action === "demote") {
    if (targetUserId === sessionUserId && adminIds.length === 1) {
      return NextResponse.json({ error: "Son yönetici kendini düşüremez." }, { status: 400 });
    }
    adminIds = adminIds.filter((id) => id !== targetUserId);
    if (adminIds.length === 0) {
      return NextResponse.json({ error: "Grupta en az 1 yönetici kalmalı." }, { status: 400 });
    }
    await writeSystemMessage(`${actorName}, ${targetName} kişisinin yönetici yetkisini aldı.`);
  } else if (action === "remove") {
    const nextParticipantIds = participantIds.filter((id) => id !== targetUserId);
    if (nextParticipantIds.length < 2) {
      return NextResponse.json({ error: "Grupta en az 2 kişi kalmalı." }, { status: 400 });
    }
    const nextAdminIds = adminIds.filter((id) => id !== targetUserId);
    if (nextAdminIds.length === 0) {
      const fallbackAdmin = nextParticipantIds[0];
      adminIds = fallbackAdmin ? [fallbackAdmin] : [];
    } else {
      adminIds = nextAdminIds;
    }
    const updated = await prisma.conversation.update({
      where: { id: groupConversation.id },
      data: {
        participantIds: nextParticipantIds,
        adminIds,
        lastSeenByUser: Object.fromEntries(
          Object.entries((groupConversation.lastSeenByUser as Record<string, string> | null) || {}).filter(([key]) => key !== targetUserId)
        )
      }
    });
    await writeSystemMessage(`${actorName}, ${targetName} kişisini gruptan çıkardı.`);
    return NextResponse.json({ item: updated });
  } else {
    return NextResponse.json({ error: "Geçersiz işlem." }, { status: 400 });
  }

  const updated = await prisma.conversation.update({
    where: { id: groupConversation.id },
    data: { adminIds }
  });
  return NextResponse.json({ item: updated });
}

