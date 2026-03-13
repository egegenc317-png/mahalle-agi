"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";

import { Badge } from "@/components/ui/badge";

type MapItem = {
  id: string;
  kind: "LISTING" | "BOARD";
  type: string;
  title: string;
  body: string;
  userName: string;
  href: string;
  createdAt: string;
  imageUrl?: string | null;
  businessCategory?: string | null;
  locationText?: string | null;
  locationLat?: number | null;
  locationLng?: number | null;
};

declare global {
  interface Window {
    L?: LeafletLike;
  }
}

type LeafletBounds = {
  extend: (coords: [number, number]) => void;
  pad: (ratio: number) => LeafletBounds;
};

type LeafletMap = {
  setView: (coords: [number, number], zoom: number) => LeafletMap;
  fitBounds: (bounds: LeafletBounds) => void;
  remove: () => void;
};

type LeafletMarker = {
  addTo: (map: LeafletMap) => LeafletMarker;
  bindPopup: (node: HTMLElement) => void;
};

type LeafletLike = {
  map: (element: HTMLElement, options?: { zoomControl?: boolean }) => LeafletMap;
  tileLayer: (url: string, options?: { attribution?: string }) => { addTo: (map: LeafletMap) => void };
  latLngBounds: (items: Array<[number, number]>) => LeafletBounds;
  divIcon: (options: { className: string; html: string; iconSize: [number, number]; iconAnchor: [number, number] }) => unknown;
  marker: (coords: [number, number], options: { icon: unknown }) => LeafletMarker;
};

const tileAttribution = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';

function paletteFor(item: MapItem) {
  if (item.type === "SHOP") {
    return {
      marker: "#2563eb",
      badge: "border-blue-300 bg-blue-50 text-blue-700",
      card: "border-blue-200 bg-blue-50/40"
    };
  }
  if (item.kind === "BOARD" && item.type === "INFRASTRUCTURE") {
    return {
      marker: "#f97316",
      badge: "border-orange-300 bg-orange-50 text-orange-700",
      card: "border-orange-200 bg-orange-50/40"
    };
  }
  if (item.kind === "LISTING" && item.type === "PRODUCT") {
    return {
      marker: "#16a34a",
      badge: "border-emerald-300 bg-emerald-50 text-emerald-700",
      card: "border-emerald-200 bg-emerald-50/40"
    };
  }
  return {
    marker: "#3f3f46",
    badge: "",
    card: ""
  };
}

