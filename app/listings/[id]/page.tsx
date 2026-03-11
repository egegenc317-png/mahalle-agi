// @ts-nocheck
import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarClock, MapPin, MessageCircle, Package2, ShieldAlert, Store, Tag } from "lucide-react";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { BoardPhotoGallery } from "@/components/board-photo-gallery";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function parsePhotos(raw: string | null | undefined) {
  if (!raw) return [] as string[];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((item) => typeof item === "string") : [];
  } catch {
    return [];
  }
}

export default async function ListingDetailPage({ params }: { params: { id: string } }) {
  const session = await auth();
  const listing = await prisma.listing.findUnique({
    where: { id: params.id },
    include: { user: { select: { id: true, name: true } }, neighborhood: true }
  });

  if (!listing) return notFound();
  const nextViewCount = (listing.viewCount || 0) + 1;
  await prisma.listing.update({
    where: { id: listing.id },
    data: { viewCount: nextViewCount }
  });
  const canDelete = Boolean(session && (session.user.role === "ADMIN" || session.user.id === listing.userId));
  const photos = parsePhotos(listing.photos);
  const mapLat = typeof listing.locationLat === "number" ? listing.locationLat : listing.neighborhood.lat;
  const mapLng = typeof listing.locationLng === "number" ? listing.locationLng : listing.neighborhood.lng;
  const mapHref = `https://www.google.com/maps?q=${mapLat},${mapLng}`;

  return (
    <div className="space-y-4">
      <section className="relative overflow-hidden rounded-[24px] border border-amber-200 bg-[radial-gradient(circle_at_18%_12%,rgba(251,191,36,0.22),transparent_40%),radial-gradient(circle_at_85%_8%,rgba(251,146,60,0.22),transparent_35%),linear-gradient(135deg,#fff7ed_0%,#ffffff_48%,#fffbeb_100%)] p-4 shadow-xl sm:rounded-3xl sm:p-5">
        <div className="pointer-events-none absolute -left-16 -top-10 h-44 w-44 rounded-full bg-amber-300/25 blur-3xl" />
        <div className="pointer-events-none absolute -right-16 -bottom-14 h-48 w-48 rounded-full bg-orange-300/20 blur-3xl" />

        <div className="relative z-10 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="bg-emerald-600 text-white">{listing.type}</Badge>
              <Badge variant="outline" className="border-amber-300 bg-white/80 text-amber-800">{listing.category}</Badge>
              <Badge variant="secondary">{listing.status}</Badge>
            </div>
            <h1 className="text-2xl font-extrabold tracking-tight text-zinc-900 sm:text-3xl">{listing.title}</h1>
            <p className="inline-flex items-center gap-2 text-sm text-zinc-700"><Store className="h-4 w-4 text-orange-500" /> Satıcı: {listing.user.name}</p>
          </div>

          <div className="rounded-2xl border border-amber-200 bg-white/90 px-4 py-3 text-left shadow-sm sm:text-right">
            <p className="text-xs uppercase tracking-wide text-zinc-500">Pazar Fiyati</p>
            <p className="text-2xl font-black text-zinc-900">{listing.price ? `${listing.price} TL` : "-"}</p>
            <p className="text-xs text-zinc-500">{listing.price ? "Fiyat belirtilmis" : "Fiyat belirtilmemis"}</p>
          </div>
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <Card className="border-amber-200 bg-white/95 shadow-sm">
          <CardHeader>
            <CardTitle className="inline-flex items-center gap-2 text-zinc-900"><Package2 className="h-5 w-5 text-orange-500" /> Ürün Detaylari</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="rounded-xl border border-amber-100 bg-amber-50/50 p-4 text-sm leading-relaxed text-zinc-700">{listing.description}</p>

            <div className="grid gap-2 sm:grid-cols-2">
              <div className="rounded-xl border border-zinc-200 bg-white p-3 text-sm text-zinc-700">
                <p className="inline-flex items-center gap-2 font-semibold text-zinc-900"><Tag className="h-4 w-4 text-amber-600" /> Kategori</p>
                <p className="mt-1">{listing.category}</p>
              </div>
              <div className="rounded-xl border border-zinc-200 bg-white p-3 text-sm text-zinc-700">
                <p className="inline-flex items-center gap-2 font-semibold text-zinc-900"><CalendarClock className="h-4 w-4 text-amber-600" /> Yayın Tarihi</p>
                <p className="mt-1">{new Date(listing.createdAt).toLocaleString("tr-TR")}</p>
              </div>
            </div>

            <a
              href={mapHref}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs text-zinc-600 transition hover:border-orange-300 hover:bg-orange-50 hover:text-zinc-800"
            >
              <MapPin className="h-3.5 w-3.5 text-orange-500" />
              {listing.neighborhood.city} / {listing.neighborhood.district} / {listing.neighborhood.name}
            </a>

            {photos.length > 0 ? <BoardPhotoGallery photos={photos} title={listing.title} /> : null}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card className="border-zinc-200 bg-white/95 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">Aksiyonlar</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button asChild variant="outline" className="w-full border-amber-300 text-amber-700 hover:bg-amber-50">
                <Link href={`/profile/${listing.user.id}`}>Satıcı Profili</Link>
              </Button>

              {session && session.user.id !== listing.userId ? (
                <form action="/api/conversations" method="post" className="space-y-2">
                  <input type="hidden" name="listingId" value={listing.id} />
                  <Button type="submit" className="w-full bg-orange-500 text-white hover:bg-orange-600">
                    <MessageCircle className="mr-2 h-4 w-4" /> Satıcıyla Mesajlaş
                  </Button>
                </form>
              ) : null}

              {canDelete ? (
                <form action={`/api/listings/${listing.id}/delete`} method="post" className="space-y-2">
                  <Button type="submit" variant="destructive" className="w-full">İlanı Sil</Button>
                </form>
              ) : null}
            </CardContent>
          </Card>

          {session ? (
            <Card className="border-red-100 bg-red-50/60 shadow-sm">
              <CardContent className="space-y-2 pt-6">
                <p className="inline-flex items-center gap-2 text-sm font-semibold text-zinc-900"><ShieldAlert className="h-4 w-4 text-red-600" /> Sorun mu var?</p>
                <form action="/api/reports" method="post" className="space-y-2">
                  <input type="hidden" name="targetType" value="LISTING" />
                  <input type="hidden" name="targetId" value={listing.id} />
                  <input name="reason" className="h-9 w-full rounded border border-red-200 bg-white px-2 text-sm" placeholder="Rapor sebebi" required />
                  <input name="details" className="h-9 w-full rounded border border-red-200 bg-white px-2 text-sm" placeholder="Detay (opsiyonel)" />
                  <Button type="submit" size="sm" variant="outline" className="w-full border-red-300 text-red-700 hover:bg-red-100">İlanı Raporla</Button>
                </form>
              </CardContent>
            </Card>
          ) : null}
        </div>
      </div>
    </div>
  );
}





