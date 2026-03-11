// @ts-nocheck
import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { groupConversationCreateSchema } from "@/lib/validations";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });

  const payload = await req.json();
  const parsed = groupConversationCreateSchema.safeParse(payload);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const uniqueParticipantIds = Array.from(
    new Set([session.user.id, ...parsed.data.participantIds.filter((id) => id !== session.user.id)])
  );

  const users = (await prisma.user.findMany()) as Array<{ id: string }>;
  const validIds = new Set(users.map((item) => item.id));
  const missing = uniqueParticipantIds.filter((id) => !validIds.has(id));
  if (missing.length > 0) {
    return NextResponse.json({ error: "Seçilen kullanıcılardan bazıları bulunamadı." }, { status: 400 });
  }

  const conversation = await prisma.conversation.create({
    data: {
      listingId: null,
      buyerId: session.user.id,
      sellerId: session.user.id,
      conversationType: "GROUP",
      contextType: "GROUP",
      contextTitle: parsed.data.groupName,
      groupName: parsed.data.groupName,
      groupDescription: parsed.data.groupDescription || null,
      groupImage: parsed.data.groupImage || null,
      participantIds: uniqueParticipantIds,
      adminIds: [session.user.id],
      createdById: session.user.id,
      lastSeenByUser: { [session.user.id]: new Date().toISOString() }
    }
  });

  return NextResponse.json({ id: conversation.id }, { status: 201 });
}

