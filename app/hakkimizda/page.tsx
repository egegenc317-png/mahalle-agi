import Link from "next/link";
import { CheckCircle2, Compass, Handshake, MapPinned, ShieldCheck, Store } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const services = [
  {
    title: "Mahalle Pazarı",
    desc: "Komşuların güvenle ürün, hizmet ve iş ilanlarını keşfettiği sıcak pazar deneyimi.",
    icon: Store
  },
  {
    title: "Dijital Pano",
    desc: "Duyuru, kayıp, etkinlik ve altyapı bildirimlerini tek merkezde toplayan yerel akış.",
    icon: Compass
  },
  {
    title: "Güvenli Mesajlaşma",
    desc: "Satıcı, işletme ve komşularla hızlı iletişim kurarak işlemleri kolaylaştıran mesaj altyapısı.",
    icon: Handshake
  },
  {
    title: "Konum Tabanlı Doğrulama",
    desc: "İçerikleri mahalle/semt kapsamında tutan ve yerel kaliteyi artıran konum kontrolleri.",
    icon: MapPinned
  }
];

const values = [
  "Yerel topluluk odaklı deneyim",
  "Güvenlik ve moderasyon temelli altyapı",
  "İşletmeler ve Komşular için adil görünürlük",
  "Sade, hızlı ve premium ürün deneyimi"
];

export default function HakkimizdaPage() {
  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-3xl border border-amber-200 bg-[radial-gradient(circle_at_12%_12%,rgba(251,191,36,0.28),transparent_38%),radial-gradient(circle_at_86%_8%,rgba(251,146,60,0.28),transparent_34%),linear-gradient(135deg,#fff4e6_0%,#ffffff_50%,#fff8ef_100%)] p-6 shadow-xl sm:p-8">
        <div className="pointer-events-none absolute -left-16 -top-10 h-44 w-44 rounded-full bg-amber-300/30 blur-3xl" />
        <div className="pointer-events-none absolute -right-20 -bottom-14 h-52 w-52 rounded-full bg-orange-300/25 blur-3xl" />

        <div className="relative z-10 max-w-3xl space-y-4">
          <p className="inline-flex items-center gap-2 rounded-full border border-amber-300 bg-white/80 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-amber-800">
            <ShieldCheck className="h-3.5 w-3.5" /> Mahalle Ağı
          </p>
          <h1 className="text-3xl font-black tracking-tight text-zinc-900 sm:text-5xl">
            Mahalleyi Dijitalde Bir Araya Getiren Premium Yerel Platform
          </h1>
          <p className="text-sm leading-relaxed text-zinc-700 sm:text-base">
            Mahalle Ağı; komşuları, yerel esnafı ve topluluk duyurularını tek deneyimde buluşturur. Amacımız,
            mahalle içindeki güvenli ticareti, iletişimi ve dayanışmayı daha hızlı ve daha kaliteli hale getirmek.
          </p>
          <div className="flex flex-wrap gap-2 pt-1">
            <Button asChild className="bg-orange-500 hover:bg-orange-600">
              <Link href="/pazar">Pazarı Keşfet</Link>
            </Button>
            <Button asChild variant="outline" className="border-amber-300 text-amber-700 hover:bg-amber-50">
              <Link href="/board">Pano Akışına Git</Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        {services.map((service) => (
          <Card key={service.title} className="border-amber-200 bg-gradient-to-b from-white to-amber-50/40 shadow-sm">
            <CardContent className="space-y-3 p-5">
              <p className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-white px-3 py-1 text-xs font-semibold text-amber-800">
                <service.icon className="h-3.5 w-3.5" /> Hizmet
              </p>
              <h2 className="text-xl font-bold text-zinc-900">{service.title}</h2>
              <p className="text-sm leading-relaxed text-zinc-700">{service.desc}</p>
            </CardContent>
          </Card>
        ))}
      </section>

      <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
        <h2 className="mb-3 text-xl font-bold text-zinc-900">Neye İnanıyoruz?</h2>
        <div className="grid gap-2 sm:grid-cols-2">
          {values.map((value) => (
            <p key={value} className="inline-flex items-center gap-2 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-700">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              {value}
            </p>
          ))}
        </div>
      </section>
    </div>
  );
}





