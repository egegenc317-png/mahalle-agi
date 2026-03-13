"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

const STORAGE_KEY = "dm:last-pageview-date";

function getDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function SiteViewTracker() {
  const pathname = usePathname();

  useEffect(() => {
    const todayKey = getDateKey();
    const pageKey = `${STORAGE_KEY}:${pathname || "/"}`;
    const storedKey = window.localStorage.getItem(pageKey);
    if (storedKey === todayKey) return;

    fetch("/api/usage/pageview", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pathname: pathname || "/" }),
      keepalive: true
    })
      .then(() => {
        window.localStorage.setItem(pageKey, todayKey);
      })
      .catch(() => {
        // Sayfa kullanımı etkilenmesin; ziyaret takibi sessizce tekrar denenir.
      });
  }, [pathname]);

  return null;
}
