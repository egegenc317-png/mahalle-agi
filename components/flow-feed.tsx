"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Flame, MapPin, Repeat2 } from "lucide-react";

import { FlowComposer } from "@/components/flow-composer";
import { FlowPostActions } from "@/components/flow-post-actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

type FlowLike = { userId: string };
type FlowReply = {
  id: string;
  body: string;
  createdAt: string | Date;
  user: { id: string; name: string; username?: string | null };
};

export type FlowFeedPost = {
  id: string;
  userId: string;
  body: string;
  createdAt: string | Date;
  photos?: string[];
  user: { id: string; name: string; username?: string | null; image?: string | null };
  likes?: FlowLike[];
  replies?: FlowReply[];
  reposts?: Array<{ id: string }>;
  repostOfPost?: {
    body: string;
    user?: { name?: string; username?: string | null };
  } | null;
};

function formatRelative(date: string | Date) {
  const diffMs = Date.now() - new Date(date).getTime();
  const diffMin = Math.max(1, Math.floor(diffMs / 60000));
  if (diffMin < 60) return `${diffMin} dk`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour} sa`;
  const diffDay = Math.floor(diffHour / 24);
  return `${diffDay} g`;
}

export function FlowFeed({
  initialPosts,
  totalPosts,
  neighborhoodLabel,
  neighborhoodName,
  currentUserId,
  currentUserRole
}: {
  initialPosts: FlowFeedPost[];
  totalPosts: number;
  neighborhoodLabel: string;
  neighborhoodName: string;
  currentUserId: string;
  currentUserRole: string;
}) {
  const [posts, setPosts] = useState(initialPosts);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(initialPosts.length < totalPosts);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setPosts(initialPosts);
    setPage(1);
    setHasMore(initialPosts.length < totalPosts);
  }, [initialPosts, totalPosts]);

  const loadMore = useCallback(async () => {
    if (loading || !hasMore) return;
    setLoading(true);
    try {
      const nextPage = page + 1;
      const res = await fetch(`/api/akis?page=${nextPage}&pageSize=15`, { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      const nextItems = Array.isArray(data?.items) ? data.items : [];
      setPosts((current) => {
        const seen = new Set(current.map((item) => item.id));
        return current.concat(nextItems.filter((item: FlowFeedPost) => !seen.has(item.id)));
      });
      setPage(nextPage);
      setHasMore(Boolean(data?.hasMore));
    } finally {
      setLoading(false);
    }
  }, [hasMore, loading, page]);

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

  const countLabel = useMemo(() => `${totalPosts} paylaşım`, [totalPosts]);

  return (
    <div className="space-y-5 pb-24 lg:pb-0">
      <section className="sticky top-[88px] z-20 rounded-[24px] border border-amber-200 bg-white/95 px-4 py-3 shadow-sm backdrop-blur sm:px-5">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <Badge className="bg-orange-500 text-white">Akış</Badge>
              <span className="inline-flex items-center gap-1 text-xs font-medium text-zinc-500">
                <MapPin className="h-3.5 w-3.5 text-orange-500" /> {neighborhoodLabel}
              </span>
            </div>
            <h1 className="mt-2 text-xl font-bold tracking-tight text-zinc-900 sm:text-2xl">Mahalle Akışı</h1>
          </div>
          <Dialog>
            <DialogTrigger asChild>
              <Button className="h-10 rounded-xl bg-orange-500 px-4 text-white hover:bg-orange-600">
                Gönderi Ekle
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl rounded-[28px] border-amber-200 bg-[linear-gradient(180deg,#fffef9_0%,#fff7ec_100%)] p-0 shadow-[0_30px_80px_rgba(115,72,18,0.2)]">
              <DialogHeader className="border-b border-amber-200 px-5 py-4">
                <DialogTitle className="text-lg font-bold text-zinc-900">Yeni gönderi bırak</DialogTitle>
                <DialogDescription className="text-sm text-zinc-600">
                  Mahallendeki akışa kısa, net ve görünen bir paylaşım ekle.
                </DialogDescription>
              </DialogHeader>
              <div className="p-5">
                <FlowComposer neighborhoodLabel={neighborhoodName || "Mahalle"} compact />
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </section>

      <section className="overflow-hidden rounded-[26px] border border-amber-200 bg-white shadow-sm">
        <div className="border-b border-amber-100 bg-[linear-gradient(180deg,#fff8ee_0%,#fffdf9_100%)] px-4 py-3 sm:px-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.24em] text-orange-600">
                <Flame className="h-3.5 w-3.5" /> Komşu Yazıları
              </p>
              <p className="mt-1 text-sm text-zinc-600">Mahallene özel, hafif ve aşağı doğru akan akış.</p>
            </div>
            <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-800">
              {countLabel}
            </Badge>
          </div>
        </div>

        <div className="divide-y divide-amber-100/80">
          {posts.length === 0 ? (
            <div className="px-5 py-12 text-center">
              <p className="text-base font-semibold text-zinc-900">Akış Henüz Sessiz</p>
              <p className="mt-2 text-sm text-zinc-600">Sağ üstteki gönderi ekle butonundan ilk yazıyı bırak.</p>
            </div>
          ) : (
            posts.map((post) => (
              <article key={post.id} className="bg-white px-4 py-4 transition hover:bg-amber-50/20 sm:px-5">
                <div className="flex items-start gap-3">
                  <Link href={`/profile/${post.user.id}`} className="shrink-0">
                    {post.user.image ? (
                      <Image src={post.user.image} alt={post.user.name} width={52} height={52} className="h-12 w-12 rounded-full object-cover ring-2 ring-amber-100" />
                    ) : (
                      <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-amber-300 to-orange-400 text-sm font-bold text-white ring-2 ring-amber-100">
                        {post.user.name.slice(0, 1).toUpperCase()}
                      </span>
                    )}
                  </Link>

                  <div className="min-w-0 flex-1">
                    {post.repostOfPost ? (
                      <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
                        <Repeat2 className="h-3.5 w-3.5" /> Yeniden paylaşıldı
                      </div>
                    ) : null}

                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <Link href={`/profile/${post.user.id}`} className="text-base font-bold text-zinc-900 hover:text-orange-600">
                        {post.user.name}
                      </Link>
                      <span className="text-sm text-zinc-500">@{post.user.username || post.user.name}</span>
                      <span className="text-sm text-zinc-400">·</span>
                      <span className="text-sm text-zinc-500">{formatRelative(post.createdAt)}</span>
                    </div>

                    <p className="mt-2 whitespace-pre-wrap text-[15px] leading-7 text-zinc-800">{post.body}</p>

                    {post.repostOfPost ? (
                      <div className="mt-4 rounded-[24px] border border-amber-200 bg-[linear-gradient(180deg,#fffdf7_0%,#fff8ee_100%)] p-4">
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                          <span className="text-sm font-bold text-zinc-900">{post.repostOfPost.user?.name}</span>
                          <span className="text-sm text-zinc-500">@{post.repostOfPost.user?.username || post.repostOfPost.user?.name}</span>
                        </div>
                        <p className="mt-2 whitespace-pre-wrap text-[15px] leading-7 text-zinc-800">{post.repostOfPost.body}</p>
                      </div>
                    ) : null}

                    {post.photos?.length ? (
                      <div className={`mt-4 grid gap-2 ${post.photos.length === 1 ? "grid-cols-1" : "grid-cols-2"}`}>
                        {post.photos.map((photo, index) => (
                          <div key={`${post.id}-photo-${index}`} className="overflow-hidden rounded-3xl border border-amber-200 bg-amber-50">
                            <Image src={photo} alt={`${post.user.name} paylaşımı görseli ${index + 1}`} width={900} height={700} className="h-full max-h-[420px] w-full object-cover" />
                          </div>
                        ))}
                      </div>
                    ) : null}

                    <FlowPostActions
                      postId={post.id}
                      likedByMe={Boolean(post.likes?.some((like) => like.userId === currentUserId))}
                      likeCount={post.likes?.length || 0}
                      replyCount={post.replies?.length || 0}
                      repostCount={post.reposts?.length || 0}
                      canDelete={post.userId === currentUserId || currentUserRole === "ADMIN"}
                    />

                    {post.replies?.length ? (
                      <div className="mt-4 space-y-3 rounded-[24px] border border-amber-100 bg-amber-50/35 p-3">
                        {post.replies.map((reply) => (
                          <div key={reply.id} className="rounded-2xl border border-amber-100 bg-white px-3 py-3">
                            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                              <Link href={`/profile/${reply.user.id}`} className="text-sm font-bold text-zinc-900 hover:text-orange-600">
                                {reply.user.name}
                              </Link>
                              <span className="text-xs text-zinc-500">@{reply.user.username || reply.user.name}</span>
                              <span className="text-xs text-zinc-400">·</span>
                              <span className="text-xs text-zinc-500">{formatRelative(reply.createdAt)}</span>
                            </div>
                            <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-zinc-700">{reply.body}</p>
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </div>
              </article>
            ))
          )}
        </div>

        <div ref={sentinelRef} />
        {loading ? <p className="px-5 py-4 text-sm text-zinc-500">Akış yükleniyor...</p> : null}
      </section>
    </div>
  );
}
