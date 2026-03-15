import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Dijital Mahallem",
    short_name: "Dijital Mahallem",
    description: "Mahallene ait duyurulari, ilanlari, dükkanlari ve komsu sohbetlerini tek uygulamada buluşturan yerel topluluk uygulamasi.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#fff7ed",
    theme_color: "#f97316",
    lang: "tr-TR",
    categories: ["social", "shopping", "business"],
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any"
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable"
      }
    ]
  };
}
