// @ts-nocheck
import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit-log";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session || (session.user.role !== "ADMIN" && session.user.role !== "MODERATOR")) {
    return NextResponse.json({ error: "Yetki?iz" }, { status: 403 });
  }

  const form = Object.fromEntries((await req.formData()).entries());
  const requestedDays = Number(form.days || 7);
  const days = Number.isFinite(requestedDays) ? Math.max(1, Math.min(365, Math.round(requestedDays))) : 7;
  const suspendedUntil = new Date(Date.now() + days * 24 * 60 * 60 * 1000);

  await prisma.user.update({ where: { id: params.id }, data: { suspendedUntil } });
  await writeAuditLog({
    actorUserId: session.user.id,
    action: "ADMIN_SUSPEND_USER",
    targetType: "USER",
    targetId: params.id,
    meta: { days, suspendedUntil: suspendedUntil.toISOString() }
  });

  return NextResponse.redirect(new URL("/admin/users", req.url));
}

