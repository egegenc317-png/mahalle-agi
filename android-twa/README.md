# Android TWA

Bu klasör, Bubblewrap ile Android TWA paketi üretmek icin baslangic dosyalarini içerir.

## Kurulum

1. Node.js LTS kurulu olsun.
2. JDK 17 ve Android Studio kurulu olsun.
3. Bubblewrap kur:
   npm i -g @bubblewrap/cli
4. Bu klasördeki manifest ile Android proje üret:
   bubblewrap init --manifest https://dijitalmahallem.com/manifest.webmanifest
5. Gerekirse `twa-manifest.json` icindeki package id ve launcher ayarlarini güncelle.
6. Android proje üret:
   bubblewrap build

## Asset Links

Play imzalama SHA256 fingerprint degeri alindiktan sonra Vercel env'e su degiskenleri gir:
- TWA_PACKAGE_NAME=com.dijitalmahallem.app
- TWA_SHA256_CERT_FINGERPRINTS=AA:BB:CC:...

Sonra `.well-known/assetlinks.json` otomatik dogru içeriği servis eder.

## Play Store Notu

Play Console tarafinda kapali test, veri güvenligi ve gizlilik politikasi zorunludur.
Ayrintili checklist için `docs/PLAY-STORE.md` dosyasina bak.
