"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Heart, MessageCircle, Repeat2, SendHorizonal } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

type FlowPostActionsProps = {
  postId: string;
  likedByMe: boolean;
  likeCount: number;
  replyCount: number;
  repostCount: number;
};

export function FlowPostActions({
  postId,
  likedByMe,
  likeCount,
  replyCount,
  repostCount
}: FlowPostActionsProps) {
  const router = useRouter();
  const [liked, setLiked] = useState(likedByMe);
  const [likes, setLikes] = useState(likeCount);
  const [openReply, setOpenReply] = useState(false);
  const [replyBody, setReplyBody] = useState("");
  const [loadingReply, setLoadingReply] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleLike = async () => {
    const previousLiked = liked;
    const previousCount = likes;
    const nextLiked = !previousLiked;
    setLiked(nextLiked);
    setLikes(previousCount + (nextLiked ? 1 : -1));

    const res = await fetch(`/api/akis/${postId}/like`, { method: "POST" });
    if (!res.ok) {
      setLiked(previousLiked);
      setLikes(previousCount);
    } else {
      router.refresh();
    }
  };

  const repost = async () => {
    const res = await fetch("/api/akis", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        body: "Bu paylaşımı yeniden bıraktı.",
        repostOfPostId: postId
      })
    });
    if (res.ok) router.refresh();
  };

  const submitReply = async () => {
    if (!replyBody.trim()) return;
    setLoadingReply(true);
    setError(null);

    const res = await fetch("/api/akis", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        body: replyBody.trim(),
        parentPostId: postId
      })
    });
    const data = await res.json().catch(() => ({}));
    setLoadingReply(false);

    if (!res.ok) {
      setError(data.error || "Cevap gönderilemedi.");
      return;
    }

    setReplyBody("");
    setOpenReply(false);
    router.refresh();
  };

  return (
    <div className="mt-4 space-y-3">
      <div className="flex flex-wrap items-center gap-5 text-sm text-zinc-500">
        <button type="button" onClick={toggleLike} className={`inline-flex items-center gap-1.5 transition ${liked ? "text-rose-600" : "hover:text-rose-600"}`}>
          <Heart className={`h-4 w-4 ${liked ? "fill-current" : ""}`} /> {likes}
        </button>
        <button type="button" onClick={() => setOpenReply((v) => !v)} className="inline-flex items-center gap-1.5 transition hover:text-orange-600">
          <MessageCircle className="h-4 w-4" /> {replyCount}
        </button>
        <button type="button" onClick={repost} className="inline-flex items-center gap-1.5 transition hover:text-emerald-600">
          <Repeat2 className="h-4 w-4" /> {repostCount}
        </button>
      </div>

      {openReply ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-3">
          <Textarea
            value={replyBody}
            onChange={(e) => setReplyBody(e.target.value)}
            placeholder="Bu paylaşıma mahalle içinden cevap yaz..."
            className="min-h-24 rounded-2xl border-amber-200 bg-white"
          />
          {error ? <p className="mt-2 text-xs text-red-600">{error}</p> : null}
          <div className="mt-3 flex justify-end">
            <Button
              type="button"
              onClick={submitReply}
              disabled={loadingReply || !replyBody.trim()}
              className="bg-orange-500 text-white hover:bg-orange-600"
            >
              <SendHorizonal className="mr-2 h-4 w-4" />
              {loadingReply ? "Gönderiliyor..." : "Cevapla"}
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
