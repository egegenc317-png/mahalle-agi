"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Megaphone, MessageCircle } from "lucide-react";

type MessageAlert = {
  id: string;
  peer: string;
  body: string;
  createdAt: string;
  isGroup?: boolean;
  senderName: string;
  isMention: boolean;
};

type BoardAlert = {
  id: string;
  title: string;
  userName: string;
};

type LiveNotificationsPanelProps = {
  initialMessageAlerts: MessageAlert[];
  initialBoardAlerts: BoardAlert[];
};

export function LiveNotificationsPanel({
  initialMessageAlerts,
  initialBoardAlerts
}: LiveNotificationsPanelProps) {
  const [messageAlerts, setMessageAlerts] = useState(initialMessageAlerts);
  const [boardAlerts, setBoardAlerts] = useState(initialBoardAlerts);

  const loadNotifications = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications/live", { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      setMessageAlerts(Array.isArray(data?.messageAlerts) ? data.messageAlerts : []);
      setBoardAlerts(Array.isArray(data?.boardAlerts) ? data.boardAlerts : []);
    } catch {
      // Bildirim ekranı sessizce son bilinen veriyle kalabilir.
    }
  }, []);

  useEffect(() => {
    loadNotifications();

    const refresh = () => void loadNotifications();
    const interval = window.setInterval(refresh, 5000);
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    window.addEventListener("mahalle:refresh-summary", refresh as EventListener);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
      window.removeEventListener("mahalle:refresh-summary", refresh as EventListener);
    };
  }, [loadNotifications]);

  return (
    <div className="space-y-4 p-3 sm:p-4">
      {messageAlerts.length === 0 && boardAlerts.length === 0 ? (
        <p className="rounded-xl border border-dashed border-amber-200 bg-white p-4 text-sm text-zinc-500">
          Yeni bildirim yok.
        </p>
      ) : null}

      {messageAlerts.length > 0 ? (
        <section className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Yeni Mesajlar</p>
          {messageAlerts.map((item) => (
            <Link
              key={item.id}
              href={`/api/notifications/open?type=message&conversationId=${encodeURIComponent(item.id)}`}
              className="block rounded-xl border border-amber-200 bg-amber-50/40 p-3 transition hover:bg-amber-100/40"
            >
              <p className="inline-flex items-center gap-2 text-sm font-semibold text-zinc-900">
                <MessageCircle className="h-4 w-4 text-orange-500" />
                {item.isGroup
                  ? item.isMention
                    ? `${item.senderName}, ${item.peer} grubunda seni etiketledi`
                    : `${item.peer} grubunda yeni mesaj var`
                  : `${item.peer} kişisi sana bir mesaj gönderdi`}
              </p>
              <p className="mt-1 truncate text-sm text-zinc-700">{item.body}</p>
            </Link>
          ))}
        </section>
      ) : null}

      {boardAlerts.length > 0 ? (
        <section className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Yeni Duyurular</p>
          {boardAlerts.map((post) => (
            <Link
              key={post.id}
              href={`/api/notifications/open?type=board&postId=${encodeURIComponent(post.id)}`}
              className="block rounded-xl border border-amber-200 bg-white p-3 transition hover:bg-amber-50"
            >
              <p className="inline-flex items-center gap-2 text-sm font-semibold text-zinc-900">
                <Megaphone className="h-4 w-4 text-orange-500" />
                {post.userName} kişisi yeni bir duyuru yayınladı
              </p>
              <p className="mt-1 truncate text-sm text-zinc-700">{post.title}</p>
            </Link>
          ))}
        </section>
      ) : null}
    </div>
  );
}
