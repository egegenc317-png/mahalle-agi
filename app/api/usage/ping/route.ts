// @ts-nocheck
import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getWeekKey } from "@/lib/week";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Yetkişiz" }, { status: 401 });

  const payload = await req.json().catch(() => ({}));
  const raw = Number((payload as { seconds?: number }).seconds ?? 60);
  const seconds = Number.isFinite(raw) ? Math.max(1, Math.min(300, Math.round(raw))) : 60;

  const weekKey = getWeekKey(new Date());

  await prisma.userWeeklyUsage.upsert({
    where: { userId_weekKey: { userId: session.user.id, weekKey } },
    update: { seconds: { increment: seconds } },
    create: {
      userId: session.user.id,
      weekKey,
      seconds
    }
  });

  await prisma.user.update({
    where: { id: session.user.id },
    data: { lastActiveAt: new Date() }
  });

  return NextResponse.json({ ok: true });
}



