import { cookies } from "next/headers";
import { NextResponse } from "next/server";
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

export async function POST() {
  const session = await auth();
  const cookieStore = await cookies();
  let visitorId = cookieStore.get(VISITOR_COOKIE)?.value;

  if (!visitorId) {
    visitorId = randomUUID();
  }

  const dateKey = getDateKey();

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
