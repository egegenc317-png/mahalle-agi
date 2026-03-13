"use client";

import Link from "next/link";
import { signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Bell, LogOut } from "lucide-react";

import { Button } from "@/components/ui/button";

export function TopAuthButton({
  isLoggedIn,
  userId,
  userImage,
  unreadCount = 0,
  notificationHref = "/notifications",
  compact = false
}: {
  isLoggedIn: boolean;
  userId?: string;
  userImage?: string | null;
  unreadCount?: number;
  notificationHref?: string;
  compact?: boolean;
}) {
  const router = useRouter();
  const [liveUnreadCount, setLiveUnreadCount] = useState(unreadCount);

  useEffect(() => {
    setLiveUnreadCount(unreadCount);
  }, [unreadCount]);

  useEffect(() => {
    if (!isLoggedIn) return;

    let cancelled = false;
    let intervalId: number | null = null;

    const loadSummary = async () => {
      try {
        const res = await fetch("/api/me/shell-summary", { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled && typeof data?.unreadCount === "number") {
          setLiveUnreadCount(data.unreadCount);
        }
      } catch {
        // Bildirim özeti hata verse bile üst bar akıcı kalmalı.
      }
    };

    const refreshIfVisible = () => {
      if (document.visibilityState === "visible") {
        void loadSummary();
      }
    };

    loadSummary();
    intervalId = window.setInterval(refreshIfVisible, 5000);
    window.addEventListener("focus", refreshIfVisible);
    document.addEventListener("visibilitychange", refreshIfVisible);
    window.addEventListener("mahalle:refresh-summary", refreshIfVisible as EventListener);

    return () => {
      cancelled = true;
      if (intervalId) window.clearInterval(intervalId);
      window.removeEventListener("focus", refreshIfVisible);
      document.removeEventListener("visibilitychange", refreshIfVisible);
      window.removeEventListener("mahalle:refresh-summary", refreshIfVisible as EventListener);
    };
  }, [isLoggedIn]);

  if (!isLoggedIn) {
    return (
      <Button asChild size="sm" variant="outline" className={compact ? "h-10 rounded-xl px-3 text-sm" : undefined}>
        <Link href="/auth/login" prefetch>
          Profile Giriş Yap
        </Link>
      </Button>
    );
  }

  return (
    <div className={`inline-flex items-center ${compact ? "gap-1.5" : "gap-2"}`}>
      <Button asChild type="button" size="icon" variant="outline" className={`relative border-amber-200 bg-white ${compact ? "h-10 w-10 rounded-2xl" : "h-12 w-12 rounded-full"}`}>
        <Link href={notificationHref} prefetch aria-label="Bildirimler">
          <Bell className={`${compact ? "h-5 w-5" : "h-6 w-6"} text-amber-700`} />
          {liveUnreadCount > 0 ? (
            <span className="absolute right-0.5 top-0.5 h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-white" />
          ) : null}
          {liveUnreadCount > 0 ? (
            <span className="absolute -right-1 -top-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-orange-500 px-1 text-[11px] font-bold text-white">
              {liveUnreadCount > 9 ? "9+" : liveUnreadCount}
            </span>
          ) : null}
        </Link>
      </Button>

      {userId ? (
        <Link href={`/profile/${userId}`} prefetch aria-label="Profilim" className={`inline-flex items-center justify-center overflow-hidden border border-amber-200 bg-amber-50 ${compact ? "h-10 w-10 rounded-2xl" : "h-12 w-12 rounded-full"}`}>
          {userImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={userImage} alt="Profil" className="h-full w-full object-cover" />
          ) : (
            <span className="text-lg font-bold text-amber-700">P</span>
          )}
        </Link>
      ) : null}

      <Button
        type="button"
        size={compact ? "icon" : "sm"}
        variant="outline"
        aria-label="Çıkış Yap"
        className={compact ? "h-10 w-10 rounded-2xl border-amber-200 bg-white" : undefined}
        onClick={async () => {
          await signOut({ redirect: false });
          router.push("/auth/login");
          router.refresh();
        }}
      >
        {compact ? <LogOut className="h-4.5 w-4.5" /> : "Çıkış Yap"}
      </Button>
    </div>
  );
}
