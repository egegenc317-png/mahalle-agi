// @ts-nocheck
import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { reportCreateSchema } from "@/lib/validations";
import { checkRateLimit } from "@/lib/ratelimit";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Yetkişiz" }, { status: 401 });

  const ip = (req.headers.get("x-forwarded-for") || "local").split(",")[0].trim();
  if (!(await checkRateLimit(`report:${session.user.id}:${ip}`, { windowMs: 60_000, maxAttempts: 12 })).ok) {
    return NextResponse.json({ error: "Çok fazla şikayet denemesi." }, { status: 429 });
  }

  const contentType = req.headers.get("content-type") || "";
  const payload = contentType.includes("application/x-www-form-urlencoded")
    ? Object.fromEntries((await req.formData()).entries())
    : await req.json();
  const parsed = reportCreateSchema.safeParse(payload);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  if (parsed.data.targetType === "BOARD") {
    const post = await prisma.boardPost.findUnique({ where: { id: parsed.data.targetId } });
    if (!post) {
      return NextResponse.json({ error: "Duyuru bulunamadı" }, { status: 404 });
    }
    if (post.userId === session.user.id) {
      return NextResponse.json({ error: "Kendi duyürünu Şikayet edemezsin" }, { status: 400 });
    }
  }

  const existing = await prisma.report.findMany({
    where: {
      reporterId: session.user.id,
      targetType: parsed.data.targetType,
      targetId: parsed.data.targetId
    }
  });
  if (existing.length > 0) {
    const message = "Bu içerik için daha Önce Şikayet gönderdin.";
    if (contentType.includes("application/x-www-form-urlencoded")) {
      if (parsed.data.targetType === "BOARD") {
        return NextResponse.redirect(new URL(`/board/${parsed.data.targetId}?error=${encodeURIComponent(message)}`, req.url));
      }
      return NextResponse.redirect(new URL(`/?error=${encodeURIComponent(message)}`, req.url));
    }
    return NextResponse.json({ error: message }, { status: 409 });
  }

  const report = await prisma.report.create({
    data: { ...parsed.data, reporterId: session.user.id }
  });

  if (parsed.data.targetType === "BOARD") {
    const openCount = await prisma.report.count({
      where: {
        targetType: "BOARD",
        targetId: parsed.data.targetId,
        status: "OPEN"
      }
    });

    if (openCount >= 3) {
      const post = await prisma.boardPost.findUnique({ where: { id: parsed.data.targetId } });
      if (post) {
        await prisma.boardPost.delete({ where: { id: parsed.data.targetId } });
      }
      if (contentType.includes("application/x-www-form-urlencoded")) {
        return NextResponse.redirect(new URL("/board?success=Duyuru+yeterli+Şikayet+aldığı+için+panodan+kaldırıldı", req.url));
      }
      return NextResponse.json({ id: report.id, autoRemoved: true }, { status: 201 });
    }
  }

  if (contentType.includes("application/x-www-form-urlencoded")) {
    if (parsed.data.targetType === "BOARD") {
      return NextResponse.redirect(new URL(`/board/${parsed.data.targetId}?success=Sikayetin+alindi`, req.url));
    }
    return NextResponse.redirect(new URL("/", req.url));
  }

  return NextResponse.json({ id: report.id }, { status: 201 });
}

