// @ts-nocheck
import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/ratelimit";
import { canCreateContentByRating, CONTENT_CREATOR_MIN_STARS } from "@/lib/user-rating";
import { flowPostCreateSchema } from "@/lib/validations";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
  if (!session.user.neighborhoodId) return NextResponse.json({ error: "Mahalle seçimi gerekli" }, { status: 400 });

  const items = await prisma.flowPost.findMany({
    where: { neighborhoodId: session.user.neighborhoodId },
    include: { user: true },
    orderBy: { createdAt: "desc" },
    take: 60
  });

  return NextResponse.json({ items });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
  if (!session.user.neighborhoodId) return NextResponse.json({ error: "Mahalle seçimi gerekli" }, { status: 400 });

  const ip = (req.headers.get("x-forwarded-for") || "local").split(",")[0]?.trim() || "local";
  const limit = await checkRateLimit(`flow-create:${session.user.id}:${ip}`, {
    windowMs: 10 * 60 * 1000,
    maxAttempts: 20
  });
  if (!limit.ok) {
    return NextResponse.json({ error: "Kısa sürede çok fazla paylaşım yaptın. Biraz sonra tekrar dene." }, { status: 429 });
  }

  const ratingAccess = await canCreateContentByRating(session.user.id, session.user.role);
  if (!ratingAccess.ok) {
    return NextResponse.json({
      error: `Akışta paylaşım yapmak için ortalama puan en az ${CONTENT_CREATOR_MIN_STARS.toFixed(1)} / 5 olmalı. Mevcut: ${(ratingAccess.average / 2).toFixed(1)} / 5`
    }, { status: 403 });
  }

  const payload = await req.json();
  const parsed = flowPostCreateSchema.safeParse(payload);
  if (!parsed.success) {
    const first = parsed.error.issues[0]?.message || "Geçersiz paylaşım verisi.";
    return NextResponse.json({ error: first }, { status: 400 });
  }

  const post = await prisma.flowPost.create({
    data: {
      neighborhoodId: session.user.neighborhoodId,
      userId: session.user.id,
      body: parsed.data.body,
      photos: parsed.data.photos || []
    }
  });

  return NextResponse.json({ id: post.id }, { status: 201 });
}
