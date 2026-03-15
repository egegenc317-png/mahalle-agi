/* eslint-disable @typescript-eslint/no-explicit-any */
// @ts-nocheck
import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { getShellSummaryForUser } from "@/lib/shell-summary";

export async function GET() {
  const session = await auth();

  if (!session?.user.id) {
    return NextResponse.json({ unreadCount: 0 });
  }

  const result = await getShellSummaryForUser(session.user.id);
  return NextResponse.json(result);
}
