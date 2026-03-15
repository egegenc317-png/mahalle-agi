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
  const storageKey = "mahalle:live-notifications";

  const loadNotifications = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications/live", { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      const nextMessageAlerts = Array.isArray(data?.messageAlerts) ? data.messageAlerts : [];
      const nextBoardAlerts = Array.isArray(data?.boardAlerts) ? data.boardAlerts : [];
      setMessageAlerts(nextMessageAlerts);
      setBoardAlerts(nextBoardAlerts);
      try {
        window.sessionStorage.setItem(
          storageKey,
          JSON.stringify({ messageAlerts: nextMessageAlerts, boardAlerts: nextBoardAlerts, ts: Date.now() })
        );
      } catch {
        // cache yoksa sessiz geç
      }
    } catch {
      // Bildirim ekranı sessizce son bilinen veriyle kalabilir.
    }
  }, []);

  useEffect(() => {
    try {
      const cached = window.sessionStorage.getItem(storageKey);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed?.messageAlerts)) setMessageAlerts(parsed.messageAlerts);
        if (Array.isArray(parsed?.boardAlerts)) setBoardAlerts(parsed.boardAlerts);
      }
    } catch {
      // ignore cache parse issues
    }

    loadNotifications();

    const refresh = () => void loadNotifications();
    const onVisibility = () => {
      if (document.visibilityState === "visible") refresh();
    };
    const interval = window.setInterval(() => {
      if (document.visibilityState === "visible") refresh();
    }, 15000);
    let eventSource: EventSource | null = null;
    if (typeof window !== "undefined" && "EventSource" in window) {
      eventSource = new EventSource("/api/notifications/stream");
      eventSource.addEventListener("notifications", (event) => {
        try {
          const data = JSON.parse((event as MessageEvent).data);
          const nextMessageAlerts = Array.isArray(data?.messageAlerts) ? data.messageAlerts : [];
          const nextBoardAlerts = Array.isArray(data?.boardAlerts) ? data.boardAlerts : [];
          setMessageAlerts(nextMessageAlerts);
          setBoardAlerts(nextBoardAlerts);
          window.sessionStorage.setItem(
            storageKey,
            JSON.stringify({ messageAlerts: nextMessageAlerts, boardAlerts: nextBoardAlerts, ts: Date.now() })
          );
        } catch {
          // sse parse fail olursa polling devam eder
        }
      });
      eventSource.onerror = () => {
        eventSource?.close();
        eventSource = null;
      };
    }
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("mahalle:refresh-summary", refresh as EventListener);

    return () => {
      window.clearInterval(interval);
      eventSource?.close();
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", onVisibility);
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
