import { redirect } from "next/navigation";
import { Megaphone, ShieldCheck, Sparkles } from "lucide-react";

import { auth } from "@/lib/auth";
import { BoardCreateForm } from "@/components/board-create-form";
import { Card, CardContent } from "@/components/ui/card";

export default async function NewBoardPostPage() {
  const session = await auth();
  if (!session) redirect("/auth/login");
  if (!session.user.locationScope) redirect("/onboarding/scope");
  if (!session.user.neighborhoodId) redirect("/onboarding/neighborhood");

  return (
    <section className="relative mx-auto max-w-5xl overflow-hidden rounded-[24px] border border-amber-200 bg-[radial-gradient(circle_at_10%_10%,rgba(251,191,36,0.20),transparent_40%),radial-gradient(circle_at_90%_10%,rgba(251,146,60,0.20),transparent_35%),linear-gradient(135deg,#fff7ed_0%,#ffffff_45%,#fffbeb_100%)] p-3 shadow-xl sm:rounded-3xl sm:p-6">
      <div className="pointer-events-none absolute -left-20 -top-16 h-56 w-56 rounded-full bg-amber-300/25 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-20 -right-24 h-64 w-64 rounded-full bg-orange-300/20 blur-3xl" />

      <div className="relative z-10 grid gap-4 lg:grid-cols-[1.2fr_1fr]">
        <Card className="border-amber-200/80 bg-white/90 shadow-lg backdrop-blur">
          <CardContent className="p-3 sm:p-6">
            <BoardCreateForm />
          </CardContent>
        </Card>

        <aside className="space-y-3 rounded-2xl border border-amber-200 bg-white/80 p-4 shadow-sm sm:p-5">
          <p className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
            <Sparkles className="h-3.5 w-3.5" /> Premium Pano
          </p>
          <h1 className="text-xl font-extrabold tracking-tight text-zinc-900 sm:text-2xl">Yeni Duyuru Ekle</h1>
          <p className="text-sm leading-relaxed text-zinc-600">
            Kurumsal seviyede temiz bir duyuru akışı: mesajını net yaz, fotoğrafları ekle, mahalleye güvenli şekilde duyur.
          </p>

          <div className="space-y-2 rounded-xl border border-amber-100 bg-amber-50/60 p-3 text-sm text-zinc-700">
            <p className="inline-flex items-center gap-2 font-semibold text-zinc-900">
              <Megaphone className="h-4 w-4 text-orange-500" /> Etkili duyuru formatı
            </p>
            <p>Kısa ve net başlık, açıklayıcı metin ve ilgili fotoğraflar daha hızlı etkileşim alır.</p>
          </div>

          <div className="space-y-2 rounded-xl border border-emerald-100 bg-emerald-50/60 p-3 text-sm text-zinc-700">
            <p className="inline-flex items-center gap-2 font-semibold text-zinc-900">
              <ShieldCheck className="h-4 w-4 text-emerald-600" /> Güvenli paylasim
            </p>
            <p>Konum doğrulaması otomatik yapılır. Duyuru fotoğrafları panoda değil, detay sayfasında görünür.</p>
          </div>
        </aside>
      </div>
    </section>
  );
}



