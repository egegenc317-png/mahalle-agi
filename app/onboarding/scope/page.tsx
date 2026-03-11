import { redirect } from "next/navigation";
import { Compass, MapPinned } from "lucide-react";

import { auth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default async function ScopeOnboardingPage() {
  const session = await auth();
  if (!session) redirect("/auth/login");

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <div className="rounded-[24px] border border-amber-200 bg-[linear-gradient(135deg,#fff7ed_0%,#fffdf8_48%,#fffbeb_100%)] px-4 py-5 text-center shadow-sm sm:px-6 sm:py-6">
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl">Nerede Takip Etmek Istiyorsun?</h1>
        <p className="mt-2 text-sm text-zinc-600 sm:text-base">
          Mahalle seçersen mevcut deneyim aynı kalır. Semt seçersen harita ve içerikler semt geneline yayılır.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50">
          <CardHeader className="p-5 sm:p-6">
            <div className="mb-2 inline-flex h-11 w-11 items-center justify-center rounded-full bg-orange-500 text-white">
              <MapPinned className="h-5 w-5" />
            </div>
            <CardTitle className="text-xl sm:text-2xl">Mahalle</CardTitle>
            <p className="text-sm text-zinc-600">
              Sadece kendi mahallendeki ilanlar, duyurular ve oylamalar. Mevcut akışın aynısı.
            </p>
          </CardHeader>
          <CardContent className="p-5 pt-0 sm:p-6 sm:pt-0">
            <form action="/api/user/location-scope" method="post">
              <input type="hidden" name="scope" value="NEIGHBORHOOD" />
              <Button type="submit" className="h-12 w-full bg-orange-500 text-base hover:bg-orange-600">
                Mahalle Modunu Seç
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="border-emerald-200 bg-gradient-to-br from-emerald-50 to-teal-50">
          <CardHeader className="p-5 sm:p-6">
            <div className="mb-2 inline-flex h-11 w-11 items-center justify-center rounded-full bg-emerald-600 text-white">
              <Compass className="h-5 w-5" />
            </div>
            <CardTitle className="text-xl sm:text-2xl">Semt</CardTitle>
            <p className="text-sm text-zinc-600">
              Aynı ilçe/semtteki Tüm mahallelerin içeriklerini tek akışta ve haritada Gör.
            </p>
          </CardHeader>
          <CardContent className="p-5 pt-0 sm:p-6 sm:pt-0">
            <form action="/api/user/location-scope" method="post">
              <input type="hidden" name="scope" value="DISTRICT" />
              <Button type="submit" className="h-12 w-full bg-emerald-600 text-base hover:bg-emerald-700">
                Semt Modunu Seç
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}




