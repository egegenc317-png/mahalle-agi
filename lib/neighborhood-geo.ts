// @ts-nocheck
import { prisma } from "@/lib/prisma";

type NeighborhoodRecord = {
  id: string;
  city: string;
  district: string;
  name: string;
  lat: number;
  lng: number;
  radiusKm?: number;
};

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

export async function findNeighborhoodByLocation(lat: number, lng: number) {
  const all = (await prisma.neighborhood.findMany()) as NeighborhoodRecord[];
  const ranked = all
    .map((n) => ({
      ...n,
      distance: distanceKm(lat, lng, n.lat, n.lng)
    }))
    .sort((a, b) => a.distance - b.distance);

  const best = ranked[0];
  if (!best) return null;
  return best;
}

