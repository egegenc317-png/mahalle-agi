"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

import { Badge } from "@/components/ui/badge";

const typeLabels: Record<string, string> = {
  ANNOUNCEMENT: "Duyuru",
  LOST_FOUND: "Kayıp / Bulundu",
  INFRASTRUCTURE: "Altyapı",
  NOISE: "Şikayet",
  EVENT: "Etkinlik"
};

type BoardPostItem = {
  id: string;
  userId: string;
  type: string;
  title: string;
  body: string;
  locationText?: string | null;
  createdAt: string | Date;
  user: { id: string; name: string; username?: string | null; image?: string | null };
};

export function BoardFeed({
  initialItems,
  totalItems,
  queryString,
  currentUserId,
  currentUserRole
}: {
  initialItems: BoardPostItem[];
  totalItems: number;
  queryString: string;
  currentUserId: string;
  currentUserRole: string;
}) {
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
      const res = await fetch(`/api/board${queryString}${connector}page=${nextPage}&pageSize=12`, { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      const nextItems = Array.isArray(data?.items) ? data.items : [];
      setItems((current) => {
        const seen = new Set(current.map((item) => item.id));
        return current.concat(nextItems.filter((item: BoardPostItem) => !seen.has(item.id)));
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
    return (
      <div className="relative z-10 rounded-xl border border-dashed border-[#9f744a] bg-[#f6ecd9]/80 p-12 text-center text-sm text-[#5f452e]">
        Bu filtrede duyuru bulunamadı.
      </div>
    );
  }

  return (
    <>
      <div className="relative z-10 grid gap-3 lg:grid-cols-2">
        {items.map((post) => {
          const ownPost = post.userId === currentUserId;
          const canDeletePost = ownPost || currentUserRole === "ADMIN";

          return (
            <article key={post.id} className="group relative rounded-xl border border-[#d6b48d] bg-[#f7efe1] p-3 shadow-md transition hover:-translate-y-0.5 hover:shadow-lg sm:p-4">
              {canDeletePost ? (
                <form action={`/api/board/${post.id}/delete`} method="post" className="absolute right-2 top-2 z-20">
                  <button type="submit" className="rounded-md border border-red-200 bg-white/90 px-2 py-1 text-[11px] font-medium text-red-700 shadow-sm hover:bg-red-50">
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
                  <Link href={`/profile/${post.user.id}`} className="inline-flex items-center gap-2 rounded-full border border-[#d2ae84] bg-white/90 px-2.5 py-1.5 text-[#6b4a2d] shadow-sm transition hover:bg-white">
                    {post.user.image ? (
                      <Image src={post.user.image} alt={post.user.name} width={22} height={22} className="h-[22px] w-[22px] rounded-full object-cover" />
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
      <div ref={sentinelRef} />
      {loading ? <p className="relative z-10 mt-4 text-sm text-[#6b4a2d]">Duyurular yükleniyor...</p> : null}
    </>
  );
}
