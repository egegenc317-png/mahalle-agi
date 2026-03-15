// @ts-nocheck
import Link from "next/link";
import { redirect } from "next/navigation";
import { Megaphone, Plus, Search } from "lucide-react";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { BoardFeed } from "@/components/board-feed";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

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

  const params = new URLSearchParams();
  if (activeType !== "ALL") params.set("type", activeType);
  if (searchParams.q) params.set("q", searchParams.q);
  const queryString = params.size ? `?${params.toString()}` : "";

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

              <BoardFeed
                initialItems={posts}
                totalItems={totalPosts}
                queryString={queryString}
                currentUserId={session.user.id}
                currentUserRole={session.user.role}
              />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}




