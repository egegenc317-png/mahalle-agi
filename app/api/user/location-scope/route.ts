// @ts-nocheck
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  scope: z.enum(["NEIGHBORHOOD", "DISTRICT"])
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Yetkişiz" }, { status: 401 });

  const contentType = req.headers.get("content-type") || "";
  const payload = contentType.includes("application/x-www-form-urlencoded")
    ? Object.fromEntries((await req.formData()).entries())
    : await req.json();

  const parsed = schema.safeParse(payload);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const user = await prisma.user.update({
    where: { id: session.user.id },
    data: { locationScope: parsed.data.scope }
  });

  const redirectTo = !user.neighborhoodId
    ? "/onboarding/neighborhood"
    : parsed.data.scope === "DISTRICT"
      ? "/map"
      : "/home";

  if (contentType.includes("application/x-www-form-urlencoded")) {
    return NextResponse.redirect(new URL(redirectTo, req.url));
  }

  return NextResponse.json({ ok: true, redirectTo });
}


