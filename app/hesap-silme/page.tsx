import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Hesap Silme",
  description: "Dijital Mahallem hesap silme adimlari"
};

export default function AccountDeletionPage() {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="overflow-hidden rounded-[28px] border border-amber-200 bg-white shadow-[0_24px_80px_-32px_rgba(249,115,22,0.35)]">
        <div className="border-b border-amber-100 bg-gradient-to-r from-amber-50 via-white to-orange-50 px-6 py-8 sm:px-8">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-orange-600">Dijital Mahallem</p>
          <h1 className="mt-3 text-3xl font-black tracking-tight text-zinc-900">Hesap Silme</h1>
          <p className="mt-3 text-sm leading-7 text-zinc-600">Google Play gereklilikleri icin bu sayfa, hesabini ve verilerini nasil sildirebilecegini aciklar.</p>
        </div>
        <div className="space-y-6 px-6 py-8 text-sm leading-7 text-zinc-700 sm:px-8">
          <section>
            <h2 className="text-lg font-bold text-zinc-900">Uygulama icinden talep</h2>
            <p>Hesabina giris yaptiktan sonra profil ekranindan destek iletisimi uzerinden hesap silme talebi iletebilirsin.</p>
          </section>
          <section>
            <h2 className="text-lg font-bold text-zinc-900">E-posta ile talep</h2>
            <p><a className="font-semibold text-orange-700 underline underline-offset-2" href="mailto:destek@dijitalmahallem.com?subject=Hesap%20Silme%20Talebi">destek@dijitalmahallem.com</a> adresine kayitli kullanici adin ve hesap silme talebin ile e-posta gönder.</p>
          </section>
          <section>
            <h2 className="text-lg font-bold text-zinc-900">Süre ve kapsam</h2>
            <p>Talep dogrulandiktan sonra hesap ve dogrudan iliskili temel profil verileri makul süre içinde kaldirilir. Hukuki yükümlülük, güvenlik kaydi veya finansal iz gerektiren veriler, zorunlu süre boyunca sinirli sekilde saklanabilir.</p>
          </section>
        </div>
      </div>
    </main>
  );
}
