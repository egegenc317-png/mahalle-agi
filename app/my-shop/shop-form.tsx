"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Clock3 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CameraCaptureButton } from "@/components/camera-capture-button";
import { LocationHelpCard } from "@/components/location-help-card";
import { fetchJsonWithTimeout } from "@/lib/client/fetch-json-with-timeout";
import { requestPreciseLocation } from "@/lib/client/request-location";

type ClosedDayMode = "OPEN" | "FULL_DAY" | "RANGE";
type ClosedDayState = { day: number; label: string; mode: ClosedDayMode; start: string; end: string };

const WEEK_DAYS: Array<{ day: number; label: string }> = [
  { day: 1, label: "Pazartesi" },
  { day: 2, label: "Sali" },
  { day: 3, label: "Carsamba" },
  { day: 4, label: "Persembe" },
  { day: 5, label: "Cuma" },
  { day: 6, label: "Cumartesi" },
  { day: 0, label: "Pazar" }
];

type ClosedHourInput = {
  day: number;
  mode: "FULL_DAY" | "RANGE";
  start?: string;
  end?: string;
};

type ShopFormProps = {
  initialShopName?: string | null;
  initialLocationText?: string | null;
  initialLat?: number | null;
  initialLng?: number | null;
  initialBusinessCategory?: string | null;
  initialShopLogo?: string | null;
  initialBusinessClosedHours?: ClosedHourInput[] | null;
};