function loadLeafletAssets() {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.L) return Promise.resolve();

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
    const existingScript = document.getElementById(scriptId) as HTMLScriptElement | null;
    if (existingScript) {
      existingScript.addEventListener("load", () => resolve(), { once: true });
      existingScript.addEventListener("error", () => reject(new Error("Leaflet yüklenemedi")), { once: true });
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

async function geocodeLocation(query: string) {
  const res = await fetch(
    `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(query)}`,
    { headers: { Accept: "application/json" } }
  );
  if (!res.ok) return null;
  const data = (await res.json()) as Array<{ lat: string; lon: string }>;
  if (!data[0]) return null;

  const lat = Number(data[0].lat);
  const lng = Number(data[0].lon);
  if (Number.isNaN(lat) || Number.isNaN(lng)) return null;
  return { lat, lng };
}

function buildPopupNode(item: MapItem) {
  const root = document.createElement("div");
  root.className = "space-y-1";

  const title = document.createElement("p");
  title.className = "font-semibold";
  title.textContent = item.title;

  const meta = document.createElement("p");
  meta.className = "text-xs";
  meta.textContent = `${item.kind === "LISTING" ? "İlan" : "Duyuru"} • ${item.userName}${item.businessCategory ? ` • ${item.businessCategory}` : ""}`;

  const link = document.createElement("a");
  link.href = item.href;
  link.textContent = "Detayı ac";
  link.style.color = "#ea580c";
  link.style.fontSize = "12px";
  link.style.textDecoration = "underline";

  root.appendChild(title);
  root.appendChild(meta);
  if (item.imageUrl) {
    const image = document.createElement("img");
    image.src = item.imageUrl;
    image.alt = item.title;
    image.style.width = "72px";
    image.style.height = "72px";
    image.style.objectFit = "cover";
    image.style.borderRadius = "8px";
    image.style.border = "1px solid #e4e4e7";
    root.appendChild(image);
  }
  root.appendChild(link);
  return root;
}

export function UnifiedNeighborhoodMap({
  items,
  defaultCenter
}: {
  items: MapItem[];
  defaultCenter?: { lat: number; lng: number } | null;
}) {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const [statusText, setStatusText] = useState("Harita hazırlanıyor...");

  const sortedItems = useMemo(
    () =>
      [...items].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      ),
    [items]
  );

  useEffect(() => {
    let active = true;
    let mapInstance: LeafletMap | null = null;
    const geocodeCache = new Map<string, { lat: number; lng: number } | null>();

    const start = async () => {
      if (!mapRef.current) return;

      await loadLeafletAssets();
      if (!active || !mapRef.current || !window.L) return;

      const L = window.L;
      const initialCenter =
        defaultCenter && typeof defaultCenter.lat === "number" && typeof defaultCenter.lng === "number"
          ? [defaultCenter.lat, defaultCenter.lng]
          : [39.0, 35.0];
      const initialZoom = defaultCenter ? 15 : 6;
      mapInstance = L.map(mapRef.current, {
        zoomControl: true
      }).setView(initialCenter as [number, number], initialZoom);

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: tileAttribution
      }).addTo(mapInstance);

      const bounds = L.latLngBounds([]);
      let markerCount = 0;

      for (const item of sortedItems) {
        if (!active) break;

        let lat = typeof item.locationLat === "number" ? item.locationLat : null;
        let lng = typeof item.locationLng === "number" ? item.locationLng : null;

        if ((lat === null || lng === null) && item.locationText?.trim()) {
          const key = item.locationText.trim().toLowerCase();
          if (!geocodeCache.has(key)) {
            const point = await geocodeLocation(item.locationText.trim());
            geocodeCache.set(key, point);
          }
          const cached = geocodeCache.get(key) || null;
          lat = cached?.lat ?? null;
          lng = cached?.lng ?? null;
        }

        if (lat === null || lng === null) continue;

        const palette = paletteFor(item);
        const icon = L.divIcon({
          className: "",
          html: `<div style="width:14px;height:14px;border-radıus:9999px;background:${palette.marker};border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,.35)"></div>`,
          iconSize: [14, 14],
          iconAnchor: [7, 7]
        });

        const marker = L.marker([lat, lng], { icon }).addTo(mapInstance);
        marker.bindPopup(buildPopupNode(item));
        bounds.extend([lat, lng]);
        markerCount += 1;
      }

      if (markerCount > 0) {
        mapInstance.fitBounds(bounds.pad(0.22));
        setStatusText(`${markerCount} konum haritada gösteriliyor.`);
      } else {
        setStatusText(defaultCenter ? "Bu mahallede henüz konumlu içerik yok." : "Konum bulunamadı. İlan veya duyuruya konum ekleyin.");
      }
    };

    start().catch(() => {
      if (active) setStatusText("Harita yüklenemedi.");
    });

    return () => {
      active = false;
      if (mapInstance) {
        mapInstance.remove();
      }
    };
  }, [defaultCenter, sortedItems]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2 rounded-md border bg-white px-3 py-2 text-xs text-zinc-700">
        <span className="font-medium text-zinc-800">Harita Efsanesi:</span>
        <span className="inline-flex items-center gap-1">
          <span className="h-2.5 w-2.5 rounded-full bg-blue-600" /> İşletme
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="h-2.5 w-2.5 rounded-full bg-orange-500" /> Altyapı Duyurusu
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-600" /> İkinci El İlan
        </span>
      </div>
      <div ref={mapRef} className="h-[70vh] min-h-[520px] w-full rounded-xl border" />
      <p className="text-xs text-zinc-500">{statusText}</p>

      <div className="grid gap-2 sm:grid-cols-2">
        {sortedItems.map((item) => (
          <div
            key={`${item.kind}-${item.id}`}
            className={`rounded-lg border bg-white p-3 ${paletteFor(item).card}`}
          >
            <div className="mb-1 flex items-center justify-between gap-2">
              <Badge
                variant={item.kind === "LISTING" ? "default" : "outline"}
                className={paletteFor(item).badge}
              >
                {item.kind === "LISTING" ? `İlan • ${item.type}` : `Duyuru • ${item.type}`}
              </Badge>
              <span className="text-xs text-zinc-500">{item.userName}</span>
            </div>
            {item.imageUrl ? (
              <Image src={item.imageUrl} alt={item.title} width={64} height={64} className="mb-2 h-16 w-16 rounded-md border object-cover" />
            ) : null}
            <p className="font-medium">{item.title}</p>
            <p className="line-clamp-2 text-sm text-zinc-600">{item.body}</p>
            {item.businessCategory ? <p className="mt-1 text-xs text-zinc-500">Kategori: {item.businessCategory}</p> : null}
            {item.locationText ? <p className="mt-1 text-xs text-zinc-500">Konum: {item.locationText}</p> : null}
            <a className="mt-2 inline-block text-sm text-orange-600 hover:underline" href={item.href}>
              Detayı Ac
            </a>
          </div>
        ))}
      </div>
    </div>
  );
}





