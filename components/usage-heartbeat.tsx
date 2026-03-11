"use client";

import { useEffect, useRef } from "react";

export function UsageHeartbeat({ enabled }: { enabled: boolean }) {
  const lastTsRef = useRef<number>(Date.now());

  useEffect(() => {
    if (!enabled) return;

    lastTsRef.current = Date.now();

    const sendPing = async (seconds: number) => {
      if (seconds <= 0) return;
      try {
        await fetch("/api/usage/ping", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ seconds })
        });
      } catch {
        // noop
      }
    };

    const tick = () => {
      const now = Date.now();
      const elapsed = Math.round((now - lastTsRef.current) / 1000);
      lastTsRef.current = now;
      if (document.visibilityState === "visible") {
        void sendPing(Math.max(1, Math.min(120, elapsed || 60)));
      }
    };

    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        lastTsRef.current = Date.now();
      }
    };

    const id = window.setInterval(tick, 60000);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [enabled]);

  return null;
}


