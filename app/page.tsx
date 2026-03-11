import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, HeartHandshake, MapPinned, MessageCircleHeart, Store, Sparkles } from "lucide-react";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { BrandLogo } from "@/components/brand-logo";
import { Button } from "@/components/ui/button";

const highlights = [
  {
    title: "Komşularınla bağ kur",
    description: "Aynı mahallede yaşayan insanlarla güvenli biçimde tanış, yazış ve dayanışma ağı kur.",
    icon: MessageCircleHeart
  },
  {
    title: "Mahallenin çarşısını keşfet",
    description: "İşletmeleri, hizmetleri, ilanları ve günlük ihtiyaçlarını sıcak bir mahalle akışı içinde gör.",
    icon: Store
  },
  {
    title: "Yakınında olanı hemen bul",
    description: "Harita, pano, pazar ve mesajlaşma bir arada çalışır; aradığın şey uzaklarda kaybolmaz.",
    icon: MapPinned
  }
];

export default async function LandingPage() {
  const session = await auth();

  if (session) {
    if (!session.user.locationScope) redirect("/onboarding/scope");
    if (!session.user.neighborhoodId) redirect("/onboarding/neighborhood");
    redirect(session.user.locationScope === "DISTRICT" ? "/map" : "/home");
  }

  const [listings, boardPosts, users] = await Promise.all([
    prisma.listing.findMany({ where: { status: "ACTIVE" } }),
    prisma.boardPost.findMany(),
    prisma.user.findMany()
  ]);

  const listingCount = listings.length;
  const boardCount = boardPosts.length;
  const userCount = users.length;

  return (
    <div className="space-y-8 sm:space-y-10">
      <section className="relative overflow-hidden rounded-[32px] border border-amber-200/70 bg-[linear-gradient(135deg,#fff8eb_0%,#fffef8_45%,#f3fbf4_100%)] px-5 py-8 shadow-[0_30px_80px_-45px_rgba(120,74,20,0.45)] sm:px-8 sm:py-10 lg:px-12 lg:py-14">
        <div className="absolute inset-x-0 top-0 h-32 bg-[radial-gradient(circle_at_top_left,rgba(245,158,11,0.16),transparent_58%)]" />
        <div className="absolute right-0 top-0 h-48 w-48 rounded-full bg-amber-200/25 blur-3xl" />
        <div className="absolute bottom-0 left-0 h-48 w-48 rounded-full bg-emerald-200/25 blur-3xl" />

        <div className="relative grid gap-8 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-white/80 px-4 py-2 text-sm font-medium text-amber-800 shadow-sm backdrop-blur">
              <Sparkles className="h-4 w-4" />
              Mahallene sıcak bir başlangıç
            </div>

            <div className="space-y-4">
              <div className="inline-flex items-center gap-3 rounded-2xl bg-white/70 px-4 py-3 shadow-sm backdrop-blur">
                <BrandLogo size="md" />
              </div>
              <h1 className="max-w-3xl text-4xl font-black tracking-tight text-stone-900 sm:text-5xl lg:text-6xl">
                Mahalleme Hoş Geldin
              </h1>
              <p className="max-w-2xl text-base leading-7 text-stone-600 sm:text-lg">
                Mahalle Ağı; komşularınla tanışman, güvenli alışveriş yapman, işletmeleri keşfetmen ve mahalle
                hayatını tek bir sıcak ekranda yaşaman için tasarlandı.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Button asChild className="h-12 rounded-2xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 px-6 text-base font-semibold text-white shadow-[0_20px_45px_-22px_rgba(234,88,12,0.85)] hover:opacity-95">
                <Link href="/auth/register">
                  Hemen Katıl
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" className="h-12 rounded-2xl border-amber-200 bg-white/80 px-6 text-base font-semibold text-stone-700 backdrop-blur">
                <Link href="/auth/login">Giriş Yap</Link>
              </Button>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-amber-100 bg-white/80 p-4 shadow-sm backdrop-blur">
                <p className="text-2xl font-black text-stone-900">{userCount}+</p>
                <p className="mt-1 text-sm text-stone-600">mahalle sakini ve işletme</p>
              </div>
              <div className="rounded-2xl border border-amber-100 bg-white/80 p-4 shadow-sm backdrop-blur">
                <p className="text-2xl font-black text-stone-900">{listingCount}+</p>
                <p className="mt-1 text-sm text-stone-600">aktif pazar ve hizmet ilanı</p>
              </div>
              <div className="rounded-2xl border border-amber-100 bg-white/80 p-4 shadow-sm backdrop-blur">
                <p className="text-2xl font-black text-stone-900">{boardCount}+</p>
                <p className="mt-1 text-sm text-stone-600">duyuru, çağrı ve mahalle notu</p>
              </div>
            </div>
          </div>

          <div className="relative">
            <div className="rounded-[28px] border border-white/70 bg-white/80 p-5 shadow-[0_30px_60px_-35px_rgba(22,101,52,0.45)] backdrop-blur sm:p-6">
              <div className="rounded-[24px] bg-[linear-gradient(180deg,#fff9ec_0%,#fffefb_58%,#f5fbf4_100%)] p-5">
                <div className="mb-5 flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
                    <HeartHandshake className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.24em] text-amber-700">Sıcak mahalle ruhu</p>
                    <p className="text-sm text-stone-500">İlk anda samimi, içeride düzenli.</p>
                  </div>
                </div>

                <div className="space-y-3">
                  {highlights.map((item) => {
                    const Icon = item.icon;
                    return (
                      <div key={item.title} className="rounded-2xl border border-amber-100 bg-white/85 p-4 shadow-sm">
                        <div className="flex items-start gap-3">
                          <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                            <Icon className="h-5 w-5" />
                          </div>
                          <div>
                            <h2 className="text-base font-bold text-stone-900">{item.title}</h2>
                            <p className="mt-1 text-sm leading-6 text-stone-600">{item.description}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-[28px] border border-amber-100 bg-white p-6 shadow-[0_24px_60px_-42px_rgba(120,74,20,0.38)]">
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-amber-700">Pano</p>
          <h2 className="mt-3 text-2xl font-black text-stone-900">Mahallenin gündemi dağılmadan önünde dursun.</h2>
          <p className="mt-3 text-sm leading-6 text-stone-600">
            Duyurular, kayıplar, etkinlikler ve çağrılar tek bir sıcak akış içinde görünür.
          </p>
        </div>

        <div className="rounded-[28px] border border-amber-100 bg-white p-6 shadow-[0_24px_60px_-42px_rgba(120,74,20,0.38)]">
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-amber-700">Çarşı + Pazar</p>
          <h2 className="mt-3 text-2xl font-black text-stone-900">Yakındaki işletmeleri ve ilanları güvenle keşfet.</h2>
          <p className="mt-3 text-sm leading-6 text-stone-600">
            Mahallenin esnafı, ürünleri, hizmetleri ve ikinci el fırsatları aynı yapının içinde yaşar.
          </p>
        </div>

        <div className="rounded-[28px] border border-amber-100 bg-white p-6 shadow-[0_24px_60px_-42px_rgba(120,74,20,0.38)]">
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-amber-700">Mesajlaşma</p>
          <h2 className="mt-3 text-2xl font-black text-stone-900">Komşuna, işletmeye ya da gruba tek yerden ulaş.</h2>
          <p className="mt-3 text-sm leading-6 text-stone-600">
            Direkt sohbet, grup duvarı ve mahalle dayanışması aynı dilde ve aynı temada ilerler.
          </p>
        </div>
      </section>
    </div>
  );
}
