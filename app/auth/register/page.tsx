"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { AtSign, Building2, CalendarDays, Camera, CheckCircle2, Clock3, Mail, ShieldCheck, Sparkles, User } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { BrandLogo } from "@/components/brand-logo";
import { CameraCaptureButton } from "@/components/camera-capture-button";

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

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [emailCode, setEmailCode] = useState("");
  const [emailSending, setEmailSending] = useState(false);
  const [emailVerifying, setEmailVerifying] = useState(false);
  const [emailVerified, setEmailVerified] = useState(false);
  const [emailStatus, setEmailStatus] = useState<string | null>(null);
  const [emailCodeExpiresAt, setEmailCodeExpiresAt] = useState<string | null>(null);
  const [emailCountdown, setEmailCountdown] = useState(0);
  const [password, setPassword] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [showAge, setShowAge] = useState(false);
  const [accountType, setAccountType] = useState<"NEIGHBOR" | "BUSINESS">("NEIGHBOR");
  const [businessCategory, setBusinessCategory] = useState("");
  const [closedDays, setClosedDays] = useState<ClosedDayState[]>(
    WEEK_DAYS.map((item) => ({ day: item.day, label: item.label, mode: "OPEN", start: "12:00", end: "14:00" }))
  );
  const [profileImageFile, setProfileImageFile] = useState<File | null>(null);
  const [shopLogoFile, setShopLogoFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const uploadInputClass = "h-11 border-amber-200 bg-white file:mr-3 file:rounded-lg file:border-0 file:bg-gradient-to-r file:from-[#f59e0b] file:to-[#ea580c] file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-white hover:file:from-[#d97706] hover:file:to-[#c2410c]";
  const normalizedEmail = useMemo(() => email.trim().toLowerCase(), [email]);
  const emailLooksValid = normalizedEmail.length === 0 || /^[^\s@]+@[^\s@]+\.[^\s@]+$/i.test(normalizedEmail);
  const passwordHasUpper = /[A-Z]/.test(password);
  const passwordHasLower = /[a-z]/.test(password);
  const passwordHasDigit = /\d/.test(password);
  const passwordRulesSatisfied = passwordHasUpper && passwordHasLower && passwordHasDigit;
  const emailCodeExpired = Boolean(emailCodeExpiresAt && emailCountdown <= 0 && !emailVerified);
  const formattedCountdown = useMemo(() => {
    const minutes = String(Math.floor(emailCountdown / 60)).padStart(2, "0");
    const seconds = String(emailCountdown % 60).padStart(2, "0");
    return `${minutes}:${seconds}`;
  }, [emailCountdown]);

  useEffect(() => {
    if (!emailCodeExpiresAt || emailVerified) {
      setEmailCountdown(0);
      return;
    }

    const updateCountdown = () => {
      const remaining = Math.max(0, Math.ceil((new Date(emailCodeExpiresAt).getTime() - Date.now()) / 1000));
      setEmailCountdown(remaining);
    };

    updateCountdown();
    const timer = window.setInterval(updateCountdown, 1000);
    return () => window.clearInterval(timer);
  }, [emailCodeExpiresAt, emailVerified]);

  const requestEmailCode = async () => {
    if (!normalizedEmail) return;
    setError(null);
    setEmailStatus(null);
    setEmailVerified(false);
    setEmailSending(true);
    const res = await fetch("/api/auth/email-verification/request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: normalizedEmail })
    });
    const data = await res.json();
    setEmailSending(false);
    if (!res.ok) {
      setError(data.error || "Doğrulama kodu gönderilemedi.");
      return;
    }
    setEmailCodeExpiresAt(typeof data.expiresAt === "string" ? data.expiresAt : null);
    setEmailStatus("Doğrulama kodu e-posta adresine gönderildi. Kod 4 dakika boyunca geçerli.");
  };

  const verifyEmailCode = async () => {
    if (!normalizedEmail || !emailCode.trim()) return;
    if (emailCodeExpired) {
      setError("Kodun süresi doldu. Yeni kod gönder.");
      return;
    }
    setError(null);
    setEmailStatus(null);
    setEmailVerifying(true);
    const res = await fetch("/api/auth/email-verification/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: normalizedEmail, code: emailCode.trim() })
    });
    const data = await res.json();
    setEmailVerifying(false);
    if (!res.ok) {
      setError(data.error || "Kod doğrulanamadı.");
      return;
    }
    setEmailVerified(true);
    setEmailCodeExpiresAt(null);
    setEmailCountdown(0);
    setEmailStatus("E-posta adresi doğrulandı.");
  };

  const uploadFile = async (file: File) => {
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/upload", { method: "POST", body: fd });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || "Dosya yüklenemedi.");
    }
    return String(data.url);
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setEmailStatus(null);
    if (!passwordRulesSatisfied) {
      setError("Şifre en az bir büyük harf, bir küçük harf ve bir sayı içermeli.");
      return;
    }
    if (normalizedEmail && !emailVerified) {
      setError("E-posta girdiysen önce doğrulama kodunu onaylamalısın.");
      return;
    }
    setSubmitting(true);

    let profileImage: string | undefined;
    let shopLogo: string | undefined;
    try {
      if (accountType === "NEIGHBOR" && profileImageFile) {
        profileImage = await uploadFile(profileImageFile);
      }
      if (accountType === "BUSINESS" && shopLogoFile) {
        shopLogo = await uploadFile(shopLogoFile);
      }
    } catch (err) {
      setSubmitting(false);
      setError(err instanceof Error ? err.message : "Dosya yüklenemedi.");
      return;
    }

    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        username,
        email: normalizedEmail,
        password,
        birthDate,
        showAge,
        accountType,
        businessCategory: accountType === "BUSINESS" ? businessCategory : undefined,
        businessClosedHours:
          accountType === "BUSINESS"
            ? closedDays
                .filter((item) => item.mode !== "OPEN")
                .map((item) => {
                  if (item.mode === "FULL_DAY") {
                    return { day: item.day, mode: "FULL_DAY" as const };
                  }
                  return { day: item.day, mode: "RANGE" as const, start: item.start, end: item.end };
                })
            : undefined,
        profileImage,
        shopLogo
      })
    });
    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Kayıt başarısız");
      setSubmitting(false);
      return;
    }

    const loginResult = await signIn("credentials", { email: normalizedEmail || username, password, redirect: false });
    if (loginResult?.error) {
      setSubmitting(false);
      router.push("/auth/login");
      return;
    }

    setSubmitting(false);
    router.push("/post-login");
    router.refresh();
  };

  return (
    <div className="relative min-h-[calc(100vh-110px)] overflow-hidden rounded-[26px] border border-amber-100 bg-gradient-to-br from-amber-50 via-white to-orange-100 p-3 sm:min-h-[calc(100vh-120px)] sm:rounded-3xl sm:p-6 lg:p-8">
      <div className="pointer-events-none absolute -left-20 top-10 h-56 w-56 rounded-full bg-orange-200/45 blur-3xl" />
      <div className="pointer-events-none absolute -right-24 bottom-0 h-64 w-64 rounded-full bg-amber-300/30 blur-3xl" />

      <div className="relative mx-auto grid max-w-5xl items-start gap-4 lg:grid-cols-[1.05fr_1fr] lg:gap-6">
        <Card className="order-1 border-0 bg-white/75 shadow-xl backdrop-blur-md">
          <CardHeader className="space-y-3 p-5 sm:p-6">
            <BrandLogo className="mb-1" />
            <p className="inline-flex w-fit items-center gap-2 rounded-full border border-amber-200 bg-amber-100/70 px-3 py-1 text-xs font-semibold text-amber-800">
              <ShieldCheck className="h-3.5 w-3.5" />
              Güvenli Komşu ağına Katıl
            </p>
            <CardTitle className="text-2xl font-extrabold tracking-tight text-zinc-900 sm:text-3xl">Kayıt Ol</CardTitle>
            <p className="text-sm text-zinc-600">Kullanıcı adıni seç, Komşular seni bulabilsin.</p>
          </CardHeader>

          <CardContent className="p-5 pt-0 sm:p-6 sm:pt-0">
            <form onSubmit={onSubmit} className="space-y-3">
              <div className="relative">
                <User className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-zinc-500" />
                <Input className="h-11 border-zinc-200 pl-9" placeholder="Ad Soyad" value={name} onChange={(e) => setName(e.target.value)} required />
              </div>

              <div className="relative">
                <AtSign className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-zinc-500" />
                <Input
                  className="h-11 border-zinc-200 pl-9"
                  placeholder="Kullanıcı adı"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2 rounded-2xl border border-amber-200 bg-amber-50/50 p-3">
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-zinc-500" />
                  <Input
                    type="email"
                    className="h-11 border-zinc-200 pl-9"
                    placeholder="E-posta adresi (opsiyonel)"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setEmailVerified(false);
                      setEmailCode("");
                      setEmailStatus(null);
                      setEmailCodeExpiresAt(null);
                      setEmailCountdown(0);
                    }}
                  />
                </div>
                <p className="text-xs text-zinc-600">E-posta girersen doğrulama kodu gönderilir ve profilinde doğrulanmış kullanıcı rozeti görünür. Boş bırakabilirsin.</p>
                {normalizedEmail ? (
                  <div className="space-y-3 rounded-[24px] border border-amber-200 bg-[linear-gradient(135deg,#fff8ee_0%,#ffe9c4_45%,#ffffff_100%)] p-4 shadow-[0_20px_45px_rgba(180,120,45,0.12)]">
                    <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-amber-100 bg-white/80 px-3 py-2">
                      <div className="inline-flex items-center gap-2 text-xs font-semibold text-zinc-800">
                        <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-orange-500 to-amber-500 text-white shadow-sm">
                          <Sparkles className="h-4 w-4" />
                        </span>
                        E-posta doğrulaması
                      </div>
                      <div className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold ${emailVerified ? "border-emerald-200 bg-emerald-50 text-emerald-700" : emailCodeExpiresAt ? emailCodeExpired ? "border-red-200 bg-red-50 text-red-700" : "border-amber-200 bg-amber-50 text-amber-800" : "border-zinc-200 bg-white text-zinc-600"}`}>
                        <Clock3 className="h-3.5 w-3.5" />
                        {emailVerified ? "Doğrulandı" : emailCodeExpiresAt ? emailCodeExpired ? "Süre doldu" : `${formattedCountdown} kaldı` : "Kod bekleniyor"}
                      </div>
                    </div>
                    {!emailLooksValid ? (
                      <p className="text-xs text-red-600">Lütfen geçerli bir e-posta adresi gir.</p>
                    ) : null}
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <Button type="button" variant="outline" className="border-amber-300 bg-white/90" onClick={requestEmailCode} disabled={!emailLooksValid || emailSending || emailVerified}>
                        {emailSending ? "Kod gönderiliyor..." : emailVerified ? "E-posta doğrulandı" : emailCodeExpiresAt && !emailCodeExpired ? "Kodu Yeniden Gönder" : "Kodu Gönder"}
                      </Button>
                      <div className="relative flex-1">
                        <Input
                          className="h-11 border-zinc-200 bg-white pr-10"
                          placeholder="6 haneli kod"
                          value={emailCode}
                          onChange={(e) => setEmailCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                          disabled={emailVerified || emailCodeExpired}
                        />
                        {emailVerified ? <CheckCircle2 className="pointer-events-none absolute right-3 top-3.5 h-4 w-4 text-emerald-600" /> : null}
                      </div>
                      <Button type="button" className="bg-zinc-900 text-white hover:bg-zinc-800" onClick={verifyEmailCode} disabled={!emailLooksValid || emailCode.trim().length !== 6 || emailVerifying || emailVerified || emailCodeExpired}>
                        {emailVerifying ? "Kontrol ediliyor..." : "Kodu Doğrula"}
                      </Button>
                    </div>
                    <div className="grid gap-2 rounded-2xl border border-amber-100 bg-white/75 p-3 text-xs text-zinc-600 sm:grid-cols-3">
                      <div className="rounded-xl border border-amber-100 bg-amber-50/60 px-3 py-2">Sayaç kod gönderildiği anda başlar.</div>
                      <div className="rounded-xl border border-amber-100 bg-amber-50/60 px-3 py-2">Kod tam 4 dakika geçerlidir.</div>
                      <div className="rounded-xl border border-amber-100 bg-amber-50/60 px-3 py-2">Süre dolarsa yeni kod istemelisin.</div>
                    </div>
                    {emailStatus ? <p className="text-xs text-emerald-700">{emailStatus}</p> : null}
                  </div>
                ) : null}
              </div>

              <div className="space-y-2">
                <Input type="password" className="h-11 border-zinc-200" placeholder="Şifre" value={password} onChange={(e) => setPassword(e.target.value)} required />
                <div className="grid gap-2 rounded-xl border border-zinc-200 bg-zinc-50 p-3 text-xs text-zinc-600 sm:grid-cols-3">
                  <div className={passwordHasUpper ? "text-emerald-700" : "text-red-600"}>En az bir büyük harf</div>
                  <div className={passwordHasLower ? "text-emerald-700" : "text-red-600"}>En az bir küçük harf</div>
                  <div className={passwordHasDigit ? "text-emerald-700" : "text-red-600"}>En az bir sayı</div>
                </div>
                {password && !passwordRulesSatisfied ? <p className="text-xs text-red-600">Şifre güçlü değil. En az bir büyük harf, bir küçük harf ve bir sayı içermeli.</p> : null}
              </div>

              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <Button type="button" variant={accountType === "NEIGHBOR" ? "default" : "outline"} onClick={() => setAccountType("NEIGHBOR")} className={accountType === "NEIGHBOR" ? "bg-zinc-900 text-white hover:bg-zinc-800" : "border-zinc-300"}>Komşu Hesabı</Button>
                <Button type="button" variant={accountType === "BUSINESS" ? "default" : "outline"} onClick={() => setAccountType("BUSINESS")} className={accountType === "BUSINESS" ? "bg-zinc-900 text-white hover:bg-zinc-800" : "border-zinc-300"}>İşletme Hesabı</Button>
              </div>

              {accountType === "BUSINESS" ? (
                <>
                  <div className="relative">
                    <Building2 className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-zinc-500" />
                    <select value={businessCategory} onChange={(e) => setBusinessCategory(e.target.value)} className="h-11 w-full rounded-md border border-zinc-200 bg-white pl-9 pr-3 text-sm" required>
                      <option value="">Kategori seç</option>
                      <option value="Market / Gida">Market / Gida</option>
                      <option value="Kafe / Restoran">Kafe / Restoran</option>
                      <option value="Kuafor / Bakim">Kuafor / Bakim</option>
                      <option value="Tamir / Teknik Servis">Tamir / Teknik Servis</option>
                      <option value="Egitim / Ders">Egitim / Ders</option>
                      <option value="Diger">Diger</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="inline-flex items-center gap-2 text-xs font-medium text-zinc-600"><Camera className="h-3.5 w-3.5" /> İşletme logosu (opsiyonel)</label>
                    <Input type="file" className={uploadInputClass} accept="image/jpeg,image/png" onChange={(e) => setShopLogoFile(e.target.files?.[0] || null)} />
                    <CameraCaptureButton onCapture={(files) => setShopLogoFile(files[0] || null)} label="Kameradan Logo Çek" />
                  </div>
                  <div className="space-y-2 rounded-xl border border-amber-200 bg-amber-50/50 p-3">
                    <p className="inline-flex items-center gap-2 text-xs font-semibold text-amber-800">
                      <Clock3 className="h-3.5 w-3.5" />
                      Çarşı için Kapalı saatlerin
                    </p>
                    <p className="text-xs text-zinc-600">Hangi gün hangi saatlerde kapalı olduğunu seç. Çarşı sayfasında buna göre açık/kapalı gösterilir.</p>
                    <div className="space-y-2">
                      {closedDays.map((item, index) => (
                        <div key={item.day} className="grid grid-cols-1 gap-2 rounded-lg border border-amber-100 bg-white p-2 sm:grid-cols-[120px_1fr_auto_auto] sm:items-center">
                          <p className="text-xs font-medium text-zinc-700">{item.label}</p>
                          <select
                            value={item.mode}
                            onChange={(e) => {
                              const mode = e.target.value as ClosedDayMode;
                              setClosedDays((prev) =>
                                prev.map((row, rowIndex) => (rowIndex === index ? { ...row, mode } : row))
                              );
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
                                prev.map((row, rowIndex) =>
                                  rowIndex === index ? { ...row, start: e.target.value } : row
                                )
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
                                prev.map((row, rowIndex) =>
                                  rowIndex === index ? { ...row, end: e.target.value } : row
                                )
                              )
                            }
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              ) : (
                <div className="space-y-1">
                  <label className="inline-flex items-center gap-2 text-xs font-medium text-zinc-600"><Camera className="h-3.5 w-3.5" /> Profil fotoğrafı (opsiyonel)</label>
                  <Input type="file" className={uploadInputClass} accept="image/jpeg,image/png" onChange={(e) => setProfileImageFile(e.target.files?.[0] || null)} />
                  <CameraCaptureButton onCapture={(files) => setProfileImageFile(files[0] || null)} label="Kameradan Profil Çek" />
                </div>
              )}

              <div className="grid grid-cols-1 items-center gap-2 sm:grid-cols-[1fr_auto_auto]">
                <div className="relative">
                  <CalendarDays className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-zinc-500" />
                  <Input type="date" className="h-11 border-zinc-200 pl-9" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} required />
                </div>
                <Button type="button" size="sm" variant={!showAge ? "default" : "outline"} onClick={() => setShowAge(false)} className={!showAge ? "bg-zinc-900 text-white hover:bg-zinc-800" : "border-zinc-300"}>Gizle</Button>
                <Button type="button" size="sm" variant={showAge ? "default" : "outline"} onClick={() => setShowAge(true)} className={showAge ? "bg-zinc-900 text-white hover:bg-zinc-800" : "border-zinc-300"}>Göster</Button>
              </div>

              <p className="text-xs text-zinc-600">Yaşini profilde göstermek için Göster seç.</p>
              {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

              <Button className="h-11 w-full rounded-xl bg-zinc-900 text-white hover:bg-zinc-800" type="submit" disabled={submitting}>
                {submitting ? "Kaydediliyor..." : "Hesap Oluştur"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="order-2 space-y-4 rounded-2xl border border-amber-200/80 bg-white/75 p-4 shadow-lg backdrop-blur-sm sm:p-6">
          <h2 className="text-2xl font-bold text-zinc-900">Mahalle Ağı</h2>
          <p className="text-sm leading-6 text-zinc-600">Mahallende güvenli alım-satım, duyuru ve mikro işler tek yerde. Komşu veya işletme olarak topluluğa katıl.</p>
          <div className="grid gap-3 text-sm">
            <div className="rounded-xl border border-zinc-200 bg-white p-3 text-zinc-700">Gercek zamanli sohbet ve lokal feed</div>
            <div className="rounded-xl border border-zinc-200 bg-white p-3 text-zinc-700">Haritada ilan, duyuru ve işletme görünümü</div>
            <div className="rounded-xl border border-zinc-200 bg-white p-3 text-zinc-700">Kullanıcı adıyla hızlı kişi arama</div>
          </div>
        </div>
      </div>
    </div>
  );
}





