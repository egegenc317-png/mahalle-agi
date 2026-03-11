// @ts-nocheck
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "@/lib/auth";
import { findNeighborhoodByLocation } from "@/lib/neighborhood-geo";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  lat: z.number(),
  lng: z.number()
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Yetkişiz" }, { status: 401 });

  const json = await req.json();
  const parsed = schema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const neighborhood = await findNeighborhoodByLocation(parsed.data.lat, parsed.data.lng);
  if (!neighborhood) {
    return NextResponse.json({ error: "Konumunuz desteklenen mahallelerle eslesmedi." }, { status: 400 });
  }

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
    redirectTo
  });
}



