// @ts-nocheck
import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus, Search, Store } from "lucide-react";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ListingCard } from "@/components/listing-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default async function PazarPage({
  searchParams
}: {
  searchParams: { type?: string; category?: string; q?: string; minPrice?: string; maxPrice?: string; sort?: string };
}) {
  const session = await auth();
  if (!session) redirect("/auth/login");
  if (!session.user.neighborhoodId) redirect("/onboarding/neighborhood");

  const where: Record<string, unknown> = {
    status: "ACTIVE",
    neighborhoodId: session.user.neighborhoodId
  };
  if (searchParams.type) where.type = searchParams.type;
  if (searchParams.category) where.category = searchParams.category;

  if (searchParams.q) {
    where.OR = [
      { title: { contains: searchParams.q, mode: "insensitive" } },
      { description: { contains: searchParams.q, mode: "insensitive" } }
    ];
  }

  if (searchParams.minPrice || searchParams.maxPrice) {
    where.price = {
      gte: searchParams.minPrice ? Number(searchParams.minPrice) : undefined,
      lte: searchParams.maxPrice ? Number(searchParams.maxPrice) : undefined
    };
  }

  const listings = await prisma.listing.findMany({
    where,
    include: { user: { select: { id: true, name: true, username: true, image: true } } },
    orderBy: searchParams.sort === "oldest" ? { createdAt: "asc" } : { createdAt: "desc" }
  });

  return (
    <div className="space-y-5">
      <section className="relative overflow-hidden rounded-[26px] border border-[#d5aa7a] bg-[radial-gradient(circle_at_12%_10%,rgba(251,191,36,0.28),transparent_38%),radial-gradient(circle_at_88%_8%,rgba(251,146,60,0.26),transparent_34%),linear-gradient(135deg,#fff3e0_0%,#ffe7cc_52%,#fff6e9_100%)] p-4 shadow-lg sm:rounded-3xl sm:p-5">
        <div className="pointer-events-none absolute -left-14 -top-10 h-40 w-40 rounded-full bg-amber-300/30 blur-2xl" />
        <div className="pointer-events-none absolute -right-16 -bottom-12 h-44 w-44 rounded-full bg-orange-300/25 blur-2xl" />
        <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-10 bg-[repeating-linear-gradient(90deg,rgba(146,95,42,0.12)_0px,rgba(146,95,42,0.12)_16px,transparent_16px,transparent_30px)]" />

        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-amber-300 bg-white/70 px-3 py-1 text-sm font-semibold text-amber-800">
              <Store className="h-4 w-4" /> Pazar
            </p>
            <h1 className="mt-2 text-xl font-bold tracking-tight text-zinc-900 sm:text-2xl">Mahalle Pazarı</h1>
            <p className="text-sm text-zinc-700">Tezgah tezgah dolaş, sadece kendi mahallendeki aktif ilanları sıcak pazar havasında keşfet.</p>
            <div className="mt-2 flex flex-wrap gap-2 text-xs">
              <span className="rounded-full border border-amber-300 bg-white/80 px-3 py-1 text-amber-800">{listings.length} aktif ilan</span>
              <span className="rounded-full border border-amber-300 bg-white/80 px-3 py-1 text-amber-800">Sadece bu mahalledeki satıcılar</span>
            </div>
          </div>

          <Button asChild className="w-full bg-orange-500 shadow-md hover:bg-orange-600 sm:w-auto">
            <Link href="/listings/new">
              <Plus className="mr-1.5 h-4 w-4" /> İlan Ekle
            </Link>
          </Button>
        </div>

        <form className="grid gap-3 rounded-2xl border border-[#d8b084] bg-white/85 p-3 shadow-sm md:grid-cols-6">
          <div className="relative md:col-span-2">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
            <Input name="q" placeholder="Pazarda ara" defaultValue={searchParams.q} className="border-amber-200 bg-white pl-9" />
          </div>
          <Input name="type" placeholder="Tip (PRODUCT/SERVICE/JOB)" defaultValue={searchParams.type} className="border-amber-200 bg-white" />
          <Input name="category" placeholder="Kategori" defaultValue={searchParams.category} className="border-amber-200 bg-white" />
          <Input name="minPrice" placeholder="Min" defaultValue={searchParams.minPrice} className="border-amber-200 bg-white" />
          <Input name="maxPrice" placeholder="Max" defaultValue={searchParams.maxPrice} className="border-amber-200 bg-white" />
          <Button type="submit" variant="outline" className="w-full md:col-span-6 border-amber-300 text-amber-700 hover:bg-amber-50">
            Filtrele
          </Button>
        </form>
      </section>

      {listings.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-amber-300 bg-white/80 p-10 text-center text-sm text-zinc-600">Pazarda bu filtreye uygün ilan bulunamadı.</div>
      ) : (
        <section className="rounded-2xl border border-amber-100 bg-gradient-to-b from-white to-amber-50/40 p-3 shadow-sm">
          <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm font-semibold text-zinc-800">Bugünün Tezgahları</p>
            <p className="text-xs text-zinc-500">Yeniden eskiye Sıralı</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {listings.map((listing) => (
            <ListingCard key={listing.id} listing={listing} variant="warm" />
          ))}
          </div>
        </section>
      )}
    </div>
  );
}





