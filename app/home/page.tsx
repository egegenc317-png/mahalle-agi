// @ts-nocheck
import Link from "next/link";
import { redirect } from "next/navigation";
import { Megaphone, BriefcaseBusiness, ClipboardList, Crown, Flame, Sparkles, TrendingUp } from "lucide-react";
import Image from "next/image";

import { auth } from "@/lib/auth";
import { getWeeklyNeighborhoodMukhtar } from "@/lib/mukhtar";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ListingCard } from "@/components/listing-card";
import { NeighborhoodPreviewMap } from "@/components/neighborhood-preview-map";

type PollVoteView = { optionIndex: number };
type PollView = { id: string; question: string; options: string[]; user: { name: string }; votes: PollVoteView[] };
type BoardPostView = {
  id: string;
  type: string;
  title: string;
  body: string;
  viewCount?: number;
  createdAt: Date;
  user: { id: string; name: string; username?: string | null; image?: string | null };
};
type ListingView = Awaited<ReturnType<typeof prisma.listing.findMany>>[number];

function pollProgress(votes: PollVoteView[], optionIndex: number) {
  const total = votes.length;
  if (total === 0) return 0;
  const count = votes.filter((v) => v.optionIndex === optionIndex).length;
  return Math.round((count / total) * 100);
}

