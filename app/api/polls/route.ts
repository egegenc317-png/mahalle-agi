// @ts-nocheck
import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { canUserCreatePollByMukhtarRule } from "@/lib/mukhtar";
import { prisma } from "@/lib/prisma";
import { pollCreateSchema } from "@/lib/validations";

function resolveReturnTo(value: string | null | undefined) {
  if (!value) return "/polls";
  if (!value.startsWith("/") || value.startsWith("//")) return "/polls";
  return value;
}

type PollPayload = {
  question?: unknown;
  options?: unknown;
  option1?: unknown;
  option2?: unknown;
  option3?: unknown;
  option4?: unknown;
  option5?: unknown;
  returnTo?: unknown;
};

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Yetkişiz" }, { status: 401 });
  if (!session.user.locationScope) return NextResponse.json({ error: "Kapsam seçimi gerekli" }, { status: 400 });
  if (!session.user.neighborhoodId) return NextResponse.json({ error: "Mahalle seçimi gerekli" }, { status: 400 });

  const items = await prisma.poll.findMany({
    where: { neighborhoodId: session.user.neighborhoodId },
    include: { user: { select: { id: true, name: true } }, votes: true },
    orderBy: { createdAt: "desc" }
  });

  return NextResponse.json({ items });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Yetkişiz" }, { status: 401 });
  if (!session.user.locationScope) return NextResponse.json({ error: "Kapsam seçimi gerekli" }, { status: 400 });
  if (!session.user.neighborhoodId) return NextResponse.json({ error: "Mahalle seçimi gerekli" }, { status: 400 });

  const contentType = req.headers.get("content-type") || "";
  const returnTo = resolveReturnTo(req.nextUrl.searchParams.get("returnTo"));

  const permission = await canUserCreatePollByMukhtarRule({
    userId: session.user.id,
    role: session.user.role,
    neighborhoodId: session.user.neighborhoodId
  });

  if (!permission.ok) {
    const mukhtar = permission.mukhtar
      ? `Bu haftanın mahalle muhtarı: ${permission.mukhtar.name}`
      : "Bu hafta Henüz mahalle muhtarı belirlenmedi.";
    const message = `${permission.reason} ${mukhtar}`;
    if (contentType.includes("application/x-www-form-urlencoded")) {
      return NextResponse.redirect(new URL(`${returnTo}?error=${encodeURIComponent(message)}`, req.url));
    }
    return NextResponse.json({ error: message }, { status: 403 });
  }

  const payload = (contentType.includes("application/x-www-form-urlencoded")
    ? Object.fromEntries((await req.formData()).entries())
    : await req.json()) as PollPayload;

  const options = Array.isArray(payload.options)
    ? payload.options.filter((value): value is string => typeof value === "string" && value.trim().length > 0)
    : [payload.option1, payload.option2, payload.option3, payload.option4, payload.option5].filter(
        (value): value is string => typeof value === "string" && value.trim().length > 0
      );

  const parsed = pollCreateSchema.safeParse({
    question: typeof payload.question === "string" ? payload.question : "",
    options
  });
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  await prisma.poll.create({
    data: {
      neighborhoodId: session.user.neighborhoodId,
      userId: session.user.id,
      question: parsed.data.question,
      options: parsed.data.options
    }
  });

  if (contentType.includes("application/x-www-form-urlencoded")) {
    const payloadReturnTo = typeof payload.returnTo === "string" ? payload.returnTo : undefined;
    const redirectTo = resolveReturnTo(payloadReturnTo || returnTo);
    return NextResponse.redirect(new URL(redirectTo, req.url));
  }

  return NextResponse.json({ ok: true }, { status: 201 });
}



