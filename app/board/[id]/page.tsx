// @ts-nocheck
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { CalendarClock, Flag, MapPin, Megaphone, ShieldCheck } from "lucide-react";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { BoardPhotoGallery } from "@/components/board-photo-gallery";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const typeLabels: Record<string, string> = {
  ANNOUNCEMENT: "Duyuru",
  LOST_FOUND: "Kayıp / Bulundu",
  INFRASTRUCTURE: "Altyapı",
  NOISE: "Şikayet",
  EVENT: "Etkinlik"
};

function parsePhotos(raw: string | null | undefined) {
  if (!raw) return [] as string[];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((item) => typeof item === "string") : [];
  } catch {
    return [];
  }
}

export default async function BoardDetailPage({
  params,
  searchParams
}: {
  params: { id: string };
  searchParams?: { error?: string; success?: string };
}) {
  const session = await auth();
  if (!session) redirect("/auth/login");

  const post = await prisma.boardPost.findUnique({
    where: { id: params.id },
    include: { user: { select: { id: true, name: true } } }
  });
  if (!post) return notFound();
  const nextViewCount = (post.viewCount || 0) + 1;
  await prisma.boardPost.update({
    where: { id: post.id },
    data: { viewCount: nextViewCount }
  });

  const me = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (me && post.userId !== session.user.id) {
    const seen = new Set(me.seenBoardPostIds || []);
    if (!seen.has(post.id)) {
      seen.add(post.id);
      await prisma.user.update({
        where: { id: session.user.id },
        data: { lastBoardSeenAt: new Date(), seenBoardPostIds: Array.from(seen) }
      });
    }
  }

  const photos = parsePhotos((post as { photos?: string }).photos);
  const ownPost = session.user.id === post.userId;

  return (
    <div className="space-y-4">
      {searchParams?.error ? (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{searchParams.error}</p>
      ) : null}
      {searchParams?.success ? (
        <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{searchParams.success}</p>
      ) : null}

      <section className="relative overflow-hidden rounded-[24px] border border-amber-200 bg-[radial-gradient(circle_at_20%_10%,rgba(251,191,36,0.2),transparent_40%),radial-gradient(circle_at_85%_8%,rgba(251,146,60,0.18),transparent_35%),linear-gradient(135deg,#fff7ed_0%,#ffffff_50%,#fffbeb_100%)] p-4 shadow-xl sm:rounded-3xl sm:p-5">
        <div className="pointer-events-none absolute -left-16 -top-10 h-48 w-48 rounded-full bg-amber-300/20 blur-3xl" />
        <div className="pointer-events-none absolute -right-20 -bottom-14 h-56 w-56 rounded-full bg-orange-300/20 blur-3xl" />

        <div className="relative z-10 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="bg-orange-500 text-white">{typeLabels[post.type] || post.type}</Badge>
              <span className="inline-flex items-center gap-1 text-xs text-zinc-600"><CalendarClock className="h-3.5 w-3.5" /> {new Date(post.createdAt).toLocaleString("tr-TR")}</span>
            </div>
            <h1 className="text-2xl font-extrabold tracking-tight text-zinc-900 sm:text-3xl">{post.title}</h1>
            <p className="text-sm text-zinc-600">Yazan: {post.user.name}</p>
          </div>
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-[1.25fr_0.75fr]">
        <Card className="border-amber-200 bg-white/95 shadow-sm">
          <CardHeader>
            <CardTitle className="text-zinc-900">Duyuru İçeriği</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="rounded-xl border border-amber-100 bg-amber-50/40 p-4 text-sm leading-relaxed text-zinc-700">{post.body}</p>

            {post.locationText ? (
              <p className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs text-zinc-600">
                <MapPin className="h-3.5 w-3.5 text-orange-500" /> {post.locationText}
              </p>
            ) : null}

            {photos.length > 0 ? <BoardPhotoGallery photos={photos} title={post.title} /> : null}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card className="border-zinc-200 bg-white/95 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">Aksiyonlar</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button asChild variant="outline" className="w-full border-amber-300 text-amber-700 hover:bg-amber-50">
                <Link href="/board">Panoya Don</Link>
              </Button>

              {!ownPost ? (
                <form action="/api/conversations" method="post" className="space-y-2">
                  <input type="hidden" name="userId" value={post.userId} />
                  <input type="hidden" name="contextTitle" value={`Pano: ${post.title}`} />
                  <Button type="submit" className="w-full bg-orange-500 text-white hover:bg-orange-600">
                    <Megaphone className="mr-2 h-4 w-4" /> Duyuru Sahibine Yaz
                  </Button>
                </form>
              ) : null}

              {!ownPost ? (
                <form action="/api/reports" method="post" className="space-y-2">
                  <input type="hidden" name="targetType" value="BOARD" />
                  <input type="hidden" name="targetId" value={post.id} />
                  <input type="hidden" name="reason" value="Uygunsuz duyuru" />
                  <input type="hidden" name="details" value={`Duyuru: ${post.title}`} />
                  <Button type="submit" variant="outline" className="w-full border-red-300 text-red-700 hover:bg-red-50">
                    <Flag className="mr-2 h-4 w-4" /> Şikayet Et
                  </Button>
                </form>
              ) : null}
            </CardContent>
          </Card>

          <Card className="border-emerald-100 bg-emerald-50/60 shadow-sm">
            <CardContent className="pt-6 text-sm text-zinc-700">
              <p className="inline-flex items-center gap-2 font-semibold text-zinc-900">
                <ShieldCheck className="h-4 w-4 text-emerald-600" /> Topluluk Güvenligi
              </p>
              <p className="mt-2">Şikayet sistemi suistimali azaltmak için tekil kayıt kabul eder. Eşik degeri 3 olan duyurular otomatik olarak panodan kaldırılır.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}




