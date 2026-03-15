"use client";

import { useEffect, useRef } from "react";

export function UsageHeartbeat({ enabled }: { enabled: boolean }) {
  const lastTsRef = useRef<number>(Date.now());

  useEffect(() => {
    if (!enabled) return;

    lastTsRef.current = Date.now();

    const sendPing = async (seconds: number, useBeacon = false) => {
      if (seconds <= 0) return;
      try {
        if (useBeacon && typeof navigator !== "undefined" && typeof navigator.sendBeacon === "function") {
          const payload = new Blob([JSON.stringify({ seconds })], { type: "application/json" });
          navigator.sendBeacon("/api/usage/ping", payload);
          return;
        }
        await fetch("/api/usage/ping", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ seconds }),
          keepalive: true
        });
      } catch {
        // noop
      }
    };

    const flushElapsed = (useBeacon = false) => {
      const now = Date.now();
      const elapsed = Math.round((now - lastTsRef.current) / 1000);
      lastTsRef.current = now;
      if (elapsed > 0) {
        void sendPing(Math.max(1, Math.min(120, elapsed)), useBeacon);
      }
    };

    const tick = () => {
      if (document.visibilityState === "visible") {
        flushElapsed();
      }
    };

    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        lastTsRef.current = Date.now();
      } else {
        flushElapsed(true);
      }
    };

    const onPageHide = () => flushElapsed(true);

    const id = window.setInterval(tick, 30000);
    const warmupId = window.setTimeout(() => {
      if (document.visibilityState === "visible") {
        flushElapsed();
      }
    }, 12000);
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", onPageHide);

    return () => {
      window.clearInterval(id);
      window.clearTimeout(warmupId);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", onPageHide);
    };
  }, [enabled]);

  return null;
}


