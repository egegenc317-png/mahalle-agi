"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Camera, Search, Users, X } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { CameraCaptureButton } from "@/components/camera-capture-button";
import { fetchJsonWithTimeout } from "@/lib/client/fetch-json-with-timeout";

type UserItem = {
  id: string;
  name: string;
  username?: string | null;
};

function readApiError(payload: unknown, fallback: string) {
  if (typeof payload === "string" && payload.trim()) return payload;
  if (!payload || typeof payload !== "object") return fallback;

  const candidate = payload as {
    error?: string | { formErrors?: string[]; fieldErrors?: Record<string, string[]> };
  };

  if (typeof candidate.error === "string" && candidate.error.trim()) {
    return candidate.error;
  }

  if (candidate.error && typeof candidate.error === "object") {
    const formErrors = Array.isArray(candidate.error.formErrors) ? candidate.error.formErrors.filter(Boolean) : [];
    if (formErrors.length > 0) return formErrors[0];

    const fieldErrors = candidate.error.fieldErrors || {};
    const firstFieldError = Object.values(fieldErrors).flat().find(Boolean);
    if (firstFieldError) return firstFieldError;
  }

  return fallback;
}

export function GroupConversationBuilder({
  currentUserId,
  initialUsers
}: {
  currentUserId: string;
  initialUsers: UserItem[];
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [groupName, setGroupName] = useState("");
  const [groupImage, setGroupImage] = useState<string | null>(null);
  const [selected, setSelected] = useState<UserItem[]>([]);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const selectedCount = selected.length + 1;

  const candidates = useMemo(() => {
    const q = query.trim().toLowerCase();
    return initialUsers
      .filter((user) => user.id !== currentUserId)
      .filter((user) => !selected.some((item) => item.id === user.id))
      .filter((user) => {
        if (!q) return true;
        return user.name.toLowerCase().includes(q) || (user.username || "").toLowerCase().includes(q);
      })
      .slice(0, 12);
  }, [currentUserId, initialUsers, query, selected]);

  const uploadFile = async (file: File) => {
    const fd = new FormData();
    fd.append("file", file);
    const { response, data } = await fetchJsonWithTimeout("/api/upload", { method: "POST", body: fd }, 30000);
    if (!response.ok) throw new Error(data.error || "Fotoğraf yüklenemedi.");
    return String(data.url);
  };

  const handleGroupPhoto = async (file: File | null) => {
    if (!file) return;
    setError(null);
    setUploading(true);
    try {
      const url = await uploadFile(file);
      setGroupImage(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Fotoğraf yüklenemedi.");
    } finally {
      setUploading(false);
    }
  };

  const createGroup = async () => {
    if (saving) return;
    setError(null);
    setSaving(true);
    try {
      const { response, data } = await fetchJsonWithTimeout(
        "/api/conversations/groups",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            groupName,
            participantIds: selected.map((item) => item.id),
            ...(groupImage ? { groupImage } : {})
          })
        },
        30000
      );
      if (!response.ok) {
        setError(readApiError(data, "Grup oluşturulamadı."));
        return;
      }
      router.push(`/messages/${data.id}`);
      router.refresh();
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        setError("Grup oluşturma isteği zaman aşımına uğradı. Lütfen tekrar dene.");
        return;
      }
      setError(err instanceof Error ? err.message : "Grup oluşturulamadı.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="rounded-[30px] border border-amber-200/80 bg-[linear-gradient(180deg,#fffaf1_0%,#fff7ee_100%)] p-4 shadow-[0_20px_60px_rgba(153,93,37,0.10)] sm:p-6">
      <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-4">
          <div className="rounded-[24px] border border-amber-100 bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-4">
                {groupImage ? (
                  <Image src={groupImage} alt="Grup fotoğrafı" width={68} height={68} className="h-[68px] w-[68px] rounded-[20px] object-cover" />
                ) : (
                  <div className="flex h-[68px] w-[68px] items-center justify-center rounded-[20px] bg-amber-100 text-amber-700">
                    <Users className="h-7 w-7" />
                  </div>
                )}
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-amber-700">Grup Kur</p>
                  <h2 className="mt-1 text-2xl font-bold tracking-tight text-zinc-900">Yeni sohbet oluştur</h2>
                  <p className="mt-1 text-sm text-zinc-600">Adını belirle, istersen fotoğraf ekle ve kişileri seç.</p>
                </div>
              </div>
              <div className="flex gap-2">
                <div className="rounded-2xl border border-amber-100 bg-amber-50 px-4 py-2 text-center">
                  <p className="text-[11px] uppercase tracking-wide text-zinc-500">Üye</p>
                  <p className="text-lg font-bold text-zinc-900">{selectedCount}</p>
                </div>
                <div className="rounded-2xl border border-amber-100 bg-amber-50 px-4 py-2 text-center">
                  <p className="text-[11px] uppercase tracking-wide text-zinc-500">Durum</p>
                  <p className="text-lg font-bold text-zinc-900">{groupName.trim().length >= 3 && selected.length >= 1 ? "Hazır" : "Taslak"}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="space-y-4 rounded-[24px] border border-amber-100 bg-white p-5 shadow-sm">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-zinc-500">Bilgiler</p>
                <h3 className="mt-1 text-lg font-semibold text-zinc-900">Grup kimliği</h3>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Grup adı</label>
                <Input value={groupName} onChange={(e) => setGroupName(e.target.value)} placeholder="Örn. Apartman Grubu" className="h-12 rounded-2xl border-amber-200 bg-white" />
              </div>
              <div className="space-y-3 rounded-[20px] border border-amber-100 bg-amber-50/60 p-4">
                <label className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-zinc-600">
                  <Camera className="h-3.5 w-3.5" /> Grup fotoğrafı
                </label>
                <Input type="file" accept="image/jpeg,image/png,image/webp" className="border-amber-200 bg-white" onChange={(e) => void handleGroupPhoto(e.target.files?.[0] || null)} />
                <CameraCaptureButton onCapture={(files) => void handleGroupPhoto(files[0] || null)} label="Kameradan Fotoğraf Çek" />
                {uploading ? <p className="text-xs text-zinc-500">Fotoğraf yükleniyor...</p> : null}
              </div>
            </div>

            <div className="space-y-4 rounded-[24px] border border-amber-100 bg-white p-5 shadow-sm">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-zinc-500">Önizleme</p>
                <h3 className="mt-1 text-lg font-semibold text-zinc-900">İlk görünüm</h3>
              </div>
              <div className="rounded-[22px] border border-amber-100 bg-[linear-gradient(180deg,#fffaf3_0%,#fff3df_100%)] p-4">
                <div className="flex items-center gap-3">
                  {groupImage ? (
                    <Image src={groupImage} alt="Önizleme" width={58} height={58} className="h-14 w-14 rounded-[18px] object-cover" />
                  ) : (
                    <div className="flex h-14 w-14 items-center justify-center rounded-[18px] bg-amber-100 text-amber-700">
                      <Users className="h-6 w-6" />
                    </div>
                  )}
                  <div>
                    <p className="text-base font-semibold text-zinc-900">{groupName.trim() || "Grup adı burada görünür"}</p>
                    <p className="text-xs text-zinc-600">{selectedCount} kişilik başlangıç grubu</p>
                  </div>
                </div>
              </div>
              <div className="space-y-2 text-sm text-zinc-600">
                <p className="rounded-2xl border border-amber-100 bg-amber-50/50 px-4 py-3">Sohbet açılır açılmaz seçtiğin kişiler doğrudan bu gruba girer.</p>
                <p className="rounded-2xl border border-amber-100 bg-amber-50/50 px-4 py-3">İstersen ayarlardan sonra davet bağlantısı da üretebilirsin.</p>
              </div>
            </div>
          </div>

          <div className="space-y-3 rounded-[24px] border border-amber-100 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-zinc-500">Kişiler</p>
                <h3 className="mt-1 text-lg font-semibold text-zinc-900">Üye seç</h3>
              </div>
              <div className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800">Sen + {selected.length} kişi</div>
            </div>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
              <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="İsim veya kullanıcı adı ara..." className="h-12 rounded-2xl border-amber-200 bg-white pl-9" />
            </div>

            {selected.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {selected.map((item) => (
                  <button key={item.id} type="button" onClick={() => setSelected((prev) => prev.filter((row) => row.id !== item.id))} className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800">
                    {item.name}
                    <X className="h-3.5 w-3.5" />
                  </button>
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-amber-200 bg-amber-50/40 px-4 py-4 text-sm text-zinc-600">En az 1 kişi seçmelisin. Sen otomatik olarak gruba dahilsin.</div>
            )}

            <div className="grid gap-2 md:grid-cols-2">
              {candidates.map((item) => (
                <button key={item.id} type="button" onClick={() => setSelected((prev) => [...prev, item])} className="flex items-center justify-between rounded-[18px] border border-amber-100 bg-white px-4 py-3 text-left transition hover:border-amber-300 hover:bg-amber-50/40">
                  <div>
                    <p className="font-medium text-zinc-900">{item.name}</p>
                    <p className="text-xs text-zinc-600">@{item.username || "kullanıcı"}</p>
                  </div>
                  <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-[11px] font-semibold text-amber-800">Ekle</span>
                </button>
              ))}
            </div>
            {candidates.length === 0 ? <p className="text-xs text-zinc-500">Aramaya uygun kullanıcı bulunamadı.</p> : null}
          </div>

          {error ? <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">{error}</p> : null}

          <div className="flex gap-2">
            <Button variant="outline" className="h-12 flex-1 rounded-2xl border-amber-200 bg-white" onClick={() => router.push("/messages")}>
              Vazgeç
            </Button>
            <Button className="h-12 flex-1 rounded-2xl bg-amber-500 text-white hover:bg-amber-600" onClick={createGroup} disabled={saving || uploading || groupName.trim().length < 3 || selected.length < 1}>
              {saving ? "Kuruluyor..." : "Grubu Kur"}
            </Button>
          </div>
        </div>

        <aside className="space-y-4 rounded-[24px] border border-amber-100 bg-white p-5 shadow-sm">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-zinc-500">Özet</p>
            <h3 className="mt-1 text-lg font-semibold text-zinc-900">Kurulum akışı</h3>
          </div>
          <div className="space-y-3 text-sm text-zinc-600">
            <div className="rounded-2xl border border-amber-100 bg-amber-50/40 px-4 py-3">Önce grubun adını belirle.</div>
            <div className="rounded-2xl border border-amber-100 bg-amber-50/40 px-4 py-3">İstersen fotoğraf ekle veya kameradan çek.</div>
            <div className="rounded-2xl border border-amber-100 bg-amber-50/40 px-4 py-3">Kişileri seçip sohbeti hemen başlat.</div>
          </div>
        </aside>
      </div>
    </section>
  );
}
