// @ts-nocheck
import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const item = await prisma.listing.findUnique({
    where: { id: params.id },
    include: { user: { select: { id: true, name: true } }, neighborhood: true }
  });

  if (!item) return NextResponse.json({ error: "Bulunamadı" }, { status: 404 });
  return NextResponse.json(item);
}


