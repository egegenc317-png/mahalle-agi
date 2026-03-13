// @ts-nocheck
import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
  if (!session.user.neighborhoodId) return NextResponse.json({ error: "Mahalle seçimi gerekli" }, { status: 400 });

  const post = await prisma.flowPost.findUnique({ where: { id: params.id }, include: { user: true } });
  if (!post || post.neighborhoodId !== session.user.neighborhoodId) {
    return NextResponse.json({ error: "Paylaşım bulunamadı." }, { status: 404 });
  }

  const existing = await prisma.flowPostLike.findFirst({
    where: { postId: params.id, userId: session.user.id }
  });

  if (existing) {
    await prisma.flowPostLike.delete({ where: { id: existing.id } });
    return NextResponse.json({ liked: false });
  }

  await prisma.flowPostLike.create({
    data: { postId: params.id, userId: session.user.id }
  });

  return NextResponse.json({ liked: true });
}
