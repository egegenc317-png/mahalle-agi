# Production Checklist

Bu proje işlev bozmadan sertleştirildi. Büyük yayın öncesi aşağıdaki sıra izlenmeli.

## Zorunlu ortam değişkenleri

- `NEXTAUTH_URL`
- `NEXTAUTH_SECRET`
- `APP_ENCRYPTION_SECRET`
- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_USER`
- `SMTP_PASS`
- `SMTP_FROM`
- `DB_PROVIDER`
- `DATABASE_URL`
- `POSTGRES_DATABASE_URL`
- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`
- `STORAGE_PROVIDER`
- `S3_ENDPOINT`
- `S3_REGION`
- `S3_BUCKET`
- `S3_ACCESS_KEY_ID`
- `S3_SECRET_ACCESS_KEY`
- `S3_PUBLIC_BASE_URL`

## Canlıya çıkmadan önce

1. `APP_ENCRYPTION_SECRET` için en az 32 karakter rastgele değer tanımla.
2. Uygulamayı yalnızca HTTPS arkasında yayınla.
3. `DB_PROVIDER=postgres` ile yönetilen veritabanını aç ve şemayı `prisma/schema.postgres.prisma` ile push et.
4. `POSTGRES_DATABASE_URL` tanımlayıp `npm run migrate:sqlite-to-postgres` ile veriyi taşı.
5. `UPSTASH_REDIS_REST_URL` ve `UPSTASH_REDIS_REST_TOKEN` tanımla.
6. `STORAGE_PROVIDER=s3` ile bucket/env bilgilerini gir.
7. SMTP gönderimini gerçek test hesabıyla doğrula.
8. Upload, kayıt, mesaj spam ve grup davet akışlarını smoke test et.

## Mevcut sertleştirmeler

- Kimlik doğrulamasız upload kapalı
- MIME ve uzantı kısıtları aktif
- Rate limit aktif
- Audit log aktif
- E-posta doğrulama kodları hash'li saklanıyor
- Grup davet token'ları hash + şifreli saklanıyor
- Güvenlik header'ları aktif
- Uygulama verileri SQLite üzerinden gerçek veritabanında tutuluyor
- JSON veri göçü için migration script hazır
- Postgres runtime desteği hazır
- Upstash Redis rate limit desteği hazır
- S3/R2 object storage upload desteği hazır

## Büyük ölçek için kalan mimari iş

1. Kuyruk sistemi ve arka plan işler ekle
2. CDN ve cache stratejisi ekle
3. Log, error tracking, healthcheck ve metrics ekle
4. Yedekleme ve disaster recovery prosedürü çıkar
5. Yük testi ve rollback planı uygula

## Güvenli geçiş sırası

1. Prisma şemasını mevcut uygulama alanlarıyla eşleştir
2. JSON verilerini migration script ile DB'ye aktar
3. `lib/prisma.ts` için adapter katmanı yaz
4. Uygulamayı DB-backed adapter ile doğrula
5. Eski JSON katmanını devreden çıkar
