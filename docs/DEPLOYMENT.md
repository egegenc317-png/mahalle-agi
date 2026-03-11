# Deployment Runbook

## Gerekenler

- `DB_PROVIDER=postgres`
- `DATABASE_URL`
- `POSTGRES_DATABASE_URL`
- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`
- `STORAGE_PROVIDER=s3`
- `S3_ENDPOINT`
- `S3_BUCKET`
- `S3_REGION=auto`
- `S3_ACCESS_KEY_ID`
- `S3_SECRET_ACCESS_KEY`
- `S3_PUBLIC_BASE_URL`
- `NEXTAUTH_URL`
- `NEXTAUTH_SECRET`
- `APP_ENCRYPTION_SECRET`
- `SMTP_*`
- opsiyonel `SENTRY_DSN`

## Yayın Öncesi

1. `npm install`
2. `npm run prisma:generate:all`
3. `npx prisma db push --schema prisma/schema.postgres.prisma`
4. `npm run migrate:sqlite-to-postgres`
5. `npm run build`

## Yayın Sonrası Kontroller

1. `GET /api/health`
2. `SMOKE_BASE_URL=https://alanadin.com npm run smoke`
3. kayıt olma ve e-posta doğrulama
4. dosya yükleme
5. mesaj gönderme

## Gözlemleme

- `SENTRY_DSN` ve `NEXT_PUBLIC_SENTRY_DSN` girilirse hata takibi aktif olur
- `GET /api/health` hazırda kontrol endpoint'idir
