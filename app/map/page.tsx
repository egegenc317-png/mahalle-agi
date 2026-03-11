// @ts-nocheck
import { redirect } from "next/navigation";
import { MapPin } from "lucide-react";

import { auth } from "@/lib/auth";
import { resolveScopeNeighborhoodIds } from "@/lib/location-scope";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UnifiedNeighborhoodMap } from "@/components/unified-neighborhood-map";

type ListingWithUser = Awaited<ReturnType<typeof prisma.listing.findMany>>[number];
type BoardPostWithUser = Awaited<ReturnType<typeof prisma.boardPost.findMany>>[number];
type BusinessUser = Awaited<ReturnType<typeof prisma.user.findMany>>[number];

export default async function MapPage() {
  const session = await auth();
  if (!session) redirect("/auth/login");
  if (!session.user.locationScope) redirect("/onboarding/scope");
  if (!session.user.neighborhoodId) redirect("/onboarding/neighborhood");

  const scopeContext = await resolveScopeNeighborhoodIds(
    session.user.neighborhoodId,
    session.user.locationScope
  );
  const neighborhoodIds = scopeContext.ids;
  const whereNeighborhood =
    neighborhoodIds.length === 1 ? neighborhoodIds[0] : { in: neighborhoodIds };

  const [allListings, allPosts, neighborhood] = await Promise.all([
    prisma.listing.findMany({
      where: { neighborhoodId: whereNeighborhood, status: "ACTIVE" },
      include: { user: { select: { id: true, name: true } } },
      orderBy: { createdAt: "desc" }
    }),
    prisma.boardPost.findMany({
      where: { neighborhoodId: whereNeighborhood },
      include: { user: { select: { id: true, name: true } } },
      orderBy: { createdAt: "desc" }
    }),
    prisma.neighborhood.findUnique({ where: { id: session.user.neighborhoodId } })
  ]);
  const businessUsers = await prisma.user.findMany();

  const listings = allListings.filter(
    (l: ListingWithUser) => Boolean(l.locationText) || (typeof l.locationLat === "number" && typeof l.locationLng === "number")
  );
  const posts = allPosts.filter(
    (p: BoardPostWithUser) => Boolean(p.locationText) || (typeof p.locationLat === "number" && typeof p.locationLng === "number")
  );

  const mapItems = [
    ...posts.map((post: BoardPostWithUser) => ({
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
    })),
    ...listings.map((listing: ListingWithUser) => ({
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
    })),
    ...businessUsers
      .filter(
        (u: BusinessUser) =>
          u.accountType === "BUSINESS" &&
          typeof u.shopLocationLat === "number" &&
          typeof u.shopLocationLng === "number" &&
          (u.neighborhoodId ? (Array.isArray(neighborhoodIds) ? neighborhoodIds.includes(u.neighborhoodId) : true) : false)
      )
      .map((u: BusinessUser) => ({
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
      }))
  ];

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
            {session.user.locationScope === "DISTRICT"
              ? `${neighborhood?.city} / ${neighborhood?.district} semti için konumlu ilan ve duyurular.`
              : `${neighborhood?.city} / ${neighborhood?.district} / ${neighborhood?.name} için konumlu ilan ve duyurular.`}
          </p>
          <p className="text-xs text-zinc-500">
            Konum eklemek için Pazar sekmesindeki İlan Ekle veya Pano sayfasındaki duyuru akışını kullanabilirsiniz.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Tüm Konumlar Tek Haritada ({mapItems.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-3 sm:p-6">
          <UnifiedNeighborhoodMap items={mapItems} />
        </CardContent>
      </Card>
    </div>
  );
}




