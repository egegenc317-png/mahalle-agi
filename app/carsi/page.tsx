// @ts-nocheck
import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import { Flame, MapPin, Sparkles, Store, Tag } from "lucide-react";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getClosedStatus, getIstanbulNow } from "@/lib/shop-hours";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type ShopUser = {
  id: string;
  name: string;
  neighborhoodId?: string | null;
  accountType?: "NEIGHBOR" | "BUSINESS";
  businessCategory?: string | null;
  businessClosedHours?: Array<{
    day: number;
    mode: "FULL_DAY" | "RANGE";
    start?: string;
    end?: string;
  }> | null;
  shopName?: string | null;
  shopLogo?: string | null;
  shopLocationText?: string | null;
  shopLocationLat?: number | null;
  shopLocationLng?: number | null;
};

type ListingView = {
  id: string;
  userId: string;
  title: string;
  price: number | null;
  category: string;
  status: string;
  createdAt: Date;
};

function formatPrice(price: number | null) {
  if (price == null) return "Fiyat belirtilmemis";
  return `${price.toLocaleString("tr-TR")} TL`;
}

export default async function CarsiPage() {
  const session = await auth();
  if (!session) redirect("/auth/login");
  if (!session.user.locationScope) redirect("/onboarding/scope");
  if (!session.user.neighborhoodId) redirect("/onboarding/neighborhood");
  const neighborhoodId = session.user.neighborhoodId;

  const [users, listings] = await Promise.all([
    prisma.user.findMany(),
    prisma.listing.findMany({
      where: {
        status: "ACTIVE",
        neighborhoodId
      },
      orderBy: { createdAt: "desc" }
    }) as Promise<ListingView[]>
  ]);

  const scopedShops = (users as ShopUser[])
    .filter((user) => user.neighborhoodId === neighborhoodId)
    .filter((user) => user.accountType === "BUSINESS")
    .filter((user) => Boolean(user.shopName || user.shopLocationText || user.shopLogo));

  const listingCountByUser = new Map<string, number>();
  const latestListingByUser = new Map<string, ListingView>();
  const now = getIstanbulNow();

  for (const listing of listings) {
    if (listing.status !== "ACTIVE") continue;
    listingCountByUser.set(listing.userId, (listingCountByUser.get(listing.userId) || 0) + 1);
    if (!latestListingByUser.has(listing.userId)) {
      latestListingByUser.set(listing.userId, listing);
    }
  }

  const openShopCount = scopedShops.filter(
    (shop) => !getClosedStatus(shop.businessClosedHours, now.day, now.minutes).isClosed
  ).length;

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-[26px] border border-amber-200 bg-[radial-gradient(circle_at_20%_20%,rgba(251,191,36,0.25),transparent_40%),radial-gradient(circle_at_80%_10%,rgba(251,146,60,0.25),transparent_38%),linear-gradient(135deg,#fff7ed_0%,#fffbeb_52%,#fff1f2_100%)] p-4 shadow-sm sm:rounded-3xl sm:p-6">
        <div className="pointer-events-none absolute -left-10 -top-10 h-40 w-40 rounded-full bg-amber-300/30 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-12 right-0 h-44 w-44 rounded-full bg-orange-300/30 blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-14 bg-[repeating-linear-gradient(90deg,rgba(217,119,6,0.08)_0px,rgba(217,119,6,0.08)_16px,transparent_16px,transparent_30px)]" />

        <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
          <div>
            <Badge className="mb-3 bg-orange-500 text-white">Mahalle Çarşısı</Badge>
            <h1 className="text-2xl font-extrabold tracking-tight text-zinc-900 sm:text-3xl">Çarşı Sokağında Gezinti</h1>
            <p className="mt-2 max-w-2xl text-sm text-zinc-700">
              Sadece bulunduğun mahallenin dükkanlarını gör. Vitrinlere bak, komşu esnafa uğra ve dükkandan ilana hızlı geç.
            </p>
            <div className="mt-3 flex flex-wrap gap-2 text-xs">
              <span className="rounded-full border border-amber-300 bg-white/80 px-3 py-1 text-amber-700">{openShopCount} dükkan şu an açık</span>
              <span className="rounded-full border border-amber-300 bg-white/80 px-3 py-1 text-amber-700">{listings.length} aktif ilan</span>
            </div>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button asChild variant="outline" className="w-full border-orange-300 text-orange-700 hover:bg-orange-50 sm:w-auto">
              <Link href="/map">Haritada Göster</Link>
            </Button>
            <Button asChild className="w-full bg-orange-500 hover:bg-orange-600 sm:w-auto">
              <Link href="/pazar">Pazara Git</Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {scopedShops.length === 0 ? (
            <Card className="col-span-full border-dashed border-amber-300 bg-white/80">
              <CardContent className="py-10 text-center">
                <Store className="mx-auto mb-3 h-8 w-8 text-amber-500" />
                <p className="text-sm text-zinc-600">Mahallende henüz dükkan açılmamış.</p>
                <p className="mt-1 text-xs text-zinc-500">Aynı mahallede bir işletme hesap oluşturduğunda burada görünecek.</p>
              </CardContent>
            </Card>
        ) : (
          [...scopedShops]
            .sort((a, b) => {
              const aClosed = getClosedStatus(a.businessClosedHours, now.day, now.minutes).isClosed;
              const bClosed = getClosedStatus(b.businessClosedHours, now.day, now.minutes).isClosed;
              if (aClosed === bClosed) return 0;
              return aClosed ? 1 : -1;
            })
            .map((shop) => {
            const activeCount = listingCountByUser.get(shop.id) || 0;
            const latestListing = latestListingByUser.get(shop.id);
            const status = getClosedStatus(shop.businessClosedHours, now.day, now.minutes);

            return (
              <Card
                key={shop.id}
                className={`group overflow-hidden transition ${
                  status.isClosed
                    ? "border-zinc-200 bg-zinc-50/90 opacity-70 saturate-50"
                    : "border-amber-200 bg-white shadow-[0_20px_60px_-30px_rgba(234,88,12,0.65)] hover:-translate-y-1 hover:shadow-[0_28px_70px_-28px_rgba(234,88,12,0.75)]"
                }`}
              >
                <CardHeader
                  className={`space-y-3 ${
                    status.isClosed
                      ? "bg-gradient-to-r from-zinc-100 via-zinc-50 to-zinc-100"
                      : "bg-gradient-to-r from-amber-50 via-orange-50 to-rose-50"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className={`relative h-12 w-12 overflow-hidden rounded-xl bg-white ${status.isClosed ? "border border-zinc-300" : "border border-amber-200 ring-2 ring-orange-100"}`}>
                        {shop.shopLogo ? (
                          <Image src={shop.shopLogo} alt={`${shop.shopName || shop.name} logosu`} fill className="object-cover" />
                        ) : (
                          <div className={`flex h-full w-full items-center justify-center ${status.isClosed ? "text-zinc-400" : "text-amber-500"}`}>
                            <Store className="h-5 w-5" />
                          </div>
                        )}
                      </div>
                      <div>
                        <Badge
                          variant="outline"
                          className={status.isClosed ? "border-zinc-300 bg-white text-zinc-600" : "border-amber-300 bg-white text-amber-700"}
                        >
                          {status.isClosed ? "Kapalı işletme" : "Şimdi açık"}
                        </Badge>
                        <CardTitle className="mt-1 text-xl text-zinc-900">{shop.shopName || `${shop.name} Dükkanı`}</CardTitle>
                        <p className="text-xs text-zinc-600">{shop.name}</p>
                      </div>
                    </div>
                    <div className={`rounded-xl bg-white px-2 py-1 text-xs font-semibold ${status.isClosed ? "border border-zinc-300 text-zinc-600" : "border border-amber-200 text-amber-700"}`}>
                      {activeCount} aktif ilan
                    </div>
                  </div>
                  <div className="flex items-center justify-between rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs">
                    <span className="text-zinc-600">Durum</span>
                    <span className={status.isClosed ? "font-semibold text-red-600" : "font-semibold text-emerald-600"}>{status.label}</span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3 pt-4">
                  {shop.businessCategory ? (
                    <p className="inline-flex items-center gap-2 text-sm text-zinc-700"><Tag className="h-4 w-4 text-orange-500" /> {shop.businessCategory}</p>
                  ) : null}
                  {shop.shopLocationText ? (
                    <p className="inline-flex items-center gap-2 text-sm text-zinc-700"><MapPin className="h-4 w-4 text-orange-500" /> {shop.shopLocationText}</p>
                  ) : null}

                  <div className={`rounded-lg p-3 text-xs ${status.isClosed ? "border border-zinc-200 bg-zinc-100 text-zinc-700" : "border border-orange-100 bg-orange-50/70 text-zinc-700"}`}>
                    <p className="inline-flex items-center gap-1 font-medium text-zinc-900"><Sparkles className="h-3.5 w-3.5 text-orange-500" /> Vitrinde One Cikan</p>
                    {latestListing ? (
                      <p className="mt-1">
                        <span className="font-medium text-zinc-900">{latestListing.title}</span> - {formatPrice(latestListing.price)} ({latestListing.category})
                      </p>
                    ) : (
                      <p className="mt-1">Bu dükkanın vitrini yakında dolacak.</p>
                    )}
                  </div>

                  <div className={`rounded-lg p-2 text-xs ${status.isClosed ? "border border-zinc-200 bg-zinc-100 text-zinc-600" : "border border-amber-200 bg-amber-50/70 text-amber-800"}`}>
                    <p className="inline-flex items-center gap-1"><Flame className="h-3.5 w-3.5" /> {status.isClosed ? "Bu dükkan şu an kapalı, yine de vitrini inceleyebilirsin." : "Çarşı sıcaklığı: Komşu esnafa uğrar gibi dükkan profiline girip ilanları gezebilirsin."}</p>
                  </div>

                  <Button
                    asChild
                    variant="outline"
                    className={`w-full ${
                      status.isClosed
                        ? "border-zinc-300 text-zinc-700 hover:bg-zinc-100"
                        : "border-orange-300 text-orange-700 hover:bg-orange-50"
                    }`}
                  >
                    <Link href={`/shop/${shop.id}`}>Dükkanı Ziyaret Et</Link>
                  </Button>
                </CardContent>
              </Card>
            );
          })
        )}
      </section>
    </div>
  );
}





