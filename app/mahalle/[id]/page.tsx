// @ts-nocheck
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ListingCard } from "@/components/listing-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default async function NeighborhoodPage({
  params,
  searchParams
}: {
  params: { id: string };
  searchParams: { type?: string; category?: string; q?: string; minPrice?: string; maxPrice?: string; sort?: string };
}) {
  const session = await auth();
  if (!session) redirect("/auth/login");
  if (!session.user.locationScope) redirect("/onboarding/scope");
  if (session.user.locationScope === "DISTRICT") redirect("/map");
  if (!session.user.neighborhoodId) redirect("/onboarding/neighborhood");
  if (session.user.neighborhoodId !== params.id) {
    redirect(`/mahalle/${session.user.neighborhoodId}`);
  }

  const where: Record<string, unknown> = {
    neighborhoodId: params.id,
    status: "ACTIVE"
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

  const neighborhood = await prisma.neighborhood.findUnique({ where: { id: params.id } });
  const listings = await prisma.listing.findMany({
    where,
    include: { user: { select: { id: true, name: true, username: true, image: true } } },
    orderBy: searchParams.sort === "oldest" ? { createdAt: "asc" } : { createdAt: "desc" }
  });

  return (
    <div className="space-y-6">
      <section className="rounded-xl border bg-white p-4">
        <h1 className="mb-2 text-xl font-semibold">{neighborhood?.city} / {neighborhood?.district} / {neighborhood?.name}</h1>
        <p className="mb-4 text-sm text-muted-foreground">Sadece bu mahalledeki ilanlar gösterilir.</p>
        <form className="grid gap-3 md:grid-cols-6">
          <Input name="q" placeholder="Ara" defaultValue={searchParams.q} className="md:col-span-2" />
          <Input name="type" placeholder="Tip" defaultValue={searchParams.type} />
          <Input name="category" placeholder="Kategori" defaultValue={searchParams.category} />
          <Input name="minPrice" placeholder="Min" defaultValue={searchParams.minPrice} />
          <Input name="maxPrice" placeholder="Max" defaultValue={searchParams.maxPrice} />
          <Button type="submit">Filtrele</Button>
        </form>
      </section>

      {listings.length === 0 ? (
        <div className="rounded-xl border bg-white p-8 text-center text-sm text-muted-foreground">Bu mahallede ilan bulunamadı.</div>
      ) : (
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {listings.map((listing) => (
            <ListingCard key={listing.id} listing={listing} />
          ))}
        </section>
      )}
    </div>
  );
}



