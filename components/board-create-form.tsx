"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ImagePlus, LocateFixed, MapPin, PencilLine, SendHorizonal } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { CameraCaptureButton } from "@/components/camera-capture-button";
import { requestPreciseLocation } from "@/lib/client/request-location";

async function fetchJsonWithTimeout(input: RequestInfo | URL, init?: RequestInit, timeoutMs = 20000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(input, {
      ...init,
      signal: controller.signal
    });
    const data = await response.json().catch(() => ({}));
    return { response, data };
  } finally {
    clearTimeout(timeout);
  }
}

export function BoardCreateForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [locationPreview, setLocationPreview] = useState<{ lat: number; lng: number } | null>(null);
  const [locLoading, setLocLoading] = useState(false);
  const [selectedPhotos, setSelectedPhotos] = useState<File[]>([]);
  const uploadInputClass = "h-11 rounded-xl border-amber-200 bg-white file:mr-3 file:rounded-lg file:border-0 file:bg-gradient-to-r file:from-[#f59e0b] file:to-[#ea580c] file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-white hover:file:from-[#d97706] hover:file:to-[#c2410c]";

  const refreshLocation = async () => {
    setLocLoading(true);
    setError(null);
    try {
      const coords = await requestPreciseLocation();
      setLocationPreview({ lat: coords.lat, lng: coords.lng });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Konum alınamadı.");
    } finally {
      setLocLoading(false);
    }
  };

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const form = new FormData(e.currentTarget);
      const files = selectedPhotos.filter((f) => f.size > 0);

      if (files.length > 6) {
        setError("En fazla 6 fotoğraf yüklenebilir.");
        return;
      }

      const uploadedPhotos = await Promise.all(
        files.map(async (file) => {
          const fd = new FormData();
          fd.append("file", file);
          const { response, data } = await fetchJsonWithTimeout("/api/upload", { method: "POST", body: fd }, 30000);
          if (!response.ok) {
            throw new Error(data.error || "Fotoğraf yüklenemedi.");
          }
          return String(data.url);
        })
      );

      const coords: { lat: number; lng: number } | null = locationPreview;

      const payload = {
        type: String(form.get("type") || "ANNOUNCEMENT"),
        title: String(form.get("title") || ""),
        body: String(form.get("body") || ""),
        photos: uploadedPhotos,
        ...(coords
          ? {
              locationLat: coords.lat,
              locationLng: coords.lng
            }
          : {})
      };

      const { response, data } = await fetchJsonWithTimeout(
        "/api/board",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        },
        30000
      );

      if (!response.ok) {
        setError(data.error || "Duyuru kaydedilemedi.");
        return;
      }

      if (!data.id) {
        setError("Duyuru oluşturuldu ama yönlendirme bilgisi alınamadı. Lütfen panoyu yenileyin.");
        return;
      }

      router.push(`/board/${data.id}`);
      router.refresh();
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        setError("İstek zaman aşımına uğradı. Lütfen tekrar deneyin.");
        return;
      }

      setError(err instanceof Error ? err.message : "Duyuru yayınlanırken beklenmeyen bir hata oluştu.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-1">
        <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Duyuru tipi</p>
        <select
          name="type"
          defaultValue="ANNOUNCEMENT"
          className="h-11 w-full rounded-xl border border-amber-200 bg-white px-3 text-sm text-zinc-800 shadow-sm focus:border-orange-400 focus:outline-none"
        >
          <option value="ANNOUNCEMENT">Duyuru</option>
          <option value="LOST_FOUND">Kayıp / Bulundu</option>
          <option value="INFRASTRUCTURE">Altyapı</option>
          <option value="NOISE">Şikayet</option>
          <option value="EVENT">Etkinlik</option>
        </select>
      </div>

      <div className="space-y-1">
        <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
          <PencilLine className="h-3.5 w-3.5" /> Başlık
        </p>
        <Input name="title" placeholder="Duyuruyu tek satırda net anlat" className="h-11 rounded-xl border-amber-200 bg-white shadow-sm focus-visible:ring-orange-300" required />
      </div>

      <div className="space-y-1">
        <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Duyuru metni</p>
        <Textarea name="body" placeholder="Detayları, saatleri ve gerekliyse ek bilgileri yaz..." className="min-h-40 rounded-xl border-amber-200 bg-white shadow-sm focus-visible:ring-orange-300" required />
      </div>

      <div className="space-y-2 rounded-xl border border-amber-200 bg-amber-50/40 p-3">
        <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-zinc-600">
          <ImagePlus className="h-3.5 w-3.5" /> Fotoğraf (opsiyonel)
        </p>
        <Input
          name="photos"
          type="file"
          accept="image/jpeg,image/png"
          multiple
          className={uploadInputClass}
          onChange={(e) => setSelectedPhotos(Array.from(e.target.files || []))}
        />
        <CameraCaptureButton
          multiple
          onCapture={(files) =>
            setSelectedPhotos((prev) => {
              const next = [...prev, ...files];
              return next.slice(0, 6);
            })
          }
          label="Anlık Fotoğraf Çek"
        />
        <p className="text-xs text-zinc-600">
          {selectedPhotos.length > 0
            ? `${selectedPhotos.length} Fotoğraf seçildi`
            : "En fazla 6 Fotoğraf ekleyebilirsin. Panoda değil, detay sayfasında görünür."}
        </p>
      </div>

      <div className="space-y-2 rounded-xl border border-amber-200 bg-white p-3 shadow-sm">
        <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
          <MapPin className="h-3.5 w-3.5" /> Konum (opsiyonel)
        </p>
        <div className="rounded-lg border border-amber-100 bg-amber-50/60 px-3 py-2 text-xs text-[#6b4a2d]">
          {locationPreview
            ? `Canlı konum: ${locationPreview.lat.toFixed(5)}, ${locationPreview.lng.toFixed(5)}`
            : "Konum eklemek istemiyorsan bu alanı boş bırakabilirsin."}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm" onClick={refreshLocation} disabled={locLoading} className="border-amber-300 text-amber-700 hover:bg-amber-50">
            <LocateFixed className="mr-1.5 h-4 w-4" />
            {locLoading ? "Konum alınıyor..." : "Konum Ekle"}
          </Button>
          {locationPreview ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setLocationPreview(null)}
              className="border-zinc-300 text-zinc-700 hover:bg-zinc-50"
            >
              Konumu Kaldır
            </Button>
          ) : null}
        </div>
      </div>

      {error ? <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p> : null}
      <Button type="submit" disabled={loading} className="h-12 w-full rounded-xl bg-gradient-to-r from-[#e58a2d] to-[#d97f23] text-white shadow-md hover:from-[#dc8126] hover:to-[#cc751f]">
        <SendHorizonal className="mr-2 h-4 w-4" />
        {loading ? "Gönderiliyor..." : "Duyuruyu Yayınla"}
      </Button>
    </form>
  );
}





