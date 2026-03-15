import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = process.env.NEXTAUTH_URL || "https://dijitalmahallem.com";
  const now = new Date();

  return [
    "",
    "/auth/login",
    "/auth/register",
    "/hakkimizda",
    "/akis",
    "/board",
    "/carsi",
    "/pazar",
    "/map",
    "/gizlilik",
    "/hesap-silme"
  ].map((path) => ({
    url: `${baseUrl}${path}`,
    lastModified: now,
    changeFrequency: path === "" ? "daily" : "weekly",
    priority: path === "" ? 1 : 0.7
  }));
}
