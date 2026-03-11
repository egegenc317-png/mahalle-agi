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
  const adminNote = form.adminNote?.toString().trim() || null;

  await prisma.listing.update({
    where: { id: params.id },
    data: { status: "CLOSED", adminNote }
  });
  await writeAuditLog({
    actorUserId: session.user.id,
    action: "ADMIN_TAKEDOWN_LISTING",
    targetType: "LISTING",
    targetId: params.id,
    meta: { adminNote }
  });

  return NextResponse.redirect(new URL("/admin/listings", req.url));
}

