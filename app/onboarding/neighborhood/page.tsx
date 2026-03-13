"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function NeighborhoodOnboardingPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const verifyLocation = () => {
    setLoading(true);
    setMessage(null);

    if (!navigator.geolocation) {
      setMessage("Tarayıcınız konum servisini desteklemiyor.");
      setLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const res = await fetch("/api/neighborhood/location-verify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              lat: position.coords.latitude,
              lng: position.coords.longitude
            })
          });

          const raw = await res.text();
          const data = raw ? JSON.parse(raw) : {};
          setLoading(false);

          if (!res.ok) {
            if (res.status === 401) {
              router.push("/auth/login");
              return;
            }
            setMessage(data.error || `Konum doğrulanamadı (HTTP ${res.status})`);
            return;
          }

          router.push(data.redirectTo || "/");
          router.refresh();
        } catch {
          setLoading(false);
          setMessage("Sunucudan geçersiz yanit alindi. Lütfen tekrar deneyin.");
        }
      },
      () => {
        setMessage("Konum izni verilmedi veya konum alınamadı.");
        setLoading(false);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  };

  return (
    <Card className="mx-auto max-w-lg overflow-hidden rounded-[24px] border-amber-200 bg-[linear-gradient(135deg,#fff7ed_0%,#fffdf8_48%,#fffbeb_100%)] shadow-sm">
      <CardHeader className="p-5 sm:p-6">
        <CardTitle className="text-xl sm:text-2xl">Konum Doğrulama</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 p-5 pt-0 sm:p-6 sm:pt-0">
        <p className="text-sm leading-6 text-muted-foreground">
          Devam etmek için konumunuzu doğrulayın. Sistem sizi doğrudan mahallenizin sayfasina yönlendirecek.
        </p>
        <div className="rounded-2xl border border-amber-200 bg-white/85 px-4 py-3 text-xs text-zinc-600">
          Telefonunda konum izni açık olmalı. Doğrulama sonrası otomatik yönlendirme yapılır.
        </div>
        <Button className="h-12 w-full rounded-xl bg-orange-500 text-white hover:bg-orange-600" onClick={verifyLocation} disabled={loading}>
          {loading ? "Konum kontrol ediliyor..." : "Konumumu Doğrula"}
        </Button>
        {message ? <p className="rounded-xl border border-zinc-200 bg-white/80 px-4 py-3 text-sm text-zinc-700">{message}</p> : null}
      </CardContent>
    </Card>
  );
}




