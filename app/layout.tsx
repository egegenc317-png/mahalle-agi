import type { Metadata, Viewport } from "next";
import "./globals.css";

import { AppShell } from "@/components/app-shell";
import { Providers } from "@/components/providers";
import { PwaRegister } from "@/components/pwa-register";

const siteUrl = process.env.NEXTAUTH_URL || "https://dijitalmahallem.com";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  applicationName: "Dijital Mahallem",
  title: {
    default: "Dijital Mahallem",
    template: "%s | Dijital Mahallem"
  },
  description: "Mahallene ait duyurulari, ilanlari, dükkanlari ve komsu sohbetlerini tek uygulamada buluşturan yerel topluluk uygulamasi.",
  keywords: ["Dijital Mahallem", "mahalle", "duyuru", "ilan", "carsi", "yerel topluluk"],
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Dijital Mahallem"
  },
  formatDetection: {
    telephone: false
  },
  openGraph: {
    title: "Dijital Mahallem",
    description: "Mahallene ait duyurulari, ilanlari, dükkanlari ve komsu sohbetlerini tek uygulamada buluşturan yerel topluluk uygulamasi.",
    url: siteUrl,
    siteName: "Dijital Mahallem",
    locale: "tr_TR",
    type: "website",
    images: [
      {
        url: "/icons/icon-512.png",
        width: 512,
        height: 512,
        alt: "Dijital Mahallem"
      }
    ]
  },
  twitter: {
    card: "summary_large_image",
    title: "Dijital Mahallem",
    description: "Mahallene ait duyurulari, ilanlari, dükkanlari ve komsu sohbetlerini tek uygulamada buluşturan yerel topluluk uygulamasi.",
    images: ["/icons/icon-512.png"]
  }
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#f97316"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr">
      <body>
        <Providers>
          <PwaRegister />
          <AppShell>{children}</AppShell>
        </Providers>
      </body>
    </html>
  );
}
