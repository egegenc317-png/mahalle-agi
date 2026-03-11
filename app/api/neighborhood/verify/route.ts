// @ts-nocheck
import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { verifyNeighborhoodSchema } from "@/lib/validations";

export async function GET() {
  const items = await prisma.neighborhood.findMany({ orderBy: [{ city: "asc" }, { district: "asc" }] });
  return NextResponse.json({ items });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Yetkişiz" }, { status: 401 });

  const json = await req.json();
  const parsed = verifyNeighborhoodSchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const neighborhood = await prisma.neighborhood.findUnique({ where: { id: parsed.data.neighborhoodId } });
  if (!neighborhood || neighborhood.inviteCode !== parsed.data.inviteCode) {
    return NextResponse.json({ error: "Doğrulama kodu hatali" }, { status: 400 });
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: { neighborhoodId: neighborhood.id, verifiedAt: new Date() }
  });

  return NextResponse.json({ message: "Mahalle doğrulandı" });
}



