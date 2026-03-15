// @ts-nocheck
import { redirect } from "next/navigation";
import { MapPin } from "lucide-react";

import { auth } from "@/lib/auth";
import { geocodeLocationText } from "@/lib/geocode";
import { findNeighborhoodByLocation } from "@/lib/neighborhood-geo";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UnifiedNeighborhoodMap } from "@/components/unified-neighborhood-map";

type ListingWithUser = Awaited<ReturnType<typeof prisma.listing.findMany>>[number];
type BoardPostWithUser = Awaited<ReturnType<typeof prisma.boardPost.findMany>>[number];
type BusinessUser = Awaited<ReturnType<typeof prisma.user.findMany>>[number];

function toRad(value: number) {
  return (value * Math.PI) / 180;
}

function distanceKm(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function getEffectiveNeighborhoodRadiusKm(radiusKm?: number | null) {
  const safeRadius = typeof radiusKm === "number" && radiusKm > 0 ? radiusKm : 3;
  return Math.min(Math.max(safeRadius, 1.5), 4);
}

async function resolveNeighborhoodIdForPoint(input: {
  locationLat?: number | null;
  locationLng?: number | null;
  locationText?: string | null;
}) {
  let lat = typeof input.locationLat === "number" ? input.locationLat : null;
  let lng = typeof input.locationLng === "number" ? input.locationLng : null;

  if ((lat === null || lng === null) && input.locationText?.trim()) {
    const point = await geocodeLocationText(input.locationText.trim());
    lat = point?.lat ?? null;
    lng = point?.lng ?? null;
  }

  if (lat === null || lng === null) return null;
  const neighborhood = await findNeighborhoodByLocation(lat, lng);
  return neighborhood?.id ?? null;
}

async function resolveNeighborhoodCenter(neighborhood: {
  id: string;
  city?: string | null;
  district?: string | null;
  name?: string | null;
  lat?: number | null;
  lng?: number | null;
}) {
  if (typeof neighborhood?.lat === "number" && typeof neighborhood?.lng === "number") {
    return { lat: neighborhood.lat, lng: neighborhood.lng };
  }

  const parts = [neighborhood?.name, neighborhood?.district, neighborhood?.city, "Türkiye"].filter(Boolean);
  const point = await geocodeLocationText(parts.join(", "));
  if (!point) return null;

  await prisma.neighborhood.update({
    where: { id: neighborhood.id },
    data: { lat: point.lat, lng: point.lng }
  });

  return point;
}

export default async function MapPage() {
  const session = await auth();
  if (!session) redirect("/auth/login");
  if (!session.user.locationScope) redirect("/onboarding/scope");
  if (!session.user.neighborhoodId) redirect("/onboarding/neighborhood");
  const neighborhoodId = session.user.neighborhoodId;

  const [allListings, allPosts, neighborhood] = await Promise.all([
    prisma.listing.findMany({
      where: { neighborhoodId, status: "ACTIVE" },
      include: { user: { select: { id: true, name: true } } },
      orderBy: { createdAt: "desc" }
    }),
    prisma.boardPost.findMany({
      where: { neighborhoodId },
      include: { user: { select: { id: true, name: true } } },
      orderBy: { createdAt: "desc" }
    }),
    prisma.neighborhood.findUnique({ where: { id: neighborhoodId } })
  ]);
  const businessUsers = await prisma.user.findMany();
  const neighborhoodRadiusKm = getEffectiveNeighborhoodRadiusKm(neighborhood?.radiusKm);
  const neighborhoodCenter = neighborhood ? await resolveNeighborhoodCenter(neighborhood) : null;

  const isInsideCurrentNeighborhoodRadius = (lat?: number | null, lng?: number | null) => {
    if (
      typeof lat !== "number" ||
      typeof lng !== "number" ||
      typeof neighborhoodCenter?.lat !== "number" ||
      typeof neighborhoodCenter?.lng !== "number"
    ) {
      return false;
    }

    return distanceKm(lat, lng, neighborhoodCenter.lat, neighborhoodCenter.lng) <= neighborhoodRadiusKm;
  };

  const listings = allListings.filter(
    (l: ListingWithUser) => Boolean(l.locationText) || (typeof l.locationLat === "number" && typeof l.locationLng === "number")
  );
  const posts = allPosts.filter(
    (p: BoardPostWithUser) => Boolean(p.locationText) || (typeof p.locationLat === "number" && typeof p.locationLng === "number")
  );

  const [postItems, listingItems, businessItems] = await Promise.all([
    Promise.all(
      posts.map(async (post: BoardPostWithUser) => {
        const matchedNeighborhoodId = await resolveNeighborhoodIdForPoint({
          locationLat: typeof post.locationLat === "number" ? post.locationLat : null,
          locationLng: typeof post.locationLng === "number" ? post.locationLng : null,
          locationText: post.locationText ?? null
        });
        if (matchedNeighborhoodId !== neighborhoodId) return null;
        if (!isInsideCurrentNeighborhoodRadius(post.locationLat, post.locationLng)) return null;
        return {
          id: post.id,
          kind: "BOARD" as const,
          type: post.type,
          title: post.title,
          body: post.body,
          userName: post.user.name || "Kullanıcı",
          href: "/board",
          createdAt: new Date(post.createdAt).toISOString(),
          locationText: post.locationText ?? null,
          locationLat: typeof post.locationLat === "number" ? post.locationLat : null,
          locationLng: typeof post.locationLng === "number" ? post.locationLng : null
        };
      })
    ),
    Promise.all(
      listings.map(async (listing: ListingWithUser) => {
        const matchedNeighborhoodId = await resolveNeighborhoodIdForPoint({
          locationLat: typeof listing.locationLat === "number" ? listing.locationLat : null,
          locationLng: typeof listing.locationLng === "number" ? listing.locationLng : null,
          locationText: listing.locationText ?? null
        });
        if (matchedNeighborhoodId !== neighborhoodId) return null;
        if (!isInsideCurrentNeighborhoodRadius(listing.locationLat, listing.locationLng)) return null;
        return {
          id: listing.id,
          kind: "LISTING" as const,
          type: listing.type,
          title: listing.title,
          body: listing.description,
          userName: listing.user.name || "Kullanıcı",
          href: `/listings/${listing.id}`,
          createdAt: new Date(listing.createdAt).toISOString(),
          locationText: listing.locationText ?? null,
          locationLat: typeof listing.locationLat === "number" ? listing.locationLat : null,
          locationLng: typeof listing.locationLng === "number" ? listing.locationLng : null
        };
      })
    ),
    Promise.all(
      businessUsers
        .filter(
          (u: BusinessUser) =>
            u.accountType === "BUSINESS" &&
            (typeof u.shopLocationLat === "number" || Boolean(u.shopLocationText))
        )
        .map(async (u: BusinessUser) => {
        const matchedNeighborhoodId = await resolveNeighborhoodIdForPoint({
          locationLat: u.shopLocationLat ?? null,
          locationLng: u.shopLocationLng ?? null,
          locationText: u.shopLocationText ?? null
        });
        if (matchedNeighborhoodId !== neighborhoodId) return null;
        if (!isInsideCurrentNeighborhoodRadius(u.shopLocationLat, u.shopLocationLng)) return null;
        return {
            id: `shop-${u.id}`,
            kind: "LISTING" as const,
            type: "SHOP",
            title: u.shopName || `${u.name} Dükkanı`,
            body: u.shopLocationText || "İşletme konumu",
            userName: u.name || "İşletme",
            href: `/profile/${u.id}`,
            createdAt: new Date(u.createdAt).toISOString(),
            locationText: u.shopLocationText ?? null,
            locationLat: u.shopLocationLat ?? null,
            locationLng: u.shopLocationLng ?? null,
            imageUrl: u.shopLogo ?? null,
            businessCategory: u.businessCategory ?? null
          };
        })
    )
  ]);

  const mapItems = [...postItems, ...listingItems, ...businessItems].filter(Boolean);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-orange-500" /> Harita
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-sm text-zinc-600">
            {`${neighborhood?.city} / ${neighborhood?.district} / ${neighborhood?.name} mahallesi için konumlu ilan, duyuru ve işletmeler.`}
          </p>
          <p className="text-xs text-zinc-500">
            Konum yenileyince harita ve içerikler otomatik olarak geçtiğin mahalleye göre güncellenir.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Mahallendeki Konumlar ({mapItems.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-3 sm:p-6">
          <UnifiedNeighborhoodMap
            items={mapItems}
            defaultCenter={
              neighborhoodCenter
            }
            maxDistanceKm={neighborhoodRadiusKm}
          />
        </CardContent>
      </Card>
    </div>
  );
}




