// @ts-nocheck
import { hash } from "bcryptjs";
import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/ratelimit";
import { registerSchema } from "@/lib/validations";
import { consumeVerifiedEmail, isEmailVerified } from "@/lib/email-verification";

function getAge(date: Date) {
  const now = new Date();
  let age = now.getFullYear() - date.getFullYear();
  const monthDiff = now.getMonth() - date.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < date.getDate())) age--;
  return age;
}

function createLocalLoginEmail(username: string) {
  return `${username}.${Date.now()}@mahalle.local`;
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for") || "local";
  if (!(await checkRateLimit(`register:${ip}`)).ok) {
    return NextResponse.json({ error: "Cok fazla istek" }, { status: 429 });
  }

  const json = await req.json();
  const parsed = registerSchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const allUsers = await prisma.user.findMany();
  const username = parsed.data.username.trim().toLowerCase();
  const usernameExists = allUsers.some((u: { username?: string | null }) => (u.username || "").toLowerCase() === username);
  if (usernameExists) return NextResponse.json({ error: "Kullanıcı adı zaten alınmış" }, { status: 409 });

  const normalizedEmail = parsed.data.email?.trim().toLowerCase() || "";
  if (normalizedEmail) {
    const emailExists = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (emailExists) return NextResponse.json({ error: "E-posta zaten kayıtlı" }, { status: 409 });
    if (!(await isEmailVerified(normalizedEmail))) {
      return NextResponse.json({ error: "Kayıttan önce Gmail adresini doğrulamalısın." }, { status: 400 });
    }
  }

  if (parsed.data.accountType === "BUSINESS" && getAge(parsed.data.birthDate) < 17) {
    return NextResponse.json({ error: "İşletme hesabı için en az 17 yaşında olmalısınız." }, { status: 400 });
  }

  const passwordHash = await hash(parsed.data.password, 10);
  const user = await prisma.user.create({
    data: {
      name: parsed.data.name,
      username,
      email: normalizedEmail || createLocalLoginEmail(username),
      emailVerified: normalizedEmail ? new Date() : null,
      passwordHash,
      birthDate: parsed.data.birthDate,
      showAge: parsed.data.showAge,
      accountType: parsed.data.accountType,
      businessCategory: parsed.data.accountType === "BUSINESS" ? (parsed.data.businessCategory || null) : null,
      businessClosedHours:
        parsed.data.accountType === "BUSINESS" ? (parsed.data.businessClosedHours || null) : null,
      shopLogo: parsed.data.accountType === "BUSINESS" ? (parsed.data.shopLogo || null) : null,
      image: parsed.data.accountType === "NEIGHBOR" ? (parsed.data.profileImage || null) : null
    }
  });

  if (normalizedEmail) {
    await consumeVerifiedEmail(normalizedEmail);
  }

  return NextResponse.json({ id: user.id }, { status: 201 });
}



