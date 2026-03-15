# Play Store Hazirlik Plani

Bu proje artik PWA ve TWA temeline sahip. Google Play'e cikis icin kalan adimlar:

## 1. Teknik Hazirlik

- Canli site: `https://dijitalmahallem.com`
- Manifest: `/manifest.webmanifest`
- Service worker: `/sw.js`
- Asset links: `/.well-known/assetlinks.json`
- Gizlilik politikasi: `/gizlilik`
- Hesap silme sayfasi: `/hesap-silme`

## 2. Google Play Developer

- Google Play Developer hesabi ac
- Uygulama adi: `Dijital Mahallem`
- Varsayilan dil: `Turkce`
- Uygulama türü: `App`
- Ücret: `Free`

## 3. Kapali Test

Google Play yeni kisisel hesaplarda production öncesi kapali test ister.
Hazirla:
- en az 12 test kullanicisi
- en az 14 gün aktif test

## 4. Store Listing

Hazirla:
- Kisa aciklama
- Tam aciklama
- 512x512 ikon
- telefon ekran görüntüleri
- kategori: `Social` veya `Communication`
- iletisim e-postasi: `destek@dijitalmahallem.com`
- gizlilik politikasi URL: `https://dijitalmahallem.com/gizlilik`

## 5. Data Safety

Beyan etmen gereken ana veri gruplari:
- konum
- kullanici icerikleri
- görseller
- mesajlar
- kullanici kimligi / hesap bilgileri

## 6. Hesap Silme

Google Play icin dis bağlantı URL:
- `https://dijitalmahallem.com/hesap-silme`

## 7. TWA Paketleme

1. `android-twa/twa-manifest.json` dosyasini kontrol et
2. Bubblewrap ile Android proje üret
3. Android Studio'da AAB al
4. Play Console'a yükle

## 8. Asset Links Son Ayar

Play App Signing SHA256 fingerprint degerini aldiktan sonra Vercel env'e ekle:
- `TWA_PACKAGE_NAME`
- `TWA_SHA256_CERT_FINGERPRINTS`

## 9. Canliya Gecis Öncesi Kontrol

- `/manifest.webmanifest` aciliyor mu
- `/sw.js` 200 dönüyor mu
- `/.well-known/assetlinks.json` aciliyor mu
- `/gizlilik` aciliyor mu
- `/hesap-silme` aciliyor mu
- Android Chrome'da `Ana ekrana ekle` cikariyor mu
