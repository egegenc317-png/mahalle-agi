import { NextRequest, NextResponse } from "next/server";

import { checkRateLimit } from "@/lib/ratelimit";
import { verifyEmailCode } from "@/lib/email-verification";

export async function POST(req: NextRequest) {
  const ip = (req.headers.get("x-forwarded-for") || "local").split(",")[0].trim();
  if (!(await checkRateLimit(`email-verify:${ip}`, { windowMs: 60_000, maxAttempts: 20 })).ok) {
    return NextResponse.json({ error: "Çok fazla doğrulama denemesi." }, { status: 429 });
  }

  const { email, code } = (await req.json()) as { email?: string; code?: string };
  const normalizedEmail = String(email || "").trim().toLowerCase();
  const normalizedCode = String(code || "").trim();

  if (!normalizedEmail || !normalizedCode) {
    return NextResponse.json({ error: "E-posta ve kod gerekli." }, { status: 400 });
  }

  const result = await verifyEmailCode(normalizedEmail, normalizedCode);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
