// @ts-nocheck
import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { geocodeLocationText } from "@/lib/geocode";
import { validatePointInUserScope } from "@/lib/location-scope";
import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/ratelimit";
import { listingCreateSchema } from "@/lib/validations";

export async function GET(req: NextRequest) {
  const session = await auth();
  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type");
  const q = searchParams.get("q");
  const category = searchParams.get("category");
  const minPrice = searchParams.get("minPrice");
  const maxPrice = searchParams.get("maxPrice");
  const sort = searchParams.get("sort") || "newest";
  const page = Math.max(1, Number(searchParams.get("page") || "1") || 1);
  const pageSize = Math.min(24, Math.max(6, Number(searchParams.get("pageSize") || "12") || 12));
  const skip = (page - 1) * pageSize;

  const where: Record<string, unknown> = { status: "ACTIVE" };
  if (type) where.type = type;
  if (category) where.category = category;
  if (session?.user?.neighborhoodId) where.neighborhoodId = session.user.neighborhoodId;
  if (q) where.OR = [{ title: { contains: q, mode: "insensitive" } }, { description: { contains: q, mode: "insensitive" } }];
  if (minPrice || maxPrice) where.price = { gte: minPrice ? Number(minPrice) : undefined, lte: maxPrice ? Number(maxPrice) : undefined };

  const [items, total] = await Promise.all([
    prisma.listing.findMany({
      where,
      include: { user: { select: { id: true, name: true, username: true, image: true } } },
      orderBy: sort === "oldest" ? { createdAt: "asc" } : { createdAt: "desc" },
      take: pageSize,
      skip
    }),
    prisma.listing.count({ where })
  ]);

  return NextResponse.json({ items, total, page, pageSize, hasMore: skip + items.length < total });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Yetkişiz" }, { status: 401 });

  const ip = (req.headers.get("x-forwarded-for") || "local").split(",")[0]?.trim() || "local";
  const createLimit = await checkRateLimit(`listing-create:${session.user.id}:${ip}`, {
    windowMs: 10 * 60 * 1000,
    maxAttempts: 10
  });
  if (!createLimit.ok) {
    return NextResponse.json({ error: "Kısa sürede çok fazla ilan oluşturdun. Lütfen biraz sonra tekrar dene." }, { status: 429 });
  }

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user?.neighborhoodId) return NextResponse.json({ error: "Mahalle doğrulayın" }, { status: 400 });
  const neighborhood = await prisma.neighborhood.findUnique({ where: { id: user.neighborhoodId } });

  const json = await req.json();
  const parsed = listingCreateSchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

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
      locationLat = null;
      locationLng = null;
    } else {
      const scopeCheck = await validatePointInUserScope({
        lat: locationLat,
        lng: locationLng,
        neighborhoodId: user.neighborhoodId,
        locationScope: session.user.locationScope || "NEIGHBORHOOD"
      });

      if (!scopeCheck.ok) {
        locationLat = null;
        locationLng = null;
      }
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





