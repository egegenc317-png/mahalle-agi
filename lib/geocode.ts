type GeocodePoint = {
  lat: number;
  lng: number;
};

export type ReverseGeocodeDetails = {
  city?: string | null;
  district?: string | null;
  suburb?: string | null;
  displayName?: string | null;
};

async function geocodeWithPhoton(query: string): Promise<GeocodePoint | null> {
  const q = query.trim();
  if (!q) return null;

  try {
    const res = await fetch(
      `https://photon.komoot.io/api/?q=${encodeURIComponent(q)}&limit=1&lang=tr`,
      {
        headers: {
          Accept: "application/json",
          "User-Agent": "MahalleAgiMVP/1.0"
        },
        cache: "no-store"
      }
    );
    if (!res.ok) return null;

    const data = (await res.json()) as {
      features?: Array<{
        geometry?: { coordinates?: number[] };
      }>;
    };
    const coords = data.features?.[0]?.geometry?.coordinates;
    if (!coords || coords.length < 2) return null;

    const lng = Number(coords[0]);
    const lat = Number(coords[1]);
    if (Number.isNaN(lat) || Number.isNaN(lng)) return null;
    return { lat, lng };
  } catch {
    return null;
  }
}

async function geocodeSingleQuery(query: string): Promise<GeocodePoint | null> {
  const q = query.trim();
  if (!q) return null;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 7000);

  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&countrycodes=tr&q=${encodeURIComponent(q)}`,
      {
        headers: {
          Accept: "application/json",
          "Accept-Language": "tr,en",
          "User-Agent": "MahalleAgiMVP/1.0"
        },
        signal: controller.signal,
        cache: "no-store"
      }
    );

    if (res.status === 429) {
      await new Promise((resolve) => setTimeout(resolve, 900));
      const retryRes = await fetch(
        `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&countrycodes=tr&q=${encodeURIComponent(q)}`,
        {
          headers: {
            Accept: "application/json",
            "Accept-Language": "tr,en",
            "User-Agent": "MahalleAgiMVP/1.0"
          },
          signal: controller.signal,
          cache: "no-store"
        }
      );
      if (!retryRes.ok) return null;
      const retryData = (await retryRes.json()) as Array<{ lat: string; lon: string }>;
      if (!retryData[0]) return null;
      const retryLat = Number(retryData[0].lat);
      const retryLng = Number(retryData[0].lon);
      if (Number.isNaN(retryLat) || Number.isNaN(retryLng)) return null;
      return { lat: retryLat, lng: retryLng };
    }

    if (!res.ok) return null;
    const data = (await res.json()) as Array<{ lat: string; lon: string }>;
    if (!data[0]) return null;

    const lat = Number(data[0].lat);
    const lng = Number(data[0].lon);
    if (Number.isNaN(lat) || Number.isNaN(lng)) return null;

    return { lat, lng };
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

export async function geocodeLocationText(
  query: string,
  fallbackQueries: string[] = []
): Promise<GeocodePoint | null> {
  const candidates = [query, ...fallbackQueries]
    .map((q) => q.trim())
    .filter(Boolean)
    .filter((q, idx, arr) => arr.indexOf(q) === idx);

  for (const candidate of candidates) {
    const point = await geocodeSingleQuery(candidate);
    if (point) return point;

    const photonPoint = await geocodeWithPhoton(candidate);
    if (photonPoint) return photonPoint;
  }

  return null;
}

export async function reverseGeocodeLocation(lat: number, lng: number): Promise<ReverseGeocodeDetails | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 7000);

  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(String(lat))}&lon=${encodeURIComponent(String(lng))}&zoom=16&addressdetails=1`,
      {
        headers: {
          Accept: "application/json",
          "Accept-Language": "tr,en",
          "User-Agent": "MahalleAgiMVP/1.0"
        },
        signal: controller.signal,
        cache: "no-store"
      }
    );

    if (!res.ok) return null;

    const data = (await res.json()) as {
      display_name?: string;
      address?: {
        city?: string;
        town?: string;
        municipality?: string;
        suburb?: string;
        borough?: string;
        city_district?: string;
        state_district?: string;
        county?: string;
      };
    };

    const address = data.address || {};
    return {
      city: address.city || address.town || address.municipality || null,
      district: address.city_district || address.state_district || address.county || null,
      suburb: address.suburb || address.borough || null,
      displayName: data.display_name || null
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}
