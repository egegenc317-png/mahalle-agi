// @ts-nocheck
import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { resolveScopeNeighborhoodIds } from "@/lib/location-scope";
import { prisma } from "@/lib/prisma";
import { pollVoteSchema } from "@/lib/validations";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Yetkişiz" }, { status: 401 });

  const contentType = req.headers.get("content-type") || "";
  const payload = contentType.includes("application/x-www-form-urlencoded")
    ? Object.fromEntries((await req.formData()).entries())
    : await req.json();

  const parsed = pollVoteSchema.safeParse(payload);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const poll = await prisma.poll.findUnique({ where: { id: params.id } });
  if (!poll) return NextResponse.json({ error: "Anket bulunamadı" }, { status: 404 });

  const scopeContext = await resolveScopeNeighborhoodIds(
    session.user.neighborhoodId,
    session.user.locationScope
  );

  if (!session.user.neighborhoodId || !scopeContext.ids.includes(poll.neighborhoodId)) {
    return NextResponse.json({ error: "Bu ankete oy veremezsiniz" }, { status: 403 });
  }

  if (parsed.data.optionIndex < 0 || parsed.data.optionIndex >= poll.options.length) {
    return NextResponse.json({ error: "Geçersiz seçenek" }, { status: 400 });
  }

  await prisma.pollVote.deleteMany({
    where: { pollId: poll.id, userId: session.user.id }
  });

  await prisma.pollVote.create({
    data: {
      pollId: poll.id,
      userId: session.user.id,
      optionIndex: parsed.data.optionIndex
    }
  });

  if (contentType.includes("application/x-www-form-urlencoded")) {
    return NextResponse.redirect(new URL("/polls", req.url));
  }

  return NextResponse.json({ ok: true });
}


