"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { Camera, LocateFixed, MapPin, PackagePlus, SearchCheck, Sparkles } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { CameraCaptureButton } from "@/components/camera-capture-button";
import { fetchJsonWithTimeout } from "@/lib/client/fetch-json-with-timeout";

type ListingType = "PRODUCT" | "SERVICE" | "JOB";

export default function NewListingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, status } = useSession();
  const isBusiness = session?.user?.accountType === "BUSINESS";

  const initialType = useMemo(() => {
    const raw = searchParams.get("type");
    if (raw === "SERVICE" || raw === "JOB" || raw === "PRODUCT") return raw;
    return "PRODUCT";
  }, [searchParams]);

  const [type, setType] = useState<ListingType>(initialType);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [locationPreview, setLocationPreview] = useState<{ lat: number; lng: number } | null>(null);
  const [locLoading, setLocLoading] = useState(false);
  const [selectedPhotos, setSelectedPhotos] = useState<File[]>([]);
  const uploadInputClass = "h-11 rounded-xl border-amber-200 bg-white file:mr-3 file:rounded-lg file:border-0 file:bg-gradient-to-r file:from-[#f59e0b] file:to-[#ea580c] file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-white hover:file:from-[#d97706] hover:file:to-[#c2410c]";

  useEffect(() => {
    if (!isBusiness) {
      setType("JOB");
      return;
    }
    setType(initialType);
  }, [initialType, isBusiness]);

  const getCurrentPosition = () =>
    new Promise<{ lat: number; lng: number }>((resolve, reject) => {
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
    try {
      const form = new FormData(e.currentTarget);
      const files = selectedPhotos.filter((f) => f.size > 0);

      if (files.length > 8) {
        setError("En fazla 8 fotoğraf yüklenebilir.");
        return;
      }

      const photos: string[] = [];
      for (const file of files) {
        const fd = new FormData();
        fd.append("file", file);
        const { response, data } = await fetchJsonWithTimeout("/api/upload", { method: "POST", body: fd }, 30000);
        if (!response.ok) {
          setError(data.error || "Foto yüklenemedi");
          return;
        }
        photos.push(String(data.url));
      }

      let coords: { lat: number; lng: number } | null = locationPreview;
      try {
        if (!coords) coords = await getCurrentPosition();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Konum alınamadı.");
        return;
      }

      const payload = {
        type: isBusiness ? type : "JOB",
        title: form.get("title"),
        description: form.get("description"),
        category: form.get("category"),
        price: form.get("price") ? Number(form.get("price")) : null,
        locationHint: form.get("locationHint") || undefined,
        locationLat: coords.lat,
        locationLng: coords.lng,
        photos
      };

      const { response, data } = await fetchJsonWithTimeout(
        "/api/listings",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        },
        30000
      );

      if (!response.ok) {
        setError(data.error || "İlan oluşturulamadı");
        return;
      }

      if (!data.id) {
        setError("İlan oluşturuldu ama yönlendirme bilgisi alınamadı. Sayfayı yenileyip kontrol et.");
        return;
      }

      router.push(`/listings/${data.id}`);
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        setError("İstek zaman aşımına uğradı. Lütfen tekrar dene.");
        return;
      }
      setError(err instanceof Error ? err.message : "İlan yayınlanırken beklenmeyen bir hata oluştu.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="relative mx-auto max-w-4xl overflow-hidden rounded-[24px] border border-amber-200 bg-[radial-gradient(circle_at_15%_8%,rgba(251,191,36,0.20),transparent_40%),radial-gradient(circle_at_90%_12%,rgba(251,146,60,0.18),transparent_36%),linear-gradient(135deg,#fff7ed_0%,#ffffff_48%,#fffbeb_100%)] p-3 shadow-xl sm:rounded-3xl sm:p-6">
      <div className="pointer-events-none absolute -left-16 -top-12 h-52 w-52 rounded-full bg-amber-300/20 blur-3xl" />
      <div className="pointer-events-none absolute -right-24 -bottom-16 h-64 w-64 rounded-full bg-orange-300/20 blur-3xl" />

      <div className="relative z-10 grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
        <Card className="border-amber-200/80 bg-white/95 shadow-lg">
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="inline-flex items-center gap-2 text-zinc-900">
              <PackagePlus className="h-5 w-5 text-orange-500" /> İlan Ekle
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0">
            <form onSubmit={onSubmit} className="space-y-4">
          {status === "loading" ? (
            <p className="text-sm text-zinc-500">Hesap bilgisi yükleniyor...</p>
          ) : null}

              <div className="space-y-1">
                <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">İlan tipi</p>
                <select
                  name="type"
                  className="h-11 w-full rounded-xl border border-amber-200 bg-white px-3 text-sm text-zinc-800 shadow-sm focus:border-orange-400 focus:outline-none"
                  value={isBusiness ? type : "JOB"}
                  onChange={(e) => setType(e.target.value as ListingType)}
                  disabled={!isBusiness}
                >
                  {isBusiness ? (
                    <>
                      <option value="PRODUCT">PRODUCT</option>
                      <option value="SERVICE">SERVICE</option>
                      <option value="JOB">JOB</option>
                    </>
                  ) : (
                    <option value="JOB">JOB</option>
                  )}
                </select>
                {!isBusiness && status !== "loading" ? (
                  <p className="text-xs text-amber-700">Ürün ve hizmet ilanı sadece işletme sahipleri için açıktır.</p>
                ) : null}
              </div>

              <Input name="title" placeholder="Başlık" required className="h-11 rounded-xl border-amber-200 bg-white shadow-sm focus-visible:ring-orange-300" />
              <Textarea name="description" placeholder="Açıklama" required className="min-h-36 rounded-xl border-amber-200 bg-white shadow-sm focus-visible:ring-orange-300" />
              <Input name="category" placeholder="Kategori" required className="h-11 rounded-xl border-amber-200 bg-white shadow-sm focus-visible:ring-orange-300" />
              <Input name="price" type="number" placeholder="Fiyat (opsiyonel)" className="h-11 rounded-xl border-amber-200 bg-white shadow-sm focus-visible:ring-orange-300" />
              <Input name="locationHint" placeholder="Konum ipucu" className="h-11 rounded-xl border-amber-200 bg-white shadow-sm focus-visible:ring-orange-300" />

              <div className="space-y-2 rounded-xl border border-amber-200 bg-amber-50/50 p-3">
                <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-zinc-600">
                  <MapPin className="h-3.5 w-3.5" /> Konum doğrulama
                </p>
                <div className="rounded-lg border border-amber-100 bg-white/80 px-3 py-2 text-xs text-zinc-700">
                  {locationPreview
                    ? `Canlı konum: ${locationPreview.lat.toFixed(5)}, ${locationPreview.lng.toFixed(5)}`
                    : "Canlı konum alınamadı."}
                </div>
                <Button type="button" variant="outline" size="sm" onClick={refreshLocation} disabled={locLoading} className="border-amber-300 text-amber-700 hover:bg-amber-50">
                  <LocateFixed className="mr-1.5 h-4 w-4" />
                  {locLoading ? "Konum alınıyor..." : "Konumu Yenile"}
                </Button>
              </div>

              <div className="space-y-2 rounded-xl border border-amber-200 bg-white p-3 shadow-sm">
                <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-zinc-600">
                  <Camera className="h-3.5 w-3.5" /> Fotoğraf Yükleme
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
                      return next.slice(0, 8);
                    })
                  }
                  label="Anlık Fotoğraf Çek"
                />
                <p className="text-xs text-zinc-600">
                  {selectedPhotos.length > 0 ? `${selectedPhotos.length} fotoğraf seçildi` : "Birden fazla fotoğraf ekleyebilirsin (max 8)."}
                </p>
              </div>

              {error && <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
              <Button type="submit" disabled={loading} className="h-12 w-full rounded-xl bg-gradient-to-r from-[#e58a2d] to-[#d97f23] text-white shadow-md hover:from-[#dc8126] hover:to-[#cc751f]">
                {loading ? "Yayınlanıyor..." : "Yayınla"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <aside className="space-y-3 rounded-2xl border border-amber-200 bg-white/85 p-4 shadow-sm sm:p-5">
          <p className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
            <Sparkles className="h-3.5 w-3.5" /> Premium İlan Akışı
          </p>
          <h2 className="text-xl font-extrabold tracking-tight text-zinc-900 sm:text-2xl">Daha Güçlü Vitrin</h2>
          <p className="text-sm leading-relaxed text-zinc-600">
            Kaliteli başlık, net açıklama ve birden fazla fotoğraf ile ilanın pazarda daha çok görünür olur.
          </p>
          <div className="rounded-xl border border-emerald-100 bg-emerald-50/60 p-3 text-sm text-zinc-700">
            <p className="inline-flex items-center gap-2 font-semibold text-zinc-900">
              <SearchCheck className="h-4 w-4 text-emerald-600" /> Keşfedilebilirlik
            </p>
            <p className="mt-1">Kategori ve fiyat alanlarını doldurman filtrelerde daha iyi sıralama sağlar.</p>
          </div>
        </aside>
      </div>
    </section>
  );
}





