import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { getLiveNotificationsForUser } from "@/lib/live-notifications";

export async function GET() {
  const session = await auth();
  if (!session?.user.id) {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
  }

  const result = await getLiveNotificationsForUser(session.user.id);
  return NextResponse.json(result.body, { status: result.status });
}
