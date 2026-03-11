// @ts-nocheck
import { NextRequest, NextResponse } from "next/server";

import { checkRateLimit } from "@/lib/ratelimit";
import { prisma } from "@/lib/prisma";
import { generateVerificationCode, saveVerificationCode } from "@/lib/email-verification";
import { sendVerificationEmail } from "@/lib/mailer";

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for") || "local";
  if (!(await checkRateLimit(`email-code:${ip}`)).ok) {
    return NextResponse.json({ error: "Çok fazla istek." }, { status: 429 });
  }

  const { email } = (await req.json()) as { email?: string };
  const normalizedEmail = String(email || "").trim().toLowerCase();
  if (!normalizedEmail) {
    return NextResponse.json({ error: "E-posta adresi gerekli." }, { status: 400 });
  }
  if (!/^[^\s@]+@gmail\.com$/i.test(normalizedEmail)) {
    return NextResponse.json({ error: "Lütfen geçerli bir Gmail adresi gir." }, { status: 400 });
  }

  const emailExists = await prisma.user.findUnique({ where: { email: normalizedEmail } });
  if (emailExists) {
    return NextResponse.json({ error: "Bu e-posta zaten kullanılıyor." }, { status: 409 });
  }

  const code = generateVerificationCode();
  const expiresAt = await saveVerificationCode(normalizedEmail, code, 4);

  try {
    await sendVerificationEmail(normalizedEmail, code);
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Doğrulama e-postası gönderilemedi."
      },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, expiresAt });
}

