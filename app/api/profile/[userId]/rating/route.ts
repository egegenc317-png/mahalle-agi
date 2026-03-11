// @ts-nocheck
import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { userRatingSchema } from "@/lib/validations";

const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export async function POST(req: NextRequest, { params }: { params: { userId: string } }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Yetkişiz" }, { status: 401 });

  if (session.user.id === params.userId) {
    return NextResponse.json({ error: "Kendine puan veremezsin." }, { status: 400 });
  }

  const target = await prisma.user.findUnique({ where: { id: params.userId } });
  if (!target) return NextResponse.json({ error: "Kullanıcı bulunamadı" }, { status: 404 });

  const contentType = req.headers.get("content-type") || "";
  const payload = contentType.includes("application/x-www-form-urlencoded")
    ? Object.fromEntries((await req.formData()).entries())
    : await req.json();

  const parsed = userRatingSchema.safeParse(payload);
  if (!parsed.success) {
    const message = "Geçerli bir puan gir (0-10, 0.5 adım).";
    if (contentType.includes("application/x-www-form-urlencoded")) {
      return NextResponse.redirect(new URL(`/profile/${params.userId}?error=${encodeURIComponent(message)}`, req.url));
    }
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const existing = await prisma.userRating.findFirst({
    where: {
      raterUserId: session.user.id,
      targetUserId: params.userId
    }
  });

  if (!existing) {
    await prisma.userRating.create({
      data: {
        raterUserId: session.user.id,
        targetUserId: params.userId,
        score: parsed.data.score
      }
    });
  } else {
    const diff = Date.now() - new Date(existing.updatedAt).getTime();
    if (diff < ONE_WEEK_MS) {
      const nextChangeAt = new Date(new Date(existing.updatedAt).getTime() + ONE_WEEK_MS);
      const message = `Bu puani haftada bir degistirebilirsin. Sonraki degisim: ${nextChangeAt.toLocaleDateString("tr-TR")}`;
      if (contentType.includes("application/x-www-form-urlencoded")) {
        return NextResponse.redirect(new URL(`/profile/${params.userId}?error=${encodeURIComponent(message)}`, req.url));
      }
      return NextResponse.json({ error: message }, { status: 429 });
    }

    await prisma.userRating.update({
      where: { id: existing.id },
      data: { score: parsed.data.score }
    });
  }

  if (contentType.includes("application/x-www-form-urlencoded")) {
    return NextResponse.redirect(new URL(`/profile/${params.userId}?success=Puan+güncellendi`, req.url));
  }

  return NextResponse.json({ ok: true }, { status: 201 });
}



