// @ts-nocheck
import Link from "next/link";
import { redirect } from "next/navigation";
import { Megaphone, Plus, Search } from "lucide-react";
import Image from "next/image";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

const typeLabels: Record<string, string> = {
  ANNOUNCEMENT: "Duyuru",
  LOST_FOUND: "Kayıp / Bulundu",
  INFRASTRUCTURE: "Altyapı",
  NOISE: "Şikayet",
  EVENT: "Etkinlik"
};

type BoardPostView = {
  id: string;
  userId: string;
  type: string;
  title: string;
  body: string;
  locationText?: string | null;
  createdAt: Date;
  user: { id: string; name: string; username?: string | null; image?: string | null };
};

export default async function BoardPage({
  searchParams
}: {
  searchParams: { type?: string; q?: string; error?: string; success?: string; page?: string };
}) {
  const session = await auth();
  if (!session) redirect("/auth/login");
  if (!session.user.locationScope) redirect("/onboarding/scope");
  if (!session.user.neighborhoodId) redirect("/onboarding/neighborhood");

  const where: Record<string, unknown> = {
    neighborhoodId: session.user.neighborhoodId
  };

  if (searchParams.type && searchParams.type !== "ALL") where.type = searchParams.type;

  if (searchParams.q) {
    where.OR = [
      { title: { contains: searchParams.q, mode: "insensitive" } },
      { body: { contains: searchParams.q, mode: "insensitive" } }
    ];
  }

  const page = Math.max(1, Number(searchParams.page || "1") || 1);
  const pageSize = 12;
  const skip = (page - 1) * pageSize;

  const activeType = searchParams.type || "ALL";

  const [posts, totalPosts] = await Promise.all([
    prisma.boardPost.findMany({
      where,
      include: { user: { select: { id: true, name: true, username: true, image: true } } },
      orderBy: { createdAt: "desc" },
      take: pageSize,
      skip
    }),
    prisma.boardPost.count({ where })
  ]);

  const totalPages = Math.max(1, Math.ceil(totalPosts / pageSize));
  const createPageHref = (nextPage: number) => {
    const params = new URLSearchParams();
    if (activeType !== "ALL") params.set("type", activeType);
    if (searchParams.q) params.set("q", searchParams.q);
    if (nextPage > 1) params.set("page", String(nextPage));
    return `/board${params.size ? `?${params.toString()}` : ""}`;
  };

  return (
    <div className="space-y-4 pb-8 sm:pb-10">
      <section className="rounded-2xl border border-[#b68a58] bg-gradient-to-b from-[#d8b386] to-[#c89b6a] p-1.5 shadow-xl sm:p-2">
        <div className="rounded-xl border border-[#8a633f] bg-gradient-to-b from-[#d1ab7f] to-[#bf9061] p-3 sm:p-4">
          <div className="rounded-lg border border-[#9b744f] bg-[#f4e4cc] p-3 shadow-inner sm:p-4">
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
              <h1 className="flex items-center gap-2 text-xl font-bold tracking-tight text-[#5b3a22] sm:text-2xl">
                <Megaphone className="h-5 w-5 text-[#d2751f]" /> Mahalle Panosu
              </h1>
              <Button asChild className="w-full bg-[#e58a2d] text-white hover:bg-[#d97f23] sm:w-auto">
                <Link href="/board/new" className="inline-flex items-center gap-1.5">
                  <Plus className="h-4 w-4" /> Duyuru Ekle
                </Link>
              </Button>
            </div>

            {searchParams.error ? (
              <p className="mb-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {searchParams.error}
              </p>
            ) : null}
            {searchParams.success ? (
              <p className="mb-3 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                {searchParams.success}
              </p>
            ) : null}

            <div className="mb-4 space-y-3 rounded-xl border border-[#d1b08b] bg-[#fffaf2] p-3">
              <form className="grid gap-2 md:grid-cols-[1fr_auto]">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-[#987558]" />
                  <Input name="q" defaultValue={searchParams.q} placeholder="Duyurularda ara" className="border-[#d1b08b] bg-white pl-8" />
                </div>
                <div className="flex gap-2">
                  <input type="hidden" name="type" value={activeType} />
                  <Button type="submit" variant="outline" className="border-[#c49a6c] text-[#6b4a2d]">
                    Filtrele
                  </Button>
                </div>
              </form>

                <div className="flex flex-wrap gap-2">
                {[
                  ["ALL", "Tüm"],
                  ["ANNOUNCEMENT", "Duyuru"],
                  ["LOST_FOUND", "Kayıp"],
                  ["INFRASTRUCTURE", "Altyapı"],
                  ["NOISE", "Şikayet"],
                  ["EVENT", "Etkinlik"]
                ].map(([value, label]) => {
                  const params = new URLSearchParams();
                  params.set("type", value);
                  if (searchParams.q) params.set("q", searchParams.q);
                  const href = `/board?${params.toString()}`;
                  const selected = activeType === value;
                  return (
                    <Button key={value} asChild size="sm" variant={selected ? "default" : "outline"} className={`h-9 ${selected ? "bg-[#e58a2d] hover:bg-[#d97f23]" : "border-[#c49a6c] text-[#6b4a2d]"}`}>
                      <Link href={href}>{label}</Link>
                    </Button>
                  );
                })}
              </div>
            </div>

            <div className="relative overflow-hidden rounded-xl border border-[#9f744a] bg-[#c9a37a] p-4 shadow-inner">
              <div className="pointer-events-none absolute inset-0 opacity-20" style={{ backgroundImage: "radial-gradient(#8f6a46 0.6px, transparent 0.6px)", backgroundSize: "10px 10px" }} />

              {posts.length === 0 ? (
                <div className="relative z-10 rounded-xl border border-dashed border-[#9f744a] bg-[#f6ecd9]/80 p-12 text-center text-sm text-[#5f452e]">
                  Bu filtrede duyuru bulunamadı.
                </div>
              ) : (
                <div className="relative z-10 grid gap-3 lg:grid-cols-2">
                  {(posts as BoardPostView[]).map((post) => {
                    const ownPost = post.userId === session.user.id;
                    const canDeletePost = ownPost || session.user.role === "ADMIN";

                    return (
                      <article key={post.id} className="group relative rounded-xl border border-[#d6b48d] bg-[#f7efe1] p-3 shadow-md transition hover:-translate-y-0.5 hover:shadow-lg sm:p-4">
                        {canDeletePost ? (
                          <form action={`/api/board/${post.id}/delete`} method="post" className="absolute right-2 top-2 z-20">
                            <button
                              type="submit"
                              className="rounded-md border border-red-200 bg-white/90 px-2 py-1 text-[11px] font-medium text-red-700 shadow-sm hover:bg-red-50"
                            >
                              Sil
                            </button>
                          </form>
                        ) : null}

                        <div className="relative z-20">
                          <div className="mb-2 flex items-center justify-between gap-2">
                            <Badge variant="outline" className="border-[#c49a6c] bg-white/60 text-[#6b4a2d]">
                              {typeLabels[post.type] || post.type}
                            </Badge>
                            <span className="text-[11px] text-[#7b5a3d]">{new Date(post.createdAt).toLocaleString("tr-TR")}</span>
                          </div>

                          <Link href={`/board/${post.id}`} className="block rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d8893a] focus-visible:ring-offset-2 focus-visible:ring-offset-[#f7efe1]">
                            <h3 className="text-xl leading-tight text-[#5a3b23] sm:text-2xl">{post.title}</h3>
                            <p className="mt-2 max-h-16 overflow-hidden text-sm leading-relaxed text-[#65462b]">{post.body}</p>
                            {post.locationText ? <p className="mt-1 text-xs text-[#6b4a2d]">Konum: {post.locationText}</p> : null}
                          </Link>

                          <div className="mt-3 flex flex-col gap-2 text-xs text-[#6e5035] sm:flex-row sm:items-center sm:justify-between">
                            <Link
                              href={`/profile/${post.user.id}`}
                              className="inline-flex items-center gap-2 rounded-full border border-[#d2ae84] bg-white/90 px-2.5 py-1.5 text-[#6b4a2d] shadow-sm transition hover:bg-white"
                            >
                              {post.user.image ? (
                                <Image
                                  src={post.user.image}
                                  alt={post.user.name}
                                  width={22}
                                  height={22}
                                  className="h-[22px] w-[22px] rounded-full object-cover"
                                />
                              ) : (
                                <span className="inline-flex h-[22px] w-[22px] items-center justify-center rounded-full bg-[#efc48c] text-[10px] font-semibold text-[#7a4e21]">
                                  {post.user.name.slice(0, 1).toUpperCase()}
                                </span>
                              )}
                              <span className="max-w-[120px] truncate">@{post.user.username || post.user.name}</span>
                            </Link>
                            <Link href={`/board/${post.id}`} className="font-medium text-[#7b5a3d] transition hover:text-[#5a3b23]">
                              Detaya git
                            </Link>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </div>

            {totalPages > 1 ? (
              <div className="mt-4 flex flex-col gap-3 rounded-xl border border-[#d1b08b] bg-[#fffaf2] p-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs text-[#6b4a2d]">
                  Sayfa {page} / {totalPages} - Toplam {totalPosts} duyuru
                </p>
                <div className="flex gap-2">
                  <Button asChild variant="outline" size="sm" className="border-[#c49a6c] text-[#6b4a2d]" disabled={page <= 1}>
                    <Link href={createPageHref(page - 1)} aria-disabled={page <= 1}>Önceki</Link>
                  </Button>
                  <Button asChild variant="outline" size="sm" className="border-[#c49a6c] text-[#6b4a2d]" disabled={page >= totalPages}>
                    <Link href={createPageHref(page + 1)} aria-disabled={page >= totalPages}>Sonraki</Link>
                  </Button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </section>
    </div>
  );
}