export function ShopForm({
  initialShopName,
  initialLocationText,
  initialLat,
  initialLng,
  initialBusinessCategory,
  initialShopLogo,
  initialBusinessClosedHours
}: ShopFormProps) {
  const router = useRouter();
  const [shopName, setShopName] = useState(initialShopName || "");
  const [locationText, setLocationText] = useState(initialLocationText || "");
  const [businessCategory, setBusinessCategory] = useState(initialBusinessCategory || "");
  const [shopLogoUrl, setShopLogoUrl] = useState(initialShopLogo || "");
  const [shopLogoFile, setShopLogoFile] = useState<File | null>(null);
  const [closedDays, setClosedDays] = useState<ClosedDayState[]>(() =>
    WEEK_DAYS.map((item) => {
      const initial = initialBusinessClosedHours?.find((row) => row.day === item.day);
      if (!initial) {
        return { day: item.day, label: item.label, mode: "OPEN", start: "12:00", end: "14:00" };
      }
      if (initial.mode === "FULL_DAY") {
        return { day: item.day, label: item.label, mode: "FULL_DAY", start: "12:00", end: "14:00" };
      }
      return {
        day: item.day,
        label: item.label,
        mode: "RANGE",
        start: initial.start || "12:00",
        end: initial.end || "14:00"
      };
    })
  );
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(
    typeof initialLat === "number" && typeof initialLng === "number" ? { lat: initialLat, lng: initialLng } : null
  );
  const [locLoading, setLocLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const uploadInputClass = "h-11 border-amber-200 bg-white file:mr-3 file:rounded-lg file:border-0 file:bg-gradient-to-r file:from-[#f59e0b] file:to-[#ea580c] file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-white hover:file:from-[#d97706] hover:file:to-[#c2410c]";

  const refreshLocation = async () => {
    setLocLoading(true);
    setError(null);
    try {
      const pos = await requestPreciseLocation();
      setCoords({ lat: pos.lat, lng: pos.lng });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Konum alınamadı. Lütfen konum iznini aç.");
    } finally {
      setLocLoading(false);
    }
  };

  useEffect(() => {
    if (!coords) refreshLocation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const uploadFile = async (file: File) => {
    const fd = new FormData();
    fd.append("file", file);
    const { response, data } = await fetchJsonWithTimeout("/api/upload", { method: "POST", body: fd }, 30000);
    if (!response.ok) throw new Error(data.error || "Logo yüklenemedi.");
    return String(data.url);
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!coords) {
      setError("Konum bulunamadı. Önce konumu yenile.");
      return;
    }

    setSaving(true);
    try {
      let logoToSave = shopLogoUrl || null;
      if (shopLogoFile) {
        try {
          logoToSave = await uploadFile(shopLogoFile);
        } catch (err) {
          setError(err instanceof Error ? err.message : "Logo yüklenemedi.");
          return;
        }
      }

      const { response, data } = await fetchJsonWithTimeout(
        "/api/shop",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            shopName,
            businessCategory,
            shopLogo: logoToSave,
            businessClosedHours: closedDays
              .filter((item) => item.mode !== "OPEN")
              .map((item) => {
                if (item.mode === "FULL_DAY") {
                  return { day: item.day, mode: "FULL_DAY" as const };
                }
                return { day: item.day, mode: "RANGE" as const, start: item.start, end: item.end };
              }),
            locationText,
            locationLat: coords.lat,
            locationLng: coords.lng
          })
        },
        30000
      );

      if (!response.ok) {
        setError(data.error || "Dükkan kaydedilemedi");
        return;
      }

      if (logoToSave) setShopLogoUrl(logoToSave);
      setShopLogoFile(null);
      router.refresh();
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        setError("Kaydetme isteği zaman aşımına uğradı. Lütfen tekrar dene.");
        return;
      }
      setError(err instanceof Error ? err.message : "Dükkan kaydedilirken beklenmeyen bir hata oluştu.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="space-y-3 sm:space-y-4">
      <Input value={shopName} onChange={(e) => setShopName(e.target.value)} placeholder="Dükkan adı" required />
      <select
        value={businessCategory}
        onChange={(e) => setBusinessCategory(e.target.value)}
        className="h-10 w-full rounded-md border px-3"
        required
      >
        <option value="">Kategori seç</option>
        <option value="Market / Gida">Market / Gida</option>
        <option value="Kafe / Restoran">Kafe / Restoran</option>
        <option value="Kuafor / Bakim">Kuafor / Bakim</option>
        <option value="Tamir / Teknik Servis">Tamir / Teknik Servis</option>
        <option value="Egitim / Ders">Egitim / Ders</option>
        <option value="Diger">Diger</option>
      </select>
      <Input
        type="file"
        accept="image/jpeg,image/png"
        className={uploadInputClass}
        onChange={(e) => setShopLogoFile(e.target.files?.[0] || null)}
      />
      <CameraCaptureButton onCapture={(files) => setShopLogoFile(files[0] || null)} label="Kameradan Logo Çek" />
      {shopLogoUrl ? (
        <Image src={shopLogoUrl} alt="Dükkan logosu" width={64} height={64} className="h-16 w-16 rounded-md border object-cover" />
      ) : (
        <p className="text-xs text-zinc-500">Logo opsiyoneldir.</p>
      )}
      <Input value={locationText} onChange={(e) => setLocationText(e.target.value)} placeholder="Konum notu (opsiyonel)" />

      <div className="space-y-2 rounded-xl border border-amber-200 bg-amber-50/50 p-3">
        <p className="inline-flex items-center gap-2 text-xs font-semibold text-amber-800">
          <Clock3 className="h-3.5 w-3.5" />
          Kapalı saatleri düzenle
        </p>
        <p className="text-xs text-zinc-600">Çarşı ekranında dükkan bu plana göre açık/kapalı görünür.</p>
        <div className="space-y-2">
          {closedDays.map((item, index) => (
            <div key={item.day} className="grid grid-cols-1 gap-2 rounded-lg border border-amber-100 bg-white p-2 sm:grid-cols-[120px_1fr_auto_auto] sm:items-center">
              <p className="text-xs font-medium text-zinc-700">{item.label}</p>
              <select
                value={item.mode}
                onChange={(e) => {
                  const mode = e.target.value as ClosedDayMode;
                  setClosedDays((prev) => prev.map((row, rowIndex) => (rowIndex === index ? { ...row, mode } : row)));
                }}
                className="h-9 w-full rounded-md border border-zinc-200 bg-white px-2 text-xs"
              >
                <option value="OPEN">Açık</option>
                <option value="FULL_DAY">Tüm gün Kapalı</option>
                <option value="RANGE">Saat aralığında Kapalı</option>
              </select>
              <Input
                type="time"
                className="h-9 border-zinc-200 text-xs"
                value={item.start}
                disabled={item.mode !== "RANGE"}
                onChange={(e) =>
                  setClosedDays((prev) =>
                    prev.map((row, rowIndex) => (rowIndex === index ? { ...row, start: e.target.value } : row))
                  )
                }
              />
              <Input
                type="time"
                className="h-9 border-zinc-200 text-xs"
                value={item.end}
                disabled={item.mode !== "RANGE"}
                onChange={(e) =>
                  setClosedDays((prev) =>
                    prev.map((row, rowIndex) => (rowIndex === index ? { ...row, end: e.target.value } : row))
                  )
                }
              />
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-md border bg-zinc-50 px-3 py-2 text-xs text-zinc-700">
        {coords ? `Canlı konum: ${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)}` : "Canlı konum alınamadı."}
      </div>

      <LocationHelpCard compact />

      <Button type="button" variant="outline" size="sm" className="w-full sm:w-auto" onClick={refreshLocation} disabled={locLoading}>
        {locLoading ? "Konum alınıyor..." : "Konumu Yenile"}
      </Button>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <Button type="submit" className="w-full sm:w-auto" disabled={saving}>{saving ? "Kaydediliyor..." : "Dükkanı Kaydet"}</Button>
    </form>
  );
}





