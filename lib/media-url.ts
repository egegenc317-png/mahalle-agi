export function normalizeMediaUrl(url: string | null | undefined) {
  if (!url) return "";
  if (url.startsWith("/uploads/")) return url;
  if (url.startsWith("uploads/")) return `/${url}`;

  try {
    const parsed = new URL(url);
    const pathname = decodeURIComponent(parsed.pathname || "/").replace(/^\/+/, "");

    if (parsed.hostname.endsWith(".r2.dev")) {
      return pathname ? `/uploads/${pathname}` : "";
    }

    if (parsed.hostname.includes("r2.cloudflarestorage.com")) {
      const segments = pathname.split("/").filter(Boolean);
      if (segments.length >= 2) return `/uploads/${segments.slice(1).join("/")}`;
      if (segments.length === 1) return `/uploads/${segments[0]}`;
    }
  } catch {
    return url;
  }

  return url;
}
