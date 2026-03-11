// @ts-nocheck
import { prisma } from "@/lib/prisma";

export type LocationScope = "NEIGHBORHOOD" | "DISTRICT";

type NeighborhoodRecord = {
  id: string;
  city: string;
  district: string;
  lat: number;
  lng: number;
  radiusKm?: number;
};

export async function resolveScopeNeighborhoodIds(
  neighborhoodId?: string | null,
  locationScope?: string | null
) {
  if (!neighborhoodId) {
    return { ids: [] as string[], currentNeighborhood: null, effectiveScope: "NEIGHBORHOOD" as LocationScope };
  }

  const currentNeighborhood = await prisma.neighborhood.findUnique({ where: { id: neighborhoodId } });
  if (!currentNeighborhood) {
    return { ids: [] as string[], currentNeighborhood: null, effectiveScope: "NEIGHBORHOOD" as LocationScope };
  }

  const effectiveScope: LocationScope = locationScope === "DISTRICT" ? "DISTRICT" : "NEIGHBORHOOD";
  if (effectiveScope === "NEIGHBORHOOD") {
    return { ids: [currentNeighborhood.id], currentNeighborhood, effectiveScope };
  }

  const allNeighborhoods = (await prisma.neighborhood.findMany()) as NeighborhoodRecord[];
  const ids = allNeighborhoods
    .filter((n) => n.city === currentNeighborhood.city && n.district === currentNeighborhood.district)
    .map((n) => n.id);

  return { ids: ids.length > 0 ? ids : [currentNeighborhood.id], currentNeighborhood, effectiveScope };
}

function toRad(v: number) {
  return (v * Math.PI) / 180;
}

function distanceKm(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export async function validatePointInUserScope(input: {
  lat: number;
  lng: number;
  neighborhoodId?: string | null;
  locationScope?: string | null;
}) {
  const scopeContext = await resolveScopeNeighborhoodIds(input.neighborhoodId, input.locationScope);
  if (scopeContext.ids.length === 0) {
    return { ok: false, error: "Kullanici kapsam bilgisi bulunamadi." };
  }

  const all = (await prisma.neighborhood.findMany()) as NeighborhoodRecord[];
  const ranked = all
    .map((n) => ({
      ...n,
      distance: distanceKm(input.lat, input.lng, n.lat, n.lng)
    }))
    .sort((a, b) => a.distance - b.distance);

  const nearest = ranked[0];
  if (!nearest) {
    return { ok: false, error: "Konum dogrulanamadi." };
  }

  const radiusKm = typeof nearest.radiusKm === "number" ? nearest.radiusKm : 10;
  if (nearest.distance > radiusKm) {
    return { ok: false, error: "Konumunuz sistemdeki desteklenen bolgeler disinda." };
  }

  const inScope = scopeContext.ids.includes(nearest.id);
  if (!inScope) {
    const scopeLabel = scopeContext.effectiveScope === "DISTRICT" ? "semtiniz" : "mahalleniz";
    return { ok: false, error: `Konumunuz secili ${scopeLabel} kapsami disinda.` };
  }

  return { ok: true, matchedNeighborhoodId: nearest.id };
}

