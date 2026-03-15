import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Gizlilik Politikasi",
  description: "Dijital Mahallem gizlilik ve veri isleme bilgileri"
};

export default function PrivacyPage() {
  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="overflow-hidden rounded-[28px] border border-amber-200 bg-white shadow-[0_24px_80px_-32px_rgba(249,115,22,0.35)]">
        <div className="border-b border-amber-100 bg-gradient-to-r from-amber-50 via-white to-orange-50 px-6 py-8 sm:px-8">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-orange-600">Dijital Mahallem</p>
          <h1 className="mt-3 text-3xl font-black tracking-tight text-zinc-900">Gizlilik Politikasi</h1>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-zinc-600">Bu sayfa Google Play, Android uygulama kurulumu ve web kullaniminda hangi verileri neden kullandigimizi özetler.</p>
        </div>
        <div className="space-y-8 px-6 py-8 text-sm leading-7 text-zinc-700 sm:px-8">
          <section>
            <h2 className="text-lg font-bold text-zinc-900">Toplanan veriler</h2>
            <p>Hesap olustururken ad, kullanici adi, opsiyonel e-posta, profil görselleri ve uygulama içinde ekledigin icerikler saklanir. Konum izni verirsen mahalle eslestirmesi icin cihaz konumu kullanilir.</p>
          </section>
          <section>
            <h2 className="text-lg font-bold text-zinc-900">Verilerin kullanimi</h2>
            <p>Veriler; mahalle bazli duyuru, ilan, dükkan ve mesajlasma deneyimini saglamak, güvenlik kontrolleri yapmak ve hizmet kalitesini arttirmak icin kullanilir.</p>
          </section>
          <section>
            <h2 className="text-lg font-bold text-zinc-900">Ücüncü taraf servisler</h2>
            <p>Uygulama; barindirma, veritabani, nesne depolama, e-posta ve hata izleme icin güvenilir servisler kullanir. Bu servisler sadece hizmetin calismasi icin gereken kapsamda veri isler.</p>
          </section>
          <section>
            <h2 className="text-lg font-bold text-zinc-900">Iletisim</h2>
            <p>Veri ve gizlilik talepleri icin <a className="font-semibold text-orange-700 underline underline-offset-2" href="mailto:destek@dijitalmahallem.com">destek@dijitalmahallem.com</a> adresine ulasabilirsin.</p>
          </section>
          <section>
            <h2 className="text-lg font-bold text-zinc-900">Hesap silme</h2>
            <p>Hesap silme talimatlari icin <Link href="/hesap-silme" className="font-semibold text-orange-700 underline underline-offset-2">hesap silme sayfasini</Link> ziyaret edebilirsin.</p>
          </section>
        </div>
      </div>
    </main>
  );
}