export default async function UnifiedHomePage() {
  const session = await auth();
  if (!session) redirect("/auth/login");
  if (!session.user.locationScope) redirect("/onboarding/scope");
  if (!session.user.neighborhoodId) redirect("/onboarding/neighborhood");
  const neighborhoodId = session.user.neighborhoodId;

  const [listings, boardPosts, listingCandidates, boardCandidates, polls, neighborhood, mukhtar] = await Promise.all([
    prisma.listing.findMany({
      where: {
        status: "ACTIVE",
        neighborhoodId
      },
      include: { user: { select: { id: true, name: true, username: true, image: true } } },
      orderBy: { createdAt: "desc" },
      take: 6
    }),
    prisma.boardPost.findMany({
      where: {
        neighborhoodId
      },
      include: { user: { select: { id: true, name: true, username: true, image: true } } },
      orderBy: { createdAt: "desc" },
      take: 5
    }) as Promise<BoardPostView[]>,
    prisma.listing.findMany({
      where: {
        status: "ACTIVE",
        neighborhoodId
      },
      include: { user: { select: { id: true, name: true, username: true, image: true } } }
    }),
    prisma.boardPost.findMany({
      where: {
        neighborhoodId
      },
      include: { user: { select: { id: true, name: true, username: true, image: true } } }
    }) as Promise<BoardPostView[]>,
    prisma.poll.findMany({
      where: {
        neighborhoodId
      },
      include: { user: { select: { id: true, name: true } }, votes: true },
      orderBy: { createdAt: "desc" },
      take: 3
    }) as Promise<PollView[]>,
    prisma.neighborhood.findUnique({ where: { id: neighborhoodId } }),
    getWeeklyNeighborhoodMukhtar(neighborhoodId),
  ]);

  const topListings = [...(listingCandidates as ListingView[])]
    .sort((a, b) => (b.viewCount || 0) - (a.viewCount || 0) || +b.createdAt - +a.createdAt)
    .slice(0, 3);
  const topBoardPosts = [...boardCandidates]
    .sort((a, b) => (b.viewCount || 0) - (a.viewCount || 0) || +b.createdAt - +a.createdAt)
    .slice(0, 3);

  const areaLabel = "Mahalle";
  const heroText = "Mahallendeki ilanları, duyuruları ve oylamaları tek ekranda takip et. Sıcak, güvenli ve yerel bir topluluk deneyimi.";
  const joinText = "Mahalleye Katıl";
  const goText = "Mahalleme Git";

  return (
    <div className="space-y-5 pb-24 lg:space-y-6 lg:pb-0">
      <section className="relative overflow-hidden rounded-[24px] border border-amber-100 bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50 p-4 shadow-sm sm:rounded-2xl sm:p-6">
        <div className="pointer-events-none absolute -right-10 -top-12 h-40 w-40 rounded-full bg-orange-200/40 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-16 left-8 h-36 w-36 rounded-full bg-amber-300/30 blur-2xl" />

        <div className="relative z-10 grid gap-5 lg:grid-cols-[1.3fr_1fr] lg:items-end">
          <div className="space-y-3">
            <Badge className="bg-orange-500 text-white">{areaLabel} Ağı</Badge>
            <h1 className="text-xl font-semibold tracking-tight text-zinc-900 sm:text-2xl lg:text-4xl">
              Komşularınla Güvende Kal, alışveriş Yap, Dayanışmaya Katıl
            </h1>
            <p className="text-base font-semibold tracking-wide text-zinc-900 sm:text-lg">
              Seni seviyorum nazar ve doga
            </p>
            <p className="max-w-2xl text-sm text-zinc-700 lg:text-base">{heroText}</p>
            <div className="flex flex-col gap-2 pt-1 sm:flex-row sm:flex-wrap">
              <Button asChild className="bg-orange-500 hover:bg-orange-600">
                <Link href="/pazar">Pazara Git</Link>
              </Button>
              {!session.user.neighborhoodId ? (
                <Button asChild variant="outline">
                  <Link href="/onboarding/neighborhood">{joinText}</Link>
                </Button>
              ) : (
                <Button asChild variant="outline">
                  <Link href="/map">{goText}</Link>
                </Button>
              )}
            </div>
          </div>

          <div className="relative min-h-[220px] overflow-hidden rounded-2xl border border-amber-100 bg-zinc-900/90 shadow-lg">
            {neighborhood ? (
              <>
                <NeighborhoodPreviewMap lat={neighborhood.lat} lng={neighborhood.lng} />
                <div className="pointer-events-none absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/65 to-transparent p-4">
                  <p className="text-xs uppercase tracking-wide text-amber-200/90">Mahalle Haritası</p>
                  <p className="text-sm font-medium text-white">
                    {neighborhood.city} / {neighborhood.district} / {neighborhood.name}
                  </p>
                </div>
              </>
            ) : (
              <div className="flex h-full min-h-[220px] items-center justify-center p-4 text-center text-sm text-zinc-200">
                {areaLabel} doğrulamasından sonra burada uydu görünümü gösterilecek.
              </div>
            )}
          </div>
        </div>
      </section>

      <section id="duyurular" className="rounded-2xl border bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-lg font-semibold"><Megaphone className="h-4 w-4 text-orange-500" /> {areaLabel} Panosu</h2>
          <Button asChild variant="outline" size="sm">
            <Link href="/board">Tüm Duyurular</Link>
          </Button>
        </div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {boardPosts.length === 0 ? (
            <p className="col-span-full rounded-lg border border-dashed p-5 text-sm text-zinc-500">Duyuru bulunamadı.</p>
          ) : (
            boardPosts.map((post: BoardPostView) => (
              <Link key={post.id} href="/board" className="block rounded-xl border border-zinc-200 p-3 transition hover:bg-amber-50/50">
                <div className="mb-2 flex items-center justify-between">
                  <Badge variant="outline">{post.type}</Badge>
                  <span className="text-xs text-zinc-500">{post.user.name}</span>
                </div>
                <p className="font-medium text-zinc-900">{post.title}</p>
                <p className="mt-1 text-sm text-zinc-600">{post.body}</p>
              </Link>
            ))
          )}
        </div>
      </section>

      <section className="rounded-3xl border border-amber-200 bg-[linear-gradient(135deg,#fffaf1_0%,#fff5e7_100%)] p-4 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.24em] text-orange-600">
              <Flame className="h-3.5 w-3.5" /> Mahalle Akışı
            </p>
            <h2 className="mt-1 text-xl font-semibold text-zinc-900">Mahallende olan biteni komşularının ağzından gör</h2>
            <p className="mt-2 max-w-3xl text-sm text-zinc-600">
              Aynı mahalledeki insanlar kısa notlar, fotoğraflar ve anlık gelişmeler paylaşsın. Yazan kişi açıkça görünür, akış sıcak ama düzenli ilerler.
            </p>
          </div>
          <Button asChild className="bg-orange-500 hover:bg-orange-600">
            <Link href="/akis">Akışa Git</Link>
          </Button>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.2fr_1fr]">
        <div className="rounded-2xl border bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-lg font-semibold"><ClipboardList className="h-4 w-4 text-orange-500" /> Yakın İlanlar</h2>
            <Button asChild variant="outline" size="sm">
              <Link href="/pazar">Tümünü Gör</Link>
            </Button>
          </div>
          <div className="space-y-3">
            {listings.length === 0 ? (
              <p className="rounded-lg border border-dashed p-5 text-sm text-zinc-500">Bu bölgede Henüz ilan yok.</p>
            ) : (
              listings.slice(0, 4).map((listing: ListingView) => <ListingCard key={listing.id} listing={listing} />)
            )}
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl border bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-lg font-semibold"><BriefcaseBusiness className="h-4 w-4 text-orange-500" /> Oylamalar</h2>
              <Button asChild variant="outline" size="sm">
                <Link href="/polls">Tüm Anketler</Link>
              </Button>
            </div>
            <div className="space-y-3">
              {polls.length === 0 ? (
                <p className="rounded-lg border border-dashed p-5 text-sm text-zinc-500">Anket bulunamadı.</p>
              ) : (
                polls.map((poll: PollView) => (
                  <div key={poll.id} className="rounded-xl border border-zinc-200 p-3">
                    <p className="font-medium text-zinc-900">{poll.question}</p>
                    <p className="mb-2 text-xs text-zinc-500">{poll.user.name} - {poll.votes.length} oy</p>
                    <div className="space-y-1.5">
                      {poll.options.map((option, i) => {
                        const pct = pollProgress(poll.votes, i);
                        return (
                          <div key={`${poll.id}-op-${i}`}>
                            <div className="mb-0.5 flex items-center justify-between text-xs text-zinc-600">
                              <span>{option}</span>
                              <span>{pct}%</span>
                            </div>
                            <div className="h-2 rounded-full bg-zinc-100">
                              <div className="h-2 rounded-full bg-orange-400" style={{ width: `${pct}%` }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50 p-4 shadow-sm">
            <p className="mb-1 flex items-center gap-2 text-sm font-semibold text-zinc-800">
              <Crown className="h-4 w-4 text-amber-600" /> Bu Haftanın Mahalle Muhtarı
            </p>
            {mukhtar ? (
              <>
                <p className="text-sm font-medium text-zinc-900">{mukhtar.name} (@{mukhtar.username || "Kullanıcı"})</p>
                <p className="text-xs text-zinc-600">Haftalık aktif süre: {(mukhtar.seconds / 3600).toFixed(1)} saat</p>
                <p className="mt-2 flex items-center gap-1 text-xs text-orange-600"><Sparkles className="h-3.5 w-3.5" /> Bu hafta anket açma yetkisi mahalle muhtarında.</p>
              </>
            ) : (
              <p className="text-xs text-zinc-600">Bu hafta henüz muhtar belirlenmedi. Kullanım arttıkça otomatik atanır.</p>
            )}
          </div>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <div className="rounded-3xl border border-amber-200 bg-[linear-gradient(135deg,#fff9ef_0%,#fff4df_100%)] p-4 shadow-sm">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.24em] text-orange-600">
                <TrendingUp className="h-3.5 w-3.5" /> En Çok Görüntülenen Duyurular
              </p>
              <h2 className="mt-1 text-xl font-semibold text-zinc-900">Mahallenin öne çıkan 3 duyurusu</h2>
            </div>
            <Button asChild variant="outline" size="sm">
              <Link href="/board">Panoya Git</Link>
            </Button>
          </div>
          <div className="space-y-3">
            {topBoardPosts.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-amber-200 bg-white/80 p-5 text-sm text-zinc-500">Henüz öne çıkan duyuru yok.</p>
            ) : (
              topBoardPosts.slice(0, 3).map((post, index) => (
                <Link key={post.id} href={`/board/${post.id}`} className="group block rounded-2xl border border-amber-200 bg-white/90 p-4 transition hover:-translate-y-0.5 hover:shadow-md">
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <Badge className="bg-orange-500 text-white">#{index + 1}</Badge>
                      <p className="text-lg font-semibold text-zinc-900">{post.title}</p>
                    </div>
                  </div>
                  <p className="line-clamp-2 text-sm text-zinc-600">{post.body}</p>
                  <div className="mt-3 flex items-center justify-between gap-3 text-xs text-zinc-500">
                    <span>{new Date(post.createdAt).toLocaleDateString("tr-TR")}</span>
                    <span className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-2 py-1">
                      {post.user.image ? (
                        <Image src={post.user.image} alt={post.user.name} width={18} height={18} className="h-[18px] w-[18px] rounded-full object-cover" />
                      ) : (
                        <span className="inline-flex h-[18px] w-[18px] items-center justify-center rounded-full bg-amber-200 text-[10px] font-semibold text-amber-800">
                          {post.user.name.slice(0, 1).toUpperCase()}
                        </span>
                      )}
                      @{post.user.username || post.user.name}
                    </span>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>

        <div className="rounded-3xl border border-amber-200 bg-[linear-gradient(135deg,#fff8f0_0%,#fff1df_100%)] p-4 shadow-sm">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.24em] text-emerald-700">
                <TrendingUp className="h-3.5 w-3.5" /> En Çok Görüntülenen İlanlar
              </p>
              <h2 className="mt-1 text-xl font-semibold text-zinc-900">Pazarda öne çıkan 3 ilan</h2>
            </div>
            <Button asChild variant="outline" size="sm">
              <Link href="/pazar">Pazara Git</Link>
            </Button>
          </div>
          <div className="space-y-3">
            {topListings.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-amber-200 bg-white/80 p-5 text-sm text-zinc-500">Henüz öne çıkan ilan yok.</p>
            ) : (
              topListings.slice(0, 3).map((listing) => (
                <ListingCard key={listing.id} listing={listing} variant="warm" />
              ))
            )}
          </div>
        </div>
      </section>

      <section className="fixed bottom-3 left-3 right-3 z-40 rounded-2xl border border-amber-100 bg-white/95 p-3 shadow-lg backdrop-blur lg:static lg:z-auto lg:bg-white/80 lg:shadow-sm">
        <div className="grid grid-cols-2 gap-2 lg:grid-cols-6">
          <Button asChild className="h-12 bg-orange-500 hover:bg-orange-600">
            <Link href="/pazar">Pazar</Link>
          </Button>

          <Button asChild variant="outline" className="h-12">
            <Link href="/messages">Mesaj Gönder</Link>
          </Button>

          <Button asChild variant="outline" className="h-12">
            <Link href="/akis">Akış</Link>
          </Button>

          <Button asChild variant="outline" className="h-12">
            <Link href="/board">Duyuru Yap</Link>
          </Button>

          <Button asChild variant="outline" className="h-12">
            <Link href="/carsi">Çarşıya Uğra</Link>
          </Button>

          <Button asChild variant="outline" className="h-12">
            <Link href="/polls">Oylamaya Katıl</Link>
          </Button>
        </div>
      </section>
    </div>
  );
}






