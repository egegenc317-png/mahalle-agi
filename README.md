# Mahalle Agi MVP

Next.js App Router + TypeScript ile gelistirilmis lokal topluluk, ikinci el ve mikro is ilan uygulamasi.

## MVP Kapsami
- Auth: NextAuth (Credentials + opsiyonel Google)
- Mahalle onboarding ve inviteCode dogrulamasi
- Ilanlar: PRODUCT / SERVICE / JOB
- Feed: filtre + arama
- Mesajlasma: polling (5 saniye)
- TrustScore: 0-100
- Raporlama + moderator/admin paneli
- Foto yukleme: local disk (1-3 foto, max 2MB, jpg/png)

## Guvenlik Notu
- Register icin memory rate-limit eklendi.
- Login icin NextAuth Credentials kullaniliyor; production'da reverse-proxy seviyesinde IP rate-limit uygulanmasi onerilir.

## Calistirma
1. `.env.example` dosyasini `.env` olarak kopyalayin.
2. Veritabani:
   - `docker-compose up -d postgres`
3. Paketler:
   - `npm install`
4. Prisma:
   - `npx prisma migrate dev --name init`
   - `npx prisma db seed`
5. Uygulama:
   - `npm run dev`

## Docker ile app + db
- `docker-compose up --build`

## Seed
- Neighborhood:
  - Bursa / Nilufer / Gorukle (`NILUFER123`)
  - Istanbul / Kadikoy / Moda (`KADIKOY123`)
  - Ankara / Cankaya / Bahcelievler (`CANKAYA123`)
- Demo user:
  - `admin@mahalle.local / 123456`
  - `demo@mahalle.local / 123456`

## API Ornekleri
- `POST /api/auth/register`
- `POST /api/neighborhood/verify`
- `GET /api/listings?type=&q=&category=&minPrice=&maxPrice=&sort=`
- `POST /api/listings`
- `GET /api/listings/:id`
- `POST /api/conversations`
- `GET /api/conversations`
- `GET /api/conversations/:id/messages`
- `POST /api/conversations/:id/messages`
- `POST /api/reports`
