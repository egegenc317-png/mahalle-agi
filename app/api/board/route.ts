// @ts-nocheck
import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { validatePointInUserScope } from "@/lib/location-scope";
import { geocodeLocationText } from "@/lib/geocode";
import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/ratelimit";
import { canCreateContentByRating, CONTENT_CREATOR_MIN_STARS } from "@/lib/user-rating";
import { boardPostCreateSchema } from "@/lib/validations";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Yetkişiz" }, { status: 401 });
  if (!session.user.locationScope) return NextResponse.json({ error: "Kapsam seçimi gerekli" }, { status: 400 });
  if (!session.user.neighborhoodId) return NextResponse.json({ error: "Mahalle seçimi gerekli" }, { status: 400 });

  const items = await prisma.boardPost.findMany({
    where: { neighborhoodId: session.user.neighborhoodId },
    include: { user: { select: { id: true, name: true } } },
    orderBy: { createdAt: "desc" }
  });

  return NextResponse.json({ items });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Yetkişiz" }, { status: 401 });
  if (!session.user.locationScope) return NextResponse.json({ error: "Kapsam seçimi gerekli" }, { status: 400 });
  if (!session.user.neighborhoodId) return NextResponse.json({ error: "Mahalle seçimi gerekli" }, { status: 400 });

  const ip = (req.headers.get("x-forwarded-for") || "local").split(",")[0]?.trim() || "local";
  const createLimit = await checkRateLimit(`board-create:${session.user.id}:${ip}`, {
    windowMs: 10 * 60 * 1000,
    maxAttempts: 12
  });
  if (!createLimit.ok) {
    const message = "Kısa sürede çok fazla duyuru oluşturdun. Lütfen biraz sonra tekrar dene.";
    if ((req.headers.get("content-type") || "").includes("application/x-www-form-urlencoded")) {
      return NextResponse.redirect(new URL(`/board?error=${encodeURIComponent(message)}`, req.url));
    }
    return NextResponse.json({ error: message }, { status: 429 });
  }

  const contentType = req.headers.get("content-type") || "";

  const ratingAccess = await canCreateContentByRating(session.user.id, session.user.role);
  if (!ratingAccess.ok) {
    const message = `Duyuru oluşturmak için ortalama puan en az ${CONTENT_CREATOR_MIN_STARS.toFixed(1)} / 5 olmalı. Mevcut: ${(ratingAccess.average / 2).toFixed(1)} / 5`;
    if (contentType.includes("application/x-www-form-urlencoded")) {
      return NextResponse.redirect(new URL(`/board?error=${encodeURIComponent(message)}`, req.url));
    }
    return NextResponse.json({ error: message }, { status: 403 });
  }

  const neighborhood = await prisma.neighborhood.findUnique({ where: { id: session.user.neighborhoodId } });

  const payload = contentType.includes("application/x-www-form-urlencoded")
    ? Object.fromEntries((await req.formData()).entries())
    : await req.json();

  const parsed = boardPostCreateSchema.safeParse(payload);
  if (!parsed.success) {
    if (contentType.includes("application/x-www-form-urlencoded")) {
      return NextResponse.redirect(new URL("/board?error=Geçersiz+form+verisi", req.url));
    }
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  let locationLat = parsed.data.locationLat ?? null;
  let locationLng = parsed.data.locationLng ?? null;

  if ((locationLat === null || locationLng === null) && parsed.data.locationText?.trim()) {
    const raw = parsed.data.locationText.trim();
    const query = raw;
    const fallbackQueries = neighborhood
      ? [
          `${raw}, ${neighborhood.district}, ${neighborhood.city}, Turkiye`,
          `${raw}, ${neighborhood.name}, ${neighborhood.district}, ${neighborhood.city}, Turkiye`,
          `${raw}, ${neighborhood.city}, Turkiye`
        ]
      : [];
    const point = await geocodeLocationText(query, fallbackQueries);
    if (point) {
      locationLat = point.lat;
      locationLng = point.lng;
    }
  }

  const hasAnyLocationInput =
    Boolean(parsed.data.locationText?.trim()) ||
    (locationLat !== null && locationLng !== null);

  if (hasAnyLocationInput) {
    if (locationLat === null || locationLng === null) {
      if (contentType.includes("application/x-www-form-urlencoded")) {
        return NextResponse.redirect(new URL("/board?error=Konum+doğrulanamadı", req.url));
      }
      return NextResponse.json({ error: "Konum doğrulanamadı. Konum iznini açıp tekrar deneyin." }, { status: 400 });
    }

    const scopeCheck = await validatePointInUserScope({
      lat: locationLat,
      lng: locationLng,
      neighborhoodId: session.user.neighborhoodId,
      locationScope: session.user.locationScope
    });

    if (!scopeCheck.ok) {
      if (contentType.includes("application/x-www-form-urlencoded")) {
        return NextResponse.redirect(new URL(`/board?error=${encodeURIComponent(scopeCheck.error || "Konum hatası")}`, req.url));
      }
      return NextResponse.json({ error: scopeCheck.error }, { status: 400 });
    }
  }

  const post = await prisma.boardPost.create({
    data: {
      neighborhoodId: session.user.neighborhoodId,
      userId: session.user.id,
      type: parsed.data.type,
      title: parsed.data.title,
      body: parsed.data.body,
      photos: JSON.stringify(parsed.data.photos || []),
      locationText: parsed.data.locationText || null,
      locationLat,
      locationLng
    }
  });

  if (contentType.includes("application/x-www-form-urlencoded")) {
    return NextResponse.redirect(new URL(`/board/${post.id}`, req.url));
  }

  return NextResponse.json({ id: post.id }, { status: 201 });
}






