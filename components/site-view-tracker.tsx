"use client";

import { useEffect } from "react";

const STORAGE_KEY = "dm:last-pageview-date";

function getDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function SiteViewTracker() {
  useEffect(() => {
    const todayKey = getDateKey();
    const storedKey = window.localStorage.getItem(STORAGE_KEY);
    if (storedKey === todayKey) return;

    fetch("/api/usage/pageview", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      keepalive: true
    })
      .then(() => {
        window.localStorage.setItem(STORAGE_KEY, todayKey);
      })
      .catch(() => {
        // Sayfa kullanımı etkilenmesin; ziyaret takibi sessizce tekrar denenir.
      });
  }, []);

  return null;
}
