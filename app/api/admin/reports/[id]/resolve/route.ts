// @ts-nocheck
import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit-log";
import { prisma } from "@/lib/prisma";

const ALLOWED_STATUSES = new Set(["OPEN", "RESOLVED", "REJECTED"]);

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session || (session.user.role !== "ADMIN" && session.user.role !== "MODERATOR")) {
    return NextResponse.json({ error: "Yetki?iz" }, { status: 403 });
  }

  const form = Object.fromEntries((await req.formData()).entries());
  const requestedStatus = form.status?.toString() || "RESOLVED";
  const status = ALLOWED_STATUSES.has(requestedStatus) ? (requestedStatus as "OPEN" | "RESOLVED" | "REJECTED") : "RESOLVED";

  await prisma.report.update({ where: { id: params.id }, data: { status } });
  await writeAuditLog({
    actorUserId: session.user.id,
    action: "ADMIN_RESOLVE_REPORT",
    targetType: "REPORT",
    targetId: params.id,
    meta: { status }
  });

  return NextResponse.redirect(new URL("/admin/reports", req.url));
}

