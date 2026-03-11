// @ts-nocheck
import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { checkRateLimit } from "@/lib/ratelimit";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Yetkişiz" }, { status: 401 });

  const ip = (req.headers.get("x-forwarded-for") || "local").split(",")[0].trim();
  if (!(await checkRateLimit(`user-search:${session.user.id}:${ip}`, { windowMs: 60_000, maxAttempts: 30 })).ok) {
    return NextResponse.json({ error: "Çok fazla arama denemesi." }, { status: 429 });
  }

  const q = new URL(req.url).searchParams.get("q")?.trim().toLowerCase() || "";
  if (q.length < 2) return NextResponse.json({ items: [] });

  const users = (await prisma.user.findMany()) as Array<{ id: string; name: string; username?: string | null }>;
  const items = users
    .filter((u) => u.id !== session.user.id)
    .filter((u) => {
      const name = (u.name || "").toLowerCase();
      const username = (u.username || "").toLowerCase();
      return name.includes(q) || username.includes(q);
    })
    .slice(0, 8)
    .map((u) => ({ id: u.id, name: u.name, username: u.username || null }));

  return NextResponse.json({ items });
}

