"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";

export default function GlobalError({
  error,
  reset
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="tr">
      <body className="bg-[#f8f2e8] text-zinc-900">
        <main className="mx-auto flex min-h-screen max-w-2xl flex-col items-center justify-center px-6 py-12 text-center">
          <div className="rounded-[32px] border border-red-200 bg-white/90 p-8 shadow-[0_30px_80px_-40px_rgba(127,29,29,0.45)]">
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-red-500">Sistem Hatası</p>
            <h1 className="mt-4 text-3xl font-semibold text-zinc-950">Beklenmeyen bir sorun oluştu</h1>
            <p className="mt-3 text-sm text-zinc-600">
              Hata kaydedildi. Sayfayı yeniden deneyebilirsin.
            </p>
            <button
              type="button"
              onClick={reset}
              className="mt-6 rounded-full bg-zinc-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-zinc-800"
            >
              Tekrar Dene
            </button>
          </div>
        </main>
      </body>
    </html>
  );
}
