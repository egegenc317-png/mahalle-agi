// @ts-nocheck
import Link from "next/link";
import { notFound } from "next/navigation";
import { BadgeCheck, CalendarClock, ExternalLink, Megaphone, MessageCircle, Star, Store, Tag } from "lucide-react";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getUserRatingAverage } from "@/lib/user-rating";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ProfileRatingStarsForm } from "@/components/profile-rating-stars-form";
import { StartConversationLink } from "@/components/start-conversation-link";

const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;

function calculateAge(date: Date) {
  const now = new Date();
  let age = now.getFullYear() - date.getFullYear();
  const m = now.getMonth() - date.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < date.getDate())) age--;
  return age;
}

export default async function ProfilePage({
  params,
  searchParams
}: {
  params: { userId: string };
  searchParams?: { error?: string; success?: string };
}) {
  const session = await auth();

  const user = await prisma.user.findUnique({
    where: { id: params.userId },
    include: { neighborhood: true, listings: { orderBy: { createdAt: "desc" }, take: 10 } }
  });

  if (!user) return notFound();

  const [rating, boardPosts] = await Promise.all([
    getUserRatingAverage(user.id),
    prisma.boardPost.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 10 })
  ]);

  const averageStars = Number((rating.average / 2).toFixed(1));
  const userListings = user.listings || [];

  let showRatingForm = false;
  let defaultStars = 4;

  if (session && session.user.id !== user.id) {
    const existing = await prisma.userRating.findFirst({
      where: { raterUserId: session.user.id, targetUserId: user.id }
    });

    if (!existing) {
      showRatingForm = true;
    } else {
      defaultStars = Math.max(1, Math.min(5, Math.round(existing.score / 2)));
      const locked = Date.now() - new Date(existing.updatedAt).getTime() < ONE_WEEK_MS;
      showRatingForm = !locked;
    }
  }

  return (
    <div className="space-y-5">
      <section className="overflow-hidden rounded-[24px] border border-amber-200 bg-gradient-to-br from-white via-amber-50 to-orange-100 shadow-xl sm:rounded-3xl">
        <div className="grid gap-4 p-4 md:grid-cols-[1.2fr_1fr] md:p-6">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-extrabold tracking-tight text-zinc-900 sm:text-3xl">{user.name}</h1>
              <div className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-white/90 px-3 py-1 text-sm font-semibold text-zinc-800">
                <Star className="h-4 w-4 fill-amber-400 text-amber-500" />
                {averageStars.toFixed(1)}
              </div>
              {user.emailVerified ? (
                <div className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-sm font-semibold text-emerald-700">
                  <BadgeCheck className="h-4 w-4" />
                  Doğrulanmış kullanıcı
                </div>
              ) : null}
            </div>

            <p className="text-sm text-zinc-600">@{user.username || "Kullanıcı"}</p>
            {user.showAge && user.birthDate ? (
              <p className="text-sm text-zinc-600">Yaş: {calculateAge(new Date(user.birthDate))}</p>
            ) : null}
            {searchParams?.error ? <p className="text-sm text-red-600">{searchParams.error}</p> : null}
            {searchParams?.success ? <p className="text-sm text-emerald-700">{searchParams.success}</p> : null}
            {session && session.user.id !== user.id ? (
              <StartConversationLink
                href={`/api/conversations/direct?userId=${encodeURIComponent(user.id)}&contextTitle=${encodeURIComponent(`${user.name} ile Sohbet`)}`}
                className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-orange-300 bg-orange-50 px-4 py-2 text-sm font-medium text-orange-700 transition hover:bg-orange-100 sm:w-auto"
                loadingLabel="Sohbet açılıyor..."
              >
                <MessageCircle className="h-4 w-4" />
                Mesaj Gönder
              </StartConversationLink>
            ) : null}
          </div>

          <div className="rounded-2xl border border-amber-200 bg-white/90 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Ortalama Profil Puanı</p>
            <p className="mt-2 text-4xl font-black text-zinc-900">{averageStars.toFixed(1)} <span className="text-lg font-semibold text-zinc-500">/ 5</span></p>
            <div className="mt-3 flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((value) => (
                <Star
                  key={value}
                  className={`h-5 w-5 ${value <= Math.round(averageStars) ? "fill-amber-400 text-amber-500" : "text-zinc-300"}`}
                />
              ))}
            </div>
            <p className="mt-2 text-xs text-zinc-500">Puanlayan kişiler gizlidir.</p>
          </div>
        </div>
      </section>

      {user.accountType === "BUSINESS" ? (
        <Card className="border-sky-200 bg-gradient-to-br from-white to-sky-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Store className="h-4 w-4 text-sky-600" /> Sahip Oldugu İşletme</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="font-semibold text-zinc-900">{user.shopName || `${user.name} Dükkanı`}</p>
            <p className="text-sm text-zinc-600">Kategori: {user.businessCategory || "Belirtilmedi"}</p>
            {user.shopLocationText ? <p className="text-sm text-zinc-600">Konum: {user.shopLocationText}</p> : null}
            <div className="flex flex-wrap gap-3 text-sm">
              <Link href={`/shop/${user.id}`} className="inline-flex items-center gap-1 font-medium text-sky-700 underline">
                Dükkan Profiline Git <ExternalLink className="h-3.5 w-3.5" />
              </Link>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {showRatingForm ? (
        <Card className="border-zinc-200 bg-white/95">
          <CardHeader>
            <CardTitle>Bu Kullaniciyi Yildizla Puanla</CardTitle>
          </CardHeader>
          <CardContent>
            <ProfileRatingStarsForm targetUserId={user.id} defaultStars={defaultStars} />
            <p className="mt-2 text-xs text-zinc-500">Puan gönderdikten sonra bu alan 1 hafta gizlenir.</p>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="border-zinc-200 bg-white/95">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Tag className="h-4 w-4 text-emerald-600" /> İlanlar</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {userListings.length === 0 ? <p className="text-sm text-zinc-500">İlan yok.</p> : null}
            {userListings.map((listing) => (
              <Link key={listing.id} href={`/listings/${listing.id}`} className="block rounded-xl border border-zinc-200 bg-zinc-50 p-3 transition hover:bg-zinc-100">
                <p className="font-semibold text-zinc-900">{listing.title}</p>
                <p className="text-xs text-zinc-500">{listing.status} - {new Date(listing.createdAt).toLocaleDateString("tr-TR")}</p>
              </Link>
            ))}
          </CardContent>
        </Card>

        <Card className="border-zinc-200 bg-white/95">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Megaphone className="h-4 w-4 text-orange-500" /> Duyurular</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {boardPosts.length === 0 ? <p className="text-sm text-zinc-500">Duyuru yok.</p> : null}
            {boardPosts.map((post: { id: string; title: string; body: string; createdAt: Date }) => (
              <Link key={post.id} href="/board" className="block rounded-xl border border-zinc-200 bg-zinc-50 p-3 transition hover:bg-zinc-100">
                <p className="font-semibold text-zinc-900">{post.title}</p>
                <p className="text-sm text-zinc-600">{post.body}</p>
                <p className="mt-1 inline-flex items-center gap-1 text-xs text-zinc-500"><CalendarClock className="h-3.5 w-3.5" /> {new Date(post.createdAt).toLocaleString("tr-TR")}</p>
              </Link>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}





