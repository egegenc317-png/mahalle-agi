"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { ListingCard } from "@/components/listing-card";

type ListingItem = Parameters<typeof ListingCard>[0]["listing"];

type ListingFeedProps = {
  initialItems: ListingItem[];
  totalItems: number;
  queryString: string;
};

export function ListingFeed({ initialItems, totalItems, queryString }: ListingFeedProps) {
  const [items, setItems] = useState(initialItems);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(initialItems.length < totalItems);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setItems(initialItems);
    setPage(1);
    setHasMore(initialItems.length < totalItems);
  }, [initialItems, totalItems, queryString]);

  const loadMore = useCallback(async () => {
    if (loading || !hasMore) return;
    setLoading(true);
    try {
      const nextPage = page + 1;
      const connector = queryString ? "&" : "?";
      const res = await fetch(`/api/listings${queryString}${connector}page=${nextPage}&pageSize=12`, { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      const nextItems = Array.isArray(data?.items) ? data.items : [];
      setItems((current) => {
        const seen = new Set(current.map((item) => item.id));
        return current.concat(nextItems.filter((item: ListingItem) => !seen.has(item.id)));
      });
      setPage(nextPage);
      setHasMore(Boolean(data?.hasMore));
    } finally {
      setLoading(false);
    }
  }, [hasMore, loading, page, queryString]);

  useEffect(() => {
    if (!hasMore) return;
    const node = sentinelRef.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) void loadMore();
      },
      { rootMargin: "320px 0px" }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [hasMore, loadMore]);

  if (!items.length) {
    return <div className="rounded-2xl border border-dashed border-amber-300 bg-white/80 p-10 text-center text-sm text-zinc-600">Pazarda bu filtreye uygün ilan bulunamadı.</div>;
  }

  return (
    <section className="rounded-2xl border border-amber-100 bg-gradient-to-b from-white to-amber-50/40 p-3 shadow-sm">
      <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm font-semibold text-zinc-800">Bugünün Tezgahları</p>
        <p className="text-xs text-zinc-500">Yeniden eskiye sıralı</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((listing) => (
          <ListingCard key={listing.id} listing={listing} variant="warm" />
        ))}
      </div>
      <div ref={sentinelRef} />
      {loading ? <p className="mt-4 text-sm text-zinc-500">İlanlar yükleniyor...</p> : null}
      {!hasMore && totalItems > items.length ? null : null}
    </section>
  );
}
