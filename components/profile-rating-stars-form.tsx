"use client";

import { useState } from "react";
import { Star } from "lucide-react";

import { Button } from "@/components/ui/button";

export function ProfileRatingStarsForm({ targetUserId, defaultStars = 4 }: { targetUserId: string; defaultStars?: number }) {
  const [selected, setSelected] = useState<number>(Math.min(5, Math.max(1, Math.round(defaultStars))));
  const [hovered, setHovered] = useState<number | null>(null);

  const active = hovered ?? selected;

  return (
    <form action={`/api/profile/${targetUserId}/rating`} method="post" className="space-y-3">
      <input type="hidden" name="score" value={(selected * 2).toFixed(1)} />

      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((value) => {
          const filled = value <= active;
          return (
            <button
              key={value}
              type="button"
              onClick={() => setSelected(value)}
              onMouseEnter={() => setHovered(value)}
              onMouseLeave={() => setHovered(null)}
              className="rounded-md p-1 transition hover:scale-110"
              aria-label={`${value} yildiz`}
            >
              <Star className={`h-7 w-7 ${filled ? "fill-amber-400 text-amber-500" : "text-zinc-300"}`} />
            </button>
          );
        })}
        <span className="ml-2 text-sm font-medium text-zinc-700">{selected}.0 / 5</span>
      </div>

      <Button type="submit" className="bg-zinc-900 text-white hover:bg-zinc-800">
        Puan Gönder
      </Button>
    </form>
  );
}

