import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const VISITOR_COOKIE = "dm_vid";

function getDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export async function POST(req: NextRequest) {
  const session = await auth();
  const cookieStore = await cookies();
  const payload = await req.json().catch(() => ({}));
  const pathname = typeof (payload as { pathname?: string }).pathname === "string" && (payload as { pathname?: string }).pathname!.startsWith("/")
    ? (payload as { pathname?: string }).pathname!.slice(0, 180)
    : "/";
  let visitorId = cookieStore.get(VISITOR_COOKIE)?.value;

  if (!visitorId) {
    visitorId = randomUUID();
  }

  const dateKey = getDateKey();
  const user = session?.user.id ? await prisma.user.findUnique({ where: { id: session.user.id } }) : null;

  await prisma.siteVisit.upsert({
    where: { visitorId_dateKey: { visitorId, dateKey } },
    create: {
      visitorId,
      dateKey,
      userId: session?.user.id || null,
      pageCount: 1
    },
    update: {
      pageCount: { increment: 1 },
      userId: session?.user.id || undefined
    }
  });

  await prisma.sitePageView.upsert({
    where: { visitorId_dateKey_path: { visitorId, dateKey, path: pathname } },
    create: {
      visitorId,
      dateKey,
      path: pathname,
      userId: session?.user.id || null,
      neighborhoodId: user?.neighborhoodId || null,
      viewCount: 1
    },
    update: {
      viewCount: { increment: 1 },
      userId: session?.user.id || undefined,
      neighborhoodId: user?.neighborhoodId || undefined
    }
  });

  const response = NextResponse.json({ ok: true });
  response.cookies.set(VISITOR_COOKIE, visitorId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 365,
    path: "/"
  });
  return response;
}
