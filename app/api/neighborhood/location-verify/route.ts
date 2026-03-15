// @ts-nocheck
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { randomUUID } from "crypto";

import { auth } from "@/lib/auth";
import { reverseGeocodeLocation } from "@/lib/geocode";
import { findNeighborhoodByLocation } from "@/lib/neighborhood-geo";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  lat: z.number(),
  lng: z.number()
});

function normalizePart(value?: string | null) {
  return (value || "")
    .toLocaleLowerCase("tr-TR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function titleize(value?: string | null, fallback = "Merkez") {
  const normalized = (value || fallback).trim();
  if (!normalized) return fallback;
  return normalized
    .split(/\s+/)
    .map((part) => part.charAt(0).toLocaleUpperCase("tr-TR") + part.slice(1).toLocaleLowerCase("tr-TR"))
    .join(" ");
}

function buildInviteCode(city: string, district: string, name: string) {
  const raw = `${city}-${district}-${name}-${Date.now().toString().slice(-4)}`
    .toLocaleUpperCase("tr-TR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Z0-9]/g, "");
  return raw.slice(0, 24) || `AUTO${Date.now().toString().slice(-6)}`;
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Yetkişiz" }, { status: 401 });

  const json = await req.json();
  const parsed = schema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const reverse = await reverseGeocodeLocation(parsed.data.lat, parsed.data.lng);
  const city = titleize(reverse?.city, "Türkiye");
  const district = titleize(reverse?.district || reverse?.suburb, "Merkez");
  const name = titleize(reverse?.suburb || reverse?.district, district);

  let neighborhood = await findNeighborhoodByLocation(parsed.data.lat, parsed.data.lng);

  const reverseLooksLikeMatch =
    neighborhood &&
    normalizePart(neighborhood.city) === normalizePart(city) &&
    normalizePart(neighborhood.district) === normalizePart(district) &&
    (normalizePart(neighborhood.name) === normalizePart(name) ||
      normalizePart(neighborhood.name) === normalizePart(district));

  if (!reverseLooksLikeMatch) {
    const allNeighborhoods = await prisma.neighborhood.findMany();
    const existing =
      allNeighborhoods.find(
        (item) =>
          normalizePart(item.city) === normalizePart(city) &&
          normalizePart(item.district) === normalizePart(district) &&
          normalizePart(item.name) === normalizePart(name)
      ) ||
      null;

    neighborhood =
      existing ||
      (await prisma.neighborhood.upsert({
        where: { id: `auto-${normalizePart(city).replace(/\s+/g, "-")}-${normalizePart(district).replace(/\s+/g, "-")}-${normalizePart(name).replace(/\s+/g, "-")}` },
        create: {
          id: `auto-${normalizePart(city).replace(/\s+/g, "-")}-${normalizePart(district).replace(/\s+/g, "-")}-${normalizePart(name).replace(/\s+/g, "-")}` || randomUUID(),
          city,
          district,
          name,
          inviteCode: buildInviteCode(city, district, name),
          lat: parsed.data.lat,
          lng: parsed.data.lng,
          radiusKm: 18
        },
        update: {
          city,
          district,
          name,
          lat: parsed.data.lat,
          lng: parsed.data.lng
        }
      }));
  }
  
  await prisma.neighborhood.update({
    where: { id: neighborhood.id },
    data: {
      city,
      district,
      name,
      lat: parsed.data.lat,
      lng: parsed.data.lng
    }
  });

  const byId = await prisma.user.findUnique({ where: { id: session.user.id } });
  const byEmail =
    !byId && session.user.email
      ? await prisma.user.findUnique({ where: { email: session.user.email } })
      : null;
  const targetUser = byId ?? byEmail;

  if (!targetUser) {
    return NextResponse.json(
      { error: "Oturum kullanıcısı bulunamadı. Lütfen çıkış yapıp tekrar giriş yapın." },
      { status: 401 }
    );
  }

  await prisma.user.update({
    where: { id: targetUser.id },
    data: {
      neighborhoodId: neighborhood.id,
      verifiedAt: new Date()
    }
  });

  const redirectTo = !targetUser.locationScope
    ? "/onboarding/scope"
    : targetUser.locationScope === "DISTRICT"
      ? "/map"
      : "/home";

  return NextResponse.json({
    message: "Konum doğrulandı",
    neighborhoodId: neighborhood.id,
    locationLabel: `${city} / ${district} / ${name}`,
    redirectTo
  });
}



