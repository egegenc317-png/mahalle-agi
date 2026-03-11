// @ts-nocheck
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MapPin, Store, Tag } from "lucide-react";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getClosedStatus, getIstanbulNow } from "@/lib/shop-hours";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function ShopProfilePage({
  params,
  searchParams
}: {
  params: { userId: string };
  searchParams?: { error?: string };
}) {
  const session = await auth();

  const user = await prisma.user.findUnique({
    where: { id: params.userId },
    include: { listings: { orderBy: { createdAt: "desc" }, take: 20 } }
  });

  if (!user || user.accountType !== "BUSINESS") return notFound();
  const shopListings = user.listings || [];

  const isOwner = Boolean(session && session.user.id === user.id);
  const hasShop = Boolean(user.shopName || (typeof user.shopLocationLat === "number" && typeof user.shopLocationLng === "number"));
  const now = getIstanbulNow();
  const status = getClosedStatus(user.businessClosedHours, now.day, now.minutes);

  return (
    <div className="space-y-4">
      {searchParams?.error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{searchParams.error}</div>
      ) : null}

      <section
        className={`overflow-hidden rounded-[24px] border p-4 shadow-xl transition sm:rounded-3xl sm:p-5 ${
          status.isClosed
            ? "border-zinc-300 bg-gradient-to-br from-zinc-100 via-zinc-50 to-zinc-100 opacity-75 saturate-50"
            : "border-sky-200 bg-gradient-to-br from-white via-sky-50 to-cyan-100"
        }`}
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between">
          <div className="space-y-2">
            <p className={`inline-flex items-center gap-2 rounded-full border bg-white px-3 py-1 text-xs font-semibold ${status.isClosed ? "border-zinc-300 text-zinc-700" : "border-sky-200 text-sky-700"}`}>
              <Store className="h-3.5 w-3.5" /> İşletme Profili
            </p>
            <h1 className="text-2xl font-extrabold text-zinc-900 sm:text-3xl">{user.shopName || `${user.name} Dükkanı`}</h1>
            <p className="text-sm text-zinc-600">Sahibi: {user.name} (@{user.username || "Kullanıcı"})</p>
            <p className="inline-flex items-center gap-2 text-sm text-zinc-700"><Tag className="h-4 w-4 text-sky-600" /> {user.businessCategory || "Kategori belirtilmedi"}</p>
            {user.shopLocationText ? <p className="inline-flex items-center gap-2 text-sm text-zinc-700"><MapPin className="h-4 w-4 text-sky-600" /> {user.shopLocationText}</p> : null}
            <p className={`inline-flex w-fit rounded-full px-3 py-1 text-xs font-semibold ${status.isClosed ? "bg-zinc-200 text-zinc-700" : "bg-emerald-100 text-emerald-700"}`}>
              {status.label}
            </p>
            {status.isClosed ? (
              <p className="text-xs text-zinc-600">İşletme mesajı şu an kapalı. İstersen sahibine direkt mesaj atabilirsin.</p>
            ) : null}
            <Link href={`/profile/${user.id}`} className="text-sm font-medium text-sky-700 underline">Kişisel Profili Gör</Link>
          </div>

          <div className="flex flex-col gap-2 sm:items-end">
            {user.shopLogo ? <Image src={user.shopLogo} alt="Dükkan logosu" width={96} height={96} className="h-20 w-20 rounded-xl border object-cover sm:h-24 sm:w-24" /> : null}
            {isOwner && hasShop ? (
              <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-end">
                <Button asChild size="sm" className="bg-emerald-600 text-white hover:bg-emerald-700">
                  <Link href="/listings/new?type=PRODUCT">Ürün Ekle</Link>
                </Button>
                <Button asChild size="sm" variant="outline" className="border-sky-300 text-sky-700 hover:bg-sky-50">
                  <Link href="/listings/new?type=SERVICE">Hizmet Ekle</Link>
                </Button>
                <Button asChild size="sm" variant="outline" className="border-zinc-300 text-zinc-700 hover:bg-zinc-50">
                  <Link href="/my-shop">Dükkanı Düzenle</Link>
                </Button>
              </div>
            ) : isOwner ? (
              <div className="flex flex-col gap-2 sm:items-end">
                <p className="max-w-56 text-xs text-amber-700 sm:text-right">Ürün veya hizmet eklemek için Önce Dükkan bilgilerini tamamla.</p>
                <Button asChild size="sm" variant="outline" className="border-zinc-300 text-zinc-700 hover:bg-zinc-50">
                  <Link href="/my-shop">Dükkanı Düzenle</Link>
                </Button>
              </div>
            ) : session ? (
              <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-end">
                <form action="/api/conversations/shop" method="post">
                  <input type="hidden" name="shopUserId" value={user.id} />
                  <Button type="submit" size="sm" className="w-full bg-sky-600 text-white hover:bg-sky-700 sm:w-auto" disabled={status.isClosed}>
                    İşletmeye Mesaj
                  </Button>
                </form>
                <form action="/api/conversations" method="post">
                  <input type="hidden" name="userId" value={user.id} />
                  <input type="hidden" name="contextTitle" value={`${user.shopName || `${user.name} Dükkanı`} - Sahibiyle Sohbet`} />
                  <Button type="submit" size="sm" variant="outline" className="w-full border-zinc-300 text-zinc-700 hover:bg-zinc-50 sm:w-auto">
                    Sahibine Mesaj
                  </Button>
                </form>
              </div>
            ) : null}
          </div>
        </div>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>İşletme İlanları</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {shopListings.length === 0 ? <p className="text-sm text-zinc-500">Bu işletmenin ilanı yok.</p> : null}
          {shopListings.map((listing) => (
            <Link key={listing.id} href={`/listings/${listing.id}`} className="block rounded-xl border border-zinc-200 bg-zinc-50 p-3 transition hover:bg-zinc-100">
              <p className="font-semibold text-zinc-900">{listing.title}</p>
              <p className="text-xs text-zinc-500">{listing.status} - {listing.category}</p>
            </Link>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}





