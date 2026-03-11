"use client";
import { useEffect, useState } from "react";
import { Search, UserRoundPlus } from "lucide-react";

import { Input } from "@/components/ui/input";
import { StartConversationLink } from "@/components/start-conversation-link";

type UserItem = {
  id: string;
  name: string;
  username?: string | null;
};

export function MessagesUserSearch({ currentUserId }: { currentUserId: string }) {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<UserItem[]>([]);

  useEffect(() => {
    if (query.trim().length < 2) {
      setItems([]);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/users/search?q=${encodeURIComponent(query.trim())}`);
        const data = await res.json();
        const rows = Array.isArray(data.items) ? data.items : [];
        setItems(rows.filter((item: UserItem) => item.id !== currentUserId));
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [query, currentUserId]);

  return (
    <div className="space-y-2 rounded-xl border border-amber-200 bg-white p-3 shadow-sm">
      <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
        <UserRoundPlus className="h-3.5 w-3.5" />
        Kişi Ara ve Mesaj Başlat
      </p>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="İsim veya Kullanıcı adı yaz..."
          className="border-amber-200 pl-9"
        />
      </div>
      {loading ? <p className="text-xs text-zinc-500">Aranıyor...</p> : null}
      {!loading && query.trim().length >= 2 && items.length === 0 ? (
        <p className="text-xs text-zinc-500">Eşleşen Kullanıcı bulunamadı.</p>
      ) : null}
      {items.length > 0 ? (
        <div className="space-y-2">
          {items.map((item) => (
            <StartConversationLink
              key={item.id}
              href={`/api/conversations/direct?userId=${encodeURIComponent(item.id)}&contextTitle=${encodeURIComponent(`${item.name} ile Sohbet`)}`}
              className="block rounded-lg border border-amber-100 bg-amber-50/50 px-3 py-2 text-sm text-zinc-700 transition hover:border-amber-300 hover:bg-amber-100/40"
              loadingLabel="Sohbet açılıyor..."
            >
              <p className="font-medium text-zinc-900">{item.name}</p>
              <p className="text-xs text-zinc-600">@{item.username || "Kullanıcı"}</p>
            </StartConversationLink>
          ))}
        </div>
      ) : null}
    </div>
  );
}





