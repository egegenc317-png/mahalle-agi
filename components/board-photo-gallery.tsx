"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight, Expand, X } from "lucide-react";

type BoardPhotoGalleryProps = {
  photos: string[];
  title: string;
};

export function BoardPhotoGallery({ photos, title }: BoardPhotoGalleryProps) {
  const [index, setIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  const prev = () => setIndex((current) => (current - 1 + photos.length) % photos.length);
  const next = () => setIndex((current) => (current + 1) % photos.length);

  useEffect(() => {
    if (!lightboxOpen || photos.length === 0) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setLightboxOpen(false);
        return;
      }
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        setIndex((current) => (current - 1 + photos.length) % photos.length);
        return;
      }
      if (event.key === "ArrowRight") {
        event.preventDefault();
        setIndex((current) => (current + 1) % photos.length);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [lightboxOpen, photos.length]);

  if (photos.length === 0) return null;

  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-[#5b3a22]">Fotoğraflar</h2>
        <button
          type="button"
          onClick={() => setLightboxOpen(true)}
          className="inline-flex items-center gap-1 rounded-md border border-[#c49a6c] bg-white px-2 py-1 text-xs text-[#6b4a2d] hover:bg-[#fff3e3]"
        >
          <Expand className="h-3.5 w-3.5" />
          Tam ekran
        </button>
      </div>

      <div className="relative overflow-hidden rounded-xl border border-[#d6b48d] bg-white">
        <button
          type="button"
          onClick={() => setLightboxOpen(true)}
          className="block w-full"
        >
          <Image
            src={photos[index]}
            alt={`${title} Fotoğraf ${index + 1}`}
            width={1400}
            height={1000}
            className="h-72 w-full object-cover sm:h-80"
          />
        </button>

        {photos.length > 1 ? (
          <>
            <button
              type="button"
              onClick={prev}
              className="absolute left-2 top-1/2 z-10 inline-flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/55 text-white hover:bg-black/70"
              aria-label="Önceki Fotoğraf"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={next}
              className="absolute right-2 top-1/2 z-10 inline-flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/55 text-white hover:bg-black/70"
              aria-label="Sonraki Fotoğraf"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </>
        ) : null}
      </div>

      {photos.length > 1 ? (
        <div className="grid grid-cols-5 gap-2 sm:grid-cols-7">
          {photos.map((photo, photoIndex) => (
            <button
              key={`${photo}-${photoIndex}`}
              type="button"
              onClick={() => setIndex(photoIndex)}
              className={`relative overflow-hidden rounded-md border ${
                photoIndex === index ? "border-[#d97f23] ring-2 ring-[#e58a2d]/40" : "border-[#d6b48d]"
              }`}
            >
              <Image
                src={photo}
                alt={`${title} küçük Fotoğraf ${photoIndex + 1}`}
                width={200}
                height={140}
                className="h-14 w-full object-cover"
              />
            </button>
          ))}
        </div>
      ) : null}

      {lightboxOpen ? (
        <div className="fixed inset-0 z-[2000] bg-black/90">
          <button
            type="button"
            onClick={() => setLightboxOpen(false)}
            className="absolute right-4 top-4 z-20 inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/15 text-white hover:bg-white/25"
            aria-label="Kapat"
          >
            <X className="h-5 w-5" />
          </button>

          <div className="absolute inset-0 flex items-center justify-center p-6">
            <Image
              src={photos[index]}
              alt={`${title} büyük Fotoğraf ${index + 1}`}
              width={1800}
              height={1200}
              className="max-h-[88vh] w-auto max-w-[96vw] rounded-lg object-contain"
            />
          </div>

          {photos.length > 1 ? (
            <>
              <button
                type="button"
                onClick={prev}
                className="absolute left-4 top-1/2 z-20 inline-flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/15 text-white hover:bg-white/25"
                aria-label="Önceki Fotoğraf"
              >
                <ChevronLeft className="h-6 w-6" />
              </button>
              <button
                type="button"
                onClick={next}
                className="absolute right-4 top-1/2 z-20 inline-flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/15 text-white hover:bg-white/25"
                aria-label="Sonraki Fotoğraf"
              >
                <ChevronRight className="h-6 w-6" />
              </button>
            </>
          ) : null}

          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-black/50 px-3 py-1 text-xs text-white">
            {index + 1} / {photos.length}
          </div>
        </div>
      ) : null}
    </section>
  );
}



