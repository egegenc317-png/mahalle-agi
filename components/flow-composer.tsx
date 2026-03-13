"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ImagePlus, SendHorizonal, Sparkles } from "lucide-react";

import { CameraCaptureButton } from "@/components/camera-capture-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type FlowComposerProps = {
  neighborhoodLabel: string;
  compact?: boolean;
};

export function FlowComposer({ neighborhoodLabel, compact = false }: FlowComposerProps) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedPhotos, setSelectedPhotos] = useState<File[]>([]);

  const uploadInputClass =
    "h-11 rounded-xl border-amber-200 bg-white file:mr-3 file:rounded-lg file:border-0 file:bg-gradient-to-r file:from-[#f59e0b] file:to-[#ea580c] file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-white hover:file:from-[#d97706] hover:file:to-[#c2410c]";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!body.trim()) return;

    setLoading(true);
    setError(null);

    const photos: string[] = [];
    for (const file of selectedPhotos) {
      const fd = new FormData();
      fd.append("file", file);
      const uploadRes = await fetch("/api/upload", { method: "POST", body: fd });
      const uploadData = await uploadRes.json().catch(() => ({}));
      if (!uploadRes.ok) {
        setLoading(false);
        setError(uploadData.error || "Fotoğraf yüklenemedi.");
        return;
      }
      photos.push(String(uploadData.url));
    }

    const res = await fetch("/api/akis", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: body.trim(), photos })
    });
    const data = await res.json().catch(() => ({}));

    setLoading(false);
    if (!res.ok) {
      setError(data.error || "Paylaşım gönderilemedi.");
      return;
    }

    setBody("");
    setSelectedPhotos([]);
    router.refresh();
  };

  return (
    <form
      onSubmit={handleSubmit}
      className={`overflow-hidden border border-amber-200 ${compact ? "rounded-[24px] bg-white shadow-sm" : "rounded-[26px] bg-[linear-gradient(145deg,#fffdf7_0%,#fff8ee_56%,#fff4e8_100%)] shadow-[0_18px_50px_rgba(199,132,44,0.12)]"}`}
    >
      <div className={`border-b border-amber-200/80 px-4 py-3 sm:px-5 ${compact ? "bg-amber-50/70" : "bg-white/75 backdrop-blur"}`}>
        <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.24em] text-orange-600">
          <Sparkles className="h-3.5 w-3.5" /> {neighborhoodLabel} Akışı
        </p>
        <p className="mt-1 text-sm text-zinc-600">Mahallendeki komşularınla sıcak, hızlı ve görünür bir şekilde yazış.</p>
      </div>

      <div className="space-y-4 px-4 py-4 sm:px-5">
        <Textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Mahallende olan biteni yaz. Komşuların kimin yazdığını açıkça görsün."
          className="min-h-32 rounded-2xl border-amber-200 bg-white shadow-sm focus-visible:ring-orange-300"
          maxLength={560}
        />

        <div className="flex items-center justify-between gap-3 text-xs text-zinc-500">
          <span>{body.trim().length}/560 karakter</span>
          <span>Yazan kişi adı ve profili akışta görünür.</span>
        </div>

        <div className="space-y-2 rounded-2xl border border-amber-200/80 bg-white/80 p-3">
          <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-zinc-600">
            <ImagePlus className="h-3.5 w-3.5" /> Fotoğraf ekle
          </p>
          <Input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            className={uploadInputClass}
            onChange={(e) => setSelectedPhotos(Array.from(e.target.files || []).slice(0, 4))}
          />
          <CameraCaptureButton
            multiple
            label="Anlık Fotoğraf Çek"
            onCapture={(files) => setSelectedPhotos((prev) => [...prev, ...files].slice(0, 4))}
          />
          <p className="text-xs text-zinc-600">
            {selectedPhotos.length > 0 ? `${selectedPhotos.length} Fotoğraf seçildi` : "İstersen 4 adede kadar fotoğraf da ekleyebilirsin."}
          </p>
        </div>

        {error ? <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p> : null}

        <div className="flex justify-end">
          <Button
            type="submit"
            disabled={loading || !body.trim()}
            className="h-11 rounded-xl bg-gradient-to-r from-[#e58a2d] to-[#d97f23] px-5 text-white shadow-md hover:from-[#dc8126] hover:to-[#cc751f]"
          >
            <SendHorizonal className="mr-2 h-4 w-4" />
            {loading ? "Yayınlanıyor..." : "Akışa Bırak"}
          </Button>
        </div>
      </div>
    </form>
  );
}
