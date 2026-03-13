// @ts-nocheck
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useRef, useState } from "react";

type LeafletMap = {
  setView: (coords: [number, number], zoom: number) => LeafletMap;
  remove: () => void;
};

type LeafletLike = {
  map: (
    element: HTMLElement,
    options?: {
      zoomControl?: boolean;
      attributionControl?: boolean;
      dragging?: boolean;
      scrollWheelZoom?: boolean;
      doubleClickZoom?: boolean;
      boxZoom?: boolean;
      keyboard?: boolean;
      tap?: boolean;
      touchZoom?: boolean;
    }
  ) => LeafletMap;
  tileLayer: (url: string, options?: { attribution?: string }) => { addTo: (map: LeafletMap) => void };
  divIcon: (options: { className: string; html: string; iconSize: [number, number]; iconAnchor: [number, number] }) => unknown;
  marker: (coords: [number, number], options: { icon: unknown }) => { addTo: (map: LeafletMap) => void };
};

const tileAttribution = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';

function loadLeafletAssets() {
  if (typeof window === "undefined") return Promise.resolve();
  if ((window as any).L) return Promise.resolve();

  const cssId = "leaflet-css";
  const scriptId = "leaflet-js";

  if (!document.getElementById(cssId)) {
    const link = document.createElement("link");
    link.id = cssId;
    link.rel = "stylesheet";
    link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
    document.head.appendChild(link);
  }

  return new Promise<void>((resolve, reject) => {
    const existing = document.getElementById(scriptId) as HTMLScriptElement | null;
    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error("Leaflet yüklenemedi")), { once: true });
      return;
    }

    const script = document.createElement("script");
    script.id = scriptId;
    script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Leaflet yüklenemedi"));
    document.body.appendChild(script);
  });
}

export function NeighborhoodPreviewMap({ lat, lng }: { lat: number; lng: number }) {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    let mapInstance: LeafletMap | null = null;

    const init = async () => {
      if (!mapRef.current) return;
      await loadLeafletAssets();
      if (!active || !mapRef.current || !(window as any).L) return;

      const L = (window as any).L as LeafletLike;
      mapInstance = L.map(mapRef.current, {
        zoomControl: false,
        attributionControl: false,
        dragging: false,
        scrollWheelZoom: false,
        doubleClickZoom: false,
        boxZoom: false,
        keyboard: false,
        tap: false,
        touchZoom: false
      }).setView([lat, lng], 14);

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: tileAttribution
      }).addTo(mapInstance);

      const icon = L.divIcon({
        className: "",
        html: '<div style="width:18px;height:18px;border-radius:9999px;background:#ef4444;border:3px solid white;box-shadow:0 10px 24px rgba(0,0,0,.32)"></div>',
        iconSize: [18, 18],
        iconAnchor: [9, 9]
      });

      L.marker([lat, lng], { icon }).addTo(mapInstance);
    };

    init().catch(() => {
      if (active) setFailed(true);
    });

    return () => {
      active = false;
      if (mapInstance) mapInstance.remove();
    };
  }, [lat, lng]);

  if (failed) {
    return (
      <div className="flex h-full min-h-[220px] items-center justify-center bg-[linear-gradient(180deg,#f7f1e6_0%,#efe7d8_100%)] px-6 text-center text-sm text-stone-600">
        Harita önizlemesi şu an yüklenemedi.
      </div>
    );
  }

  return <div ref={mapRef} className="h-full min-h-[220px] w-full" />;
}
