// @ts-nocheck
import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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

  const conversation = await prisma.conversation.findUnique({ where: { id: params.id } });
  if (!conversation || !isGroupAdmin(conversation, session.user.id)) {
    return NextResponse.json({ error: "Bu grup için yönetici yetkin yok." }, { status: 403 });
  }

  const payload = (await req.json()) as { groupName?: string; groupImage?: string | null; groupDescription?: string | null };
  const groupName = String(payload.groupName || "").trim();
  const groupImage = typeof payload.groupImage === "string" ? payload.groupImage : null;
  const groupDescription = typeof payload.groupDescription === "string" ? payload.groupDescription.trim() : "";

  if (groupName.length < 3) {
    return NextResponse.json({ error: "Grup adı en az 3 karakter olmalı." }, { status: 400 });
  }

  const updated = await prisma.conversation.update({
    where: { id: conversation.id },
    data: {
      groupName,
      contextTitle: groupName,
      groupImage,
      groupDescription: groupDescription || null
    }
  });

  return NextResponse.json({ item: updated });
}

