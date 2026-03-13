"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Copy, Crown, Link2, LogOut, Search, ShieldCheck, UserMinus, Users } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CameraCaptureButton } from "@/components/camera-capture-button";
import { fetchJsonWithTimeout } from "@/lib/client/fetch-json-with-timeout";

type Member = {
  id: string;
  name: string;
  username?: string | null;
  image?: string | null;
};

type GroupInfo = {
  id: string;
  groupName: string;
  groupDescription?: string | null;
  groupImage?: string | null;
  participantIds: string[];
  adminIds: string[];
};

export function GroupSettingsPanel({
  currentUserId,
  initialInviteUrl,
  group,
  members,
  allUsers
}: {
  currentUserId: string;
  initialInviteUrl: string;
  group: GroupInfo;
  members: Member[];
  allUsers: Member[];
}) {
  const router = useRouter();
  const [groupName, setGroupName] = useState(group.groupName);
  const [groupDescription, setGroupDescription] = useState(group.groupDescription || "");
  const [groupImage, setGroupImage] = useState<string | null>(group.groupImage || null);
  const [memberQuery, setMemberQuery] = useState("");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [workingUserId, setWorkingUserId] = useState<string | null>(null);
  const [copyState, setCopyState] = useState<"idle" | "done" | "error">("idle");
  const [inviteUrl, setInviteUrl] = useState(initialInviteUrl);
  const [error, setError] = useState<string | null>(null);
  const canManage = useMemo(() => group.adminIds.includes(currentUserId), [currentUserId, group.adminIds]);
  const memberCount = members.length;

  const candidateUsers = useMemo(() => {
    const q = memberQuery.trim().toLowerCase();
    return allUsers
      .filter((user) => user.id !== currentUserId)
      .filter((user) => !group.participantIds.includes(user.id))
      .filter((user) => {
        if (!q) return true;
        return user.name.toLowerCase().includes(q) || (user.username || "").toLowerCase().includes(q);
      })
      .slice(0, 8);
  }, [allUsers, currentUserId, group.participantIds, memberQuery]);

  const uploadFile = async (file: File) => {
    const fd = new FormData();
    fd.append("file", file);
    const { response, data } = await fetchJsonWithTimeout("/api/upload", { method: "POST", body: fd }, 30000);
    if (!response.ok) throw new Error(data.error || "Fotoğraf yüklenemedi.");
    return String(data.url);
  };

  const handleFile = async (file: File | null) => {
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

  const saveSettings = async () => {
    if (!canManage || saving) return;
    setError(null);
    setSaving(true);
    try {
      const { response, data } = await fetchJsonWithTimeout(
        `/api/conversations/groups/${group.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ groupName, groupDescription, groupImage })
        },
        30000
      );
      if (!response.ok) {
        setError(data?.error || "Grup ayarları kaydedilemedi.");
        return;
      }
      router.refresh();
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        setError("Kaydetme isteği zaman aşımına uğradı. Lütfen tekrar dene.");
        return;
      }
      setError(err instanceof Error ? err.message : "Grup ayarları kaydedilemedi.");
    } finally {
      setSaving(false);
    }
  };

  const updateMember = async (userId: string, action: "promote" | "demote" | "remove" | "add" | "leave") => {
    if (!canManage && action !== "leave") return;
    setError(null);
    setWorkingUserId(userId + action);
    const res = await fetch(`/api/conversations/groups/${group.id}/members`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, action })
    });
    const data = await res.json().catch(() => ({}));
    setWorkingUserId(null);
    if (!res.ok) {
      setError(data?.error || "Üye işlemi tamamlanamadı.");
      return;
    }
    setMemberQuery("");
    if (action === "leave") {
      router.push("/messages");
      router.refresh();
      return;
    }
    router.refresh();
  };

  const copyInviteLink = async () => {
    if (!inviteUrl) return;
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopyState("done");
      window.setTimeout(() => setCopyState("idle"), 2200);
    } catch {
      setCopyState("error");
      window.setTimeout(() => setCopyState("idle"), 2200);
    }
  };

  const renewInviteLink = async () => {
    if (!canManage) return;
    setError(null);
    const res = await fetch(`/api/conversations/groups/${group.id}/invite`, { method: "POST" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || typeof data?.inviteUrl !== "string") {
      setError(data?.error || "Davet bağlantısı yenilenemedi.");
      return;
    }
    setInviteUrl(data.inviteUrl);
    setCopyState("done");
    window.setTimeout(() => setCopyState("idle"), 2200);
  };

  return (
    <section className="rounded-[30px] border border-amber-200/80 bg-[linear-gradient(180deg,#fffaf1_0%,#fff7ee_100%)] p-4 shadow-[0_20px_60px_rgba(153,93,37,0.10)] sm:p-6">
      <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-4">
          <div className="rounded-[24px] border border-amber-100 bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-center gap-4">
                {groupImage ? (
                  <Image src={groupImage} alt={group.groupName} width={72} height={72} className="h-[72px] w-[72px] rounded-[20px] object-cover" />
                ) : (
                  <div className="flex h-[72px] w-[72px] items-center justify-center rounded-[20px] bg-amber-100 text-amber-700">
                    <Users className="h-7 w-7" />
                  </div>
                )}
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-amber-700">Grup Ayarları</p>
                  <h2 className="mt-1 text-2xl font-bold tracking-tight text-zinc-900">Sohbeti yönet</h2>
                  <p className="mt-1 text-sm text-zinc-600">Grup bilgilerini, üyeleri ve davet bağlantısını tek yerde düzenle.</p>
                </div>
              </div>
              <div className="flex gap-2">
                <div className="rounded-2xl border border-amber-100 bg-amber-50 px-4 py-2 text-center">
                  <p className="text-[11px] uppercase tracking-wide text-zinc-500">Üye</p>
                  <p className="text-lg font-bold text-zinc-900">{memberCount}</p>
                </div>
                <div className="rounded-2xl border border-amber-100 bg-amber-50 px-4 py-2 text-center">
                  <p className="text-[11px] uppercase tracking-wide text-zinc-500">Rol</p>
                  <p className="text-lg font-bold text-zinc-900">{canManage ? "Yönetici" : "Üye"}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="space-y-4 rounded-[24px] border border-amber-100 bg-white p-5 shadow-sm">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-zinc-500">Temel Bilgiler</p>
                <h3 className="mt-1 text-lg font-semibold text-zinc-900">Grup kimliği</h3>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Grup adı</label>
                <Input value={groupName} onChange={(e) => setGroupName(e.target.value)} className="h-12 rounded-2xl border-amber-200 bg-white" disabled={!canManage} />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Açıklama</label>
                <textarea
                  value={groupDescription}
                  onChange={(e) => setGroupDescription(e.target.value.slice(0, 240))}
                  className="min-h-[116px] w-full rounded-[20px] border border-amber-200 bg-white px-4 py-3 text-sm text-zinc-800 outline-none transition focus:border-amber-300"
                  placeholder="Grubun amacı veya kısa notu..."
                  disabled={!canManage}
                />
                <p className="text-[11px] text-zinc-500">{groupDescription.length}/240</p>
              </div>
            </div>

            <div className="space-y-4 rounded-[24px] border border-amber-100 bg-white p-5 shadow-sm">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-zinc-500">Fotoğraf</p>
                <h3 className="mt-1 text-lg font-semibold text-zinc-900">Görünüm</h3>
              </div>
              <div className="rounded-[22px] border border-amber-100 bg-amber-50/50 p-4">
                <div className="flex items-center gap-3">
                  {groupImage ? (
                    <Image src={groupImage} alt={group.groupName} width={60} height={60} className="h-[60px] w-[60px] rounded-[18px] object-cover" />
                  ) : (
                    <div className="flex h-[60px] w-[60px] items-center justify-center rounded-[18px] bg-amber-100 text-amber-700">
                      <Users className="h-6 w-6" />
                    </div>
                  )}
                  <div>
                    <p className="text-base font-semibold text-zinc-900">{groupName.trim() || group.groupName}</p>
                    <p className="text-xs text-zinc-600">{memberCount} kişilik grup</p>
                  </div>
                </div>
                <div className="mt-4 space-y-2">
                  <Input type="file" accept="image/jpeg,image/png,image/webp" className="border-amber-200 bg-white" disabled={!canManage || uploading} onChange={(e) => void handleFile(e.target.files?.[0] || null)} />
                  <CameraCaptureButton onCapture={(files) => void handleFile(files[0] || null)} label="Kameradan Fotoğraf Çek" />
                  {uploading ? <p className="text-xs text-zinc-500">Fotoğraf yükleniyor...</p> : null}
                </div>
              </div>

              {canManage ? (
                <Button className="h-12 w-full rounded-2xl bg-amber-500 text-white hover:bg-amber-600" onClick={saveSettings} disabled={saving || groupName.trim().length < 3}>
                  {saving ? "Kaydediliyor..." : "Değişiklikleri Kaydet"}
                </Button>
              ) : (
                <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  Bu grubun üyesisin, yönetici değilsin.
                </div>
              )}

              <Button type="button" variant="outline" className="h-12 w-full rounded-2xl border-red-200 bg-white text-red-700 hover:bg-red-50" disabled={workingUserId === currentUserId + "leave"} onClick={() => void updateMember(currentUserId, "leave")}>
                <LogOut className="mr-2 h-4 w-4" />
                Gruptan Ayrıl
              </Button>
            </div>
          </div>

          <div className="space-y-3 rounded-[24px] border border-amber-100 bg-white p-5 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[16px] bg-amber-100 text-amber-700">
                <Link2 className="h-4.5 w-4.5" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-zinc-900">Davet bağlantısı</p>
                <p className="text-xs text-zinc-600">Bağlantıyı paylaşan kişi giriş yaptıktan sonra doğrudan gruba katılır.</p>
              </div>
            </div>
            <div className="rounded-[18px] border border-amber-100 bg-amber-50/50 p-3">
              <p className="break-all text-xs text-zinc-700">{inviteUrl || "Bağlantı hazırlanıyor..."}</p>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <Button type="button" variant="outline" className="h-12 rounded-2xl border-amber-200 bg-white" onClick={() => void copyInviteLink()}>
                <Copy className="mr-2 h-4 w-4" />
                {copyState === "done" ? "Bağlantı Kopyalandı" : copyState === "error" ? "Kopyalanamadı" : "Bağlantıyı Kopyala"}
              </Button>
              {canManage ? (
                <Button type="button" variant="outline" className="h-12 rounded-2xl border-amber-200 bg-white" onClick={() => void renewInviteLink()}>
                  Yeni Link Üret
                </Button>
              ) : null}
            </div>
          </div>

          {canManage ? (
            <div className="space-y-3 rounded-[24px] border border-amber-100 bg-white p-5 shadow-sm">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-zinc-500">Üye Ekle</p>
                <h3 className="mt-1 text-lg font-semibold text-zinc-900">Yeni kişileri davet et</h3>
              </div>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                <Input value={memberQuery} onChange={(e) => setMemberQuery(e.target.value)} placeholder="İsim veya kullanıcı adı ara..." className="h-12 rounded-2xl border-amber-200 bg-white pl-9" />
              </div>
              <div className="grid gap-2 md:grid-cols-2">
                {candidateUsers.map((user) => (
                  <button key={user.id} type="button" onClick={() => void updateMember(user.id, "add")} disabled={workingUserId === user.id + "add"} className="flex items-center justify-between rounded-[18px] border border-amber-100 bg-white px-4 py-3 text-left transition hover:border-amber-300 hover:bg-amber-50/40 disabled:opacity-60">
                    <div>
                      <p className="font-medium text-zinc-900">{user.name}</p>
                      <p className="text-xs text-zinc-600">@{user.username || "kullanıcı"}</p>
                    </div>
                    <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-[11px] font-semibold text-amber-800">Ekle</span>
                  </button>
                ))}
              </div>
              {memberQuery.trim().length >= 1 && candidateUsers.length === 0 ? <p className="text-xs text-zinc-500">Eklenebilecek kullanıcı bulunamadı.</p> : null}
            </div>
          ) : null}

          <div className="space-y-3 rounded-[24px] border border-amber-100 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-zinc-500">Üyeler</p>
                <h3 className="mt-1 text-lg font-semibold text-zinc-900">Grup listesi</h3>
              </div>
              <div className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800">{memberCount} kişi</div>
            </div>
            <div className="space-y-2">
              {members.map((member) => {
                const isAdmin = group.adminIds.includes(member.id);
                const isMe = member.id === currentUserId;
                return (
                  <div key={member.id} className="flex items-center justify-between gap-3 rounded-[18px] border border-amber-100 bg-amber-50/30 px-4 py-3">
                    <div className="flex min-w-0 items-center gap-3">
                      {member.image ? (
                        <Image src={member.image} alt={member.name} width={44} height={44} className="h-11 w-11 rounded-[14px] object-cover" />
                      ) : (
                        <div className="flex h-11 w-11 items-center justify-center rounded-[14px] bg-amber-100 text-sm font-semibold text-amber-800">
                          {member.name.slice(0, 1).toUpperCase()}
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="truncate font-medium text-zinc-900">{member.name}</p>
                        <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-600">
                          <span>@{member.username || "kullanıcı"}</span>
                          {isAdmin ? (
                            <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-white px-2 py-0.5 text-amber-700">
                              <Crown className="h-3 w-3" />
                              Yönetici
                            </span>
                          ) : null}
                          {isMe ? <span className="rounded-full border border-zinc-200 bg-white px-2 py-0.5">Sen</span> : null}
                        </div>
                      </div>
                    </div>

                    {canManage && !isMe ? (
                      <div className="flex flex-wrap justify-end gap-2">
                        {isAdmin ? (
                          <Button variant="outline" size="sm" className="rounded-xl border-amber-200 bg-white" disabled={workingUserId === member.id + "demote"} onClick={() => void updateMember(member.id, "demote")}>
                            Yetkiyi Al
                          </Button>
                        ) : (
                          <Button variant="outline" size="sm" className="rounded-xl border-amber-200 bg-white" disabled={workingUserId === member.id + "promote"} onClick={() => void updateMember(member.id, "promote")}>
                            Yönetici Yap
                          </Button>
                        )}
                        <Button variant="outline" size="sm" className="rounded-xl border-red-200 bg-white text-red-700 hover:bg-red-50" disabled={workingUserId === member.id + "remove"} onClick={() => void updateMember(member.id, "remove")}>
                          <UserMinus className="mr-1 h-3.5 w-3.5" />
                          Çıkar
                        </Button>
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>

          {error ? <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">{error}</p> : null}
        </div>

        <aside className="space-y-4 rounded-[24px] border border-amber-100 bg-white p-5 shadow-sm">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-zinc-500">Kısa Özet</p>
            <h3 className="mt-1 text-lg font-semibold text-zinc-900">Yönetim alanı</h3>
          </div>
          <div className="space-y-3 text-sm text-zinc-600">
            <div className="rounded-2xl border border-amber-100 bg-amber-50/40 px-4 py-3">Grup adı, açıklaması ve fotoğrafı buradan güncellenir.</div>
            <div className="rounded-2xl border border-amber-100 bg-amber-50/40 px-4 py-3">Davet bağlantısı kopyalanabilir veya yenilenebilir.</div>
            <div className="rounded-2xl border border-amber-100 bg-amber-50/40 px-4 py-3">Yöneticiler yeni üye ekler, rol verir ve üye çıkarır.</div>
          </div>
        </aside>
      </div>
    </section>
  );
}
