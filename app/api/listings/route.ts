// @ts-nocheck
import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { geocodeLocationText } from "@/lib/geocode";
import { validatePointInUserScope } from "@/lib/location-scope";
import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/ratelimit";
import { canCreateContentByRating, CONTENT_CREATOR_MIN_STARS } from "@/lib/user-rating";
import { listingCreateSchema } from "@/lib/validations";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type");
  const q = searchParams.get("q");
  const category = searchParams.get("category");
  const minPrice = searchParams.get("minPrice");
  const maxPrice = searchParams.get("maxPrice");
  const sort = searchParams.get("sort") || "newest";

  const where: Record<string, unknown> = { status: "ACTIVE" };
  if (type) where.type = type;
  if (category) where.category = category;
  if (q) where.OR = [{ title: { contains: q, mode: "insensitive" } }, { description: { contains: q, mode: "insensitive" } }];
  if (minPrice || maxPrice) where.price = { gte: minPrice ? Number(minPrice) : undefined, lte: maxPrice ? Number(maxPrice) : undefined };

  const items = await prisma.listing.findMany({
    where,
    include: { user: { select: { id: true, name: true } } },
    orderBy: sort === "oldest" ? { createdAt: "asc" } : { createdAt: "desc" }
  });

  return NextResponse.json({ items });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Yetkişiz" }, { status: 401 });
  if (!session.user.locationScope) return NextResponse.json({ error: "Kapsam seçimi gerekli" }, { status: 400 });

  const ip = (req.headers.get("x-forwarded-for") || "local").split(",")[0]?.trim() || "local";
  const createLimit = await checkRateLimit(`listing-create:${session.user.id}:${ip}`, {
    windowMs: 10 * 60 * 1000,
    maxAttempts: 10
  });
  if (!createLimit.ok) {
    return NextResponse.json({ error: "Kısa sürede çok fazla ilan oluşturdun. Lütfen biraz sonra tekrar dene." }, { status: 429 });
  }

  const ratingAccess = await canCreateContentByRating(session.user.id, session.user.role);
  if (!ratingAccess.ok) {
    return NextResponse.json(
      {
        error: `İlan oluşturmak için ortalama puanın en az ${CONTENT_CREATOR_MIN_STARS.toFixed(1)} / 5 olması gerekiyor. Mevcut: ${(ratingAccess.average / 2).toFixed(1)} / 5`
      },
      { status: 403 }
    );
  }

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user?.neighborhoodId) return NextResponse.json({ error: "Mahalle doğrulayın" }, { status: 400 });
  const neighborhood = await prisma.neighborhood.findUnique({ where: { id: user.neighborhoodId } });

  const json = await req.json();
  const parsed = listingCreateSchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const isBusiness = user.accountType === "BUSINESS";
  const hasShop = Boolean(user.shopName || (typeof user.shopLocationLat === "number" && typeof user.shopLocationLng === "number"));
  const isShopListing = parsed.data.type === "PRODUCT" || parsed.data.type === "SERVICE";

  if (!isBusiness && isShopListing) {
    return NextResponse.json({ error: "Sadece işletme sahipleri ürün veya hizmet ilanı açabilir." }, { status: 403 });
  }
  if (isBusiness && isShopListing && !hasShop) {
    return NextResponse.json({ error: "Ürün veya hizmet ilanı için Önce Dükkan bilgilerini tamamlamalısın." }, { status: 403 });
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
      return NextResponse.json({ error: "Konum doğrulanamadı. Konum iznini açıp tekrar deneyin." }, { status: 400 });
    }

    const scopeCheck = await validatePointInUserScope({
      lat: locationLat,
      lng: locationLng,
      neighborhoodId: user.neighborhoodId,
      locationScope: session.user.locationScope
    });

    if (!scopeCheck.ok) {
      return NextResponse.json({ error: scopeCheck.error }, { status: 400 });
    }
  }

  const listing = await prisma.listing.create({
    data: {
      ...parsed.data,
      photos: JSON.stringify(parsed.data.photos),
      locationText: parsed.data.locationText || null,
      locationLat,
      locationLng,
      userId: session.user.id,
      neighborhoodId: user.neighborhoodId
    }
  });

  return NextResponse.json({ id: listing.id }, { status: 201 });
}





