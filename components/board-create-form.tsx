"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ImagePlus, LocateFixed, MapPin, PencilLine, SendHorizonal } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { CameraCaptureButton } from "@/components/camera-capture-button";

function getCurrentPosition(): Promise<{ lat: number; lng: number }> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Tarayıcı konum servisini desteklemiyor."));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => reject(new Error("Konum izni verilmedi veya konum alınamadı.")),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  });
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
    try {
      const coords = await getCurrentPosition();
      setLocationPreview(coords);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Konum alınamadı.");
    } finally {
      setLocLoading(false);
    }
  };

  useEffect(() => {
    refreshLocation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const form = new FormData(e.currentTarget);
    const files = selectedPhotos.filter((f) => f.size > 0);

    if (files.length > 6) {
      setLoading(false);
      setError("En fazla 6 fotoğraf yüklenebilir.");
      return;
    }

    const photos: string[] = [];
    for (const file of files) {
      const fd = new FormData();
      fd.append("file", file);
      const up = await fetch("/api/upload", { method: "POST", body: fd });
      const upData = await up.json().catch(() => ({}));
      if (!up.ok) {
        setLoading(false);
        setError(upData.error || "Fotoğraf yüklenemedi.");
        return;
      }
      photos.push(String(upData.url));
    }

    let coords: { lat: number; lng: number } | null = locationPreview;
    try {
      if (!coords) coords = await getCurrentPosition();
    } catch (err) {
      setLoading(false);
      setError(err instanceof Error ? err.message : "Konum alınamadı.");
      return;
    }

    const payload = {
      type: String(form.get("type") || "ANNOUNCEMENT"),
      title: String(form.get("title") || ""),
      body: String(form.get("body") || ""),
      photos,
      locationLat: coords.lat,
      locationLng: coords.lng
    };

    const res = await fetch("/api/board", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const data = await res.json().catch(() => ({}));
    setLoading(false);

    if (!res.ok) {
      setError(data.error || "Duyuru kaydedilemedi.");
      return;
    }

    router.push(`/board/${data.id}`);
    router.refresh();
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
          <MapPin className="h-3.5 w-3.5" /> Konum doğrulama
        </p>
        <div className="rounded-lg border border-amber-100 bg-amber-50/60 px-3 py-2 text-xs text-[#6b4a2d]">
          {locationPreview
            ? `Canlı konum: ${locationPreview.lat.toFixed(5)}, ${locationPreview.lng.toFixed(5)}`
            : "Canlı konum alınamadı."}
        </div>
        <Button type="button" variant="outline" size="sm" onClick={refreshLocation} disabled={locLoading} className="border-amber-300 text-amber-700 hover:bg-amber-50">
          <LocateFixed className="mr-1.5 h-4 w-4" />
          {locLoading ? "Konum alınıyor..." : "Konumu Yenile"}
        </Button>
      </div>

      {error ? <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p> : null}
      <Button type="submit" disabled={loading} className="h-12 w-full rounded-xl bg-gradient-to-r from-[#e58a2d] to-[#d97f23] text-white shadow-md hover:from-[#dc8126] hover:to-[#cc751f]">
        <SendHorizonal className="mr-2 h-4 w-4" />
        {loading ? "Gönderiliyor..." : "Duyuruyu Yayınla"}
      </Button>
    </form>
  );
}





