// @ts-nocheck
import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { validatePointInUserScope } from "@/lib/location-scope";
import { prisma } from "@/lib/prisma";

type BusinessClosedHour = {
  day: number;
  mode: "FULL_DAY" | "RANGE";
  start?: string;
  end?: string;
};

function isValidTime(value: string) {
  return /^\d{2}:\d{2}$/.test(value);
}

function normalizeClosedHours(input: unknown): BusinessClosedHour[] | null {
  if (!Array.isArray(input)) return null;

  const parsed: BusinessClosedHour[] = [];
  const usedDays = new Set<number>();

  for (const row of input) {
    if (!row || typeof row !== "object") return null;
    const day = Number((row as { day?: unknown }).day);
    const mode = String((row as { mode?: unknown }).mode) as BusinessClosedHour["mode"];
    const start = (row as { start?: unknown }).start;
    const end = (row as { end?: unknown }).end;

    if (!Number.isInteger(day) || day < 0 || day > 6) return null;
    if (usedDays.has(day)) return null;
    usedDays.add(day);

    if (mode !== "FULL_DAY" && mode !== "RANGE") return null;

    if (mode === "RANGE") {
      if (typeof start !== "string" || typeof end !== "string") return null;
      if (!isValidTime(start) || !isValidTime(end)) return null;
      parsed.push({ day, mode, start, end });
      continue;
    }

    parsed.push({ day, mode: "FULL_DAY" });
  }

  return parsed;
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Yetkişiz" }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user) return NextResponse.json({ error: "Kullanıcı bulunamadı" }, { status: 404 });
  if (user.accountType !== "BUSINESS") {
    return NextResponse.json({ error: "Sadece işletme hesapları Dükkan oluşturabilir" }, { status: 403 });
  }
  if (!user.neighborhoodId || !user.locationScope) {
    return NextResponse.json({ error: "Kapsam/mahalle seçimi gerekli" }, { status: 400 });
  }

  const json = await req.json();
  const shopName = String(json.shopName || "").trim();
  const businessCategory = String(json.businessCategory || "").trim();
  const shopLogo = json.shopLogo ? String(json.shopLogo) : null;
  const lat = Number(json.locationLat);
  const lng = Number(json.locationLng);
  const locationText = json.locationText ? String(json.locationText) : null;
  const businessClosedHours = normalizeClosedHours(json.businessClosedHours);

  if (!shopName || shopName.length < 2) {
    return NextResponse.json({ error: "Dükkan adı en az 2 karakter olmalı" }, { status: 400 });
  }
  if (!businessCategory || businessCategory.length < 2) {
    return NextResponse.json({ error: "İşletme kategorisi seçmelisiniz" }, { status: 400 });
  }
  if (Number.isNaN(lat) || Number.isNaN(lng)) {
    return NextResponse.json({ error: "Geçerli konum alınamadı" }, { status: 400 });
  }
  if (json.businessClosedHours !== undefined && businessClosedHours === null) {
    return NextResponse.json({ error: "Kapalı saat formatı geçersiz" }, { status: 400 });
  }

  const scopeCheck = await validatePointInUserScope({
    lat,
    lng,
    neighborhoodId: user.neighborhoodId,
    locationScope: user.locationScope
  });

  if (!scopeCheck.ok) {
    return NextResponse.json({ error: scopeCheck.error }, { status: 400 });
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      shopName,
      businessCategory,
      shopLogo,
      businessClosedHours: businessClosedHours ?? null,
      shopLocationLat: lat,
      shopLocationLng: lng,
      shopLocationText: locationText
    }
  });

  return NextResponse.json({ ok: true });
}



