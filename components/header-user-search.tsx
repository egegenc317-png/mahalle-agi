"use client";

import Link from "next/link";
import { Search } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type SearchUser = {
  id: string;
  name: string;
  username?: string | null;
};

export function HeaderUserSearch({ isLoggedIn, compact = false }: { isLoggedIn: boolean; compact?: boolean }) {
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<SearchUser[]>([]);

  useEffect(() => {
    if (!isLoggedIn || q.trim().length < 2) {
      setItems([]);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/users/search?q=${encodeURIComponent(q.trim())}`);
        const data = await res.json();
        if (res.ok) {
          setItems(Array.isArray(data.items) ? data.items : []);
        } else {
          setItems([]);
        }
      } catch {
        setItems([]);
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [q, isLoggedIn]);

  if (!isLoggedIn) return null;

  const showDropdown = q.trim().length >= 2;

  return (
    <div className={`relative w-full ${compact ? "max-w-none" : "max-w-[33rem]"}`}>
      <div className={`relative border border-amber-200 bg-gradient-to-r from-white to-amber-50/70 shadow-md shadow-amber-100/70 ${compact ? "rounded-2xl p-1.5" : "rounded-full p-1.5"}`}>
        <Search className={`pointer-events-none absolute top-1/2 -translate-y-1/2 text-amber-700 ${compact ? "left-4 h-4.5 w-4.5" : "left-5 h-5 w-5"}`} />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Kullanıcı ara..."
          className={`border-0 bg-transparent focus-visible:ring-0 ${compact ? "h-10 rounded-xl pl-10 pr-20 text-sm" : "h-10 rounded-full pl-12 pr-24 text-base"}`}
        />
        <Button
          type="button"
          size="sm"
          onClick={() => setQ((prev) => prev.trim())}
          className={`absolute right-1.5 top-1.5 bg-gradient-to-r from-orange-500 to-amber-500 font-semibold text-white hover:from-orange-600 hover:to-amber-600 ${compact ? "h-8 rounded-xl px-3 text-xs" : "h-8 rounded-full px-4 text-sm"}`}
        >
          Ara
        </Button>
      </div>

      {showDropdown ? (
        <div className={`absolute left-0 right-0 z-50 rounded-2xl border border-amber-200 bg-white/95 p-1.5 shadow-xl shadow-amber-100/60 backdrop-blur ${compact ? "top-12" : "top-14"}`}>
          {loading ? <p className="px-2 py-2 text-xs text-zinc-500">Aranıyor...</p> : null}
          {!loading && items.length === 0 ? <p className="px-2 py-2 text-xs text-zinc-500">Sonuç bulunamadı.</p> : null}
          {!loading
            ? items.map((user) => (
                <Link
                  key={user.id}
                  href={`/profile/${user.id}`} prefetch
                  className="block rounded-xl px-2.5 py-2 text-sm transition hover:bg-amber-50"
                  onClick={() => setQ("")}
                >
                  <span className="font-medium text-zinc-900">{user.name}</span>
                  <span className="ml-2 text-xs text-zinc-500">@{user.username || "Kullanıcı"}</span>
                </Link>
              ))
            : null}
        </div>
      ) : null}
    </div>
  );
}





